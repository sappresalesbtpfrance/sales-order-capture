sap.ui.define([
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Element"
], function (Fragment, MessageToast, JSONModel, Element) {
  "use strict";

  var _dialogPromise = null;
  var _oView = null;

  function _findListReportView() {
    var oFound = null;
    Element.registry.forEach(function (oEl) {
      if (!oFound && oEl.isA("sap.ui.core.mvc.View") &&
          oEl.getViewName && oEl.getViewName() &&
          oEl.getViewName().indexOf("sap.fe.templates.ListReport") >= 0) {
        oFound = oEl;
      }
    });
    return oFound;
  }

  return {

    // OData V4 FE calls this as: handler(oBindingContext, aSelectedContexts)
    onOpenUploadDialog: function () {
      if (!_oView) {
        _oView = _findListReportView();
      }
      var oView = _oView;
      if (!oView) {
        MessageToast.show("Impossible d'ouvrir le dialog.");
        return;
      }

      if (!_dialogPromise) {
        _dialogPromise = Fragment.load({
          id:         oView.getId(),
          name:       "salesorders.ext.fragment.UploadDialog",
          controller: this
        }).then(function (oDialog) {
          oView.addDependent(oDialog);
          return oDialog;
        });
      }

      _dialogPromise.then(function (oDialog) {
        var oUploadModel = oView.getModel("upload");
        if (!oUploadModel) {
          oUploadModel = new JSONModel();
          oView.setModel(oUploadModel, "upload");
        }
        oUploadModel.setData({
          files:          [],
          schemas:        [{ id: "", name: "Standard (commande client)" }],
          schemasLoading: true,
          schemaMode:     "global",
          globalSchemaId: "",
          submitting:     false
        });

        var oFileUploader = Fragment.byId(oView.getId(), "fileUploader");
        if (oFileUploader) oFileUploader.clear();
        var oStrip = Fragment.byId(oView.getId(), "fileCountStrip");
        if (oStrip) oStrip.setVisible(false);

        oDialog.open();

        var oODataModel = oView.getModel();
        var oBinding = oODataModel.bindContext("/getDocumentAISchemas(...)");
        oBinding.execute().then(function () {
          var schemas = oBinding.getBoundContext().getObject()?.value || [];
          oUploadModel.setProperty("/schemas", [
            { id: "", name: "Standard (commande client)" },
            ...schemas
          ]);
          oUploadModel.setProperty("/schemasLoading", false);
        }).catch(function () {
          oUploadModel.setProperty("/schemasLoading", false);
        });
      });
    },

    onFileSelectionChange: function (oEvent) {
      if (!_oView) return;
      var oFiles = oEvent.getParameter("files") || [];
      var aFiles = Array.from(oFiles).map(function (f) {
        return { name: f.name, schemaId: "", _file: f };
      });
      var oUpload = _oView.getModel("upload");
      if (!oUpload) return;
      oUpload.setProperty("/files", aFiles);

      var oStrip = Fragment.byId(_oView.getId(), "fileCountStrip");
      if (oStrip) {
        var n = aFiles.length;
        oStrip.setText(n === 1 ? "1 fichier sélectionné" : n + " fichiers sélectionnés");
        oStrip.setVisible(n > 0);
      }
    },

    onFileTypeMismatch: function () {
      MessageToast.show("Type de fichier non autorisé. Formats acceptés : PDF, JPG, PNG, TIFF.");
    },

    onSchemaModeChange: function () {},

    onSubmitUpload: function () {
      if (!_oView) return;
      var oUpload = _oView.getModel("upload");
      var aFiles  = oUpload.getProperty("/files");
      if (!aFiles || aFiles.length === 0) return;

      var schemaMode     = oUpload.getProperty("/schemaMode");
      var globalSchemaId = oUpload.getProperty("/globalSchemaId");

      oUpload.setProperty("/submitting", true);

      var oDialog = Fragment.byId(_oView.getId(), "uploadDialog");
      if (oDialog) oDialog.close();

      var n = aFiles.length;
      MessageToast.show(n === 1 ? "1 document soumis pour traitement" : n + " documents soumis pour traitement");

      var oView = _oView;
      var oODataModel = oView.getModel();
      var sServiceUrl = new URL(oODataModel.getServiceUrl(), document.baseURI).href.replace(/\/$/, "");
      var uploadOne = function (fileEntry) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function (e) {
            var base64   = e.target.result.split(",")[1];
            var schemaId = schemaMode === "global" ? globalSchemaId : (fileEntry.schemaId || "");
            fetch(sServiceUrl + "/uploadFiles", {
              method:  "POST",
              headers: { "Content-Type": "application/json" },
              body:    JSON.stringify({
                files: [{
                  fileName: fileEntry.name,
                  content:  base64,
                  mimeType: fileEntry._file.type || "application/pdf",
                  schemaId: schemaId || null
                }]
              })
            })
            .then(function (r) { return r.json(); })
            .then(function (result) {
              if (result.error) console.error("[upload] failed for", fileEntry.name, result.error.message);
              resolve();
            })
            .catch(function (err) {
              console.error("[upload] network error for", fileEntry.name, err.message);
              resolve();
            });
          };
          reader.readAsDataURL(fileEntry._file);
        });
      };

      Promise.all(aFiles.map(uploadOne)).then(function () {
        oUpload.setProperty("/submitting", false);
        oView.getModel().refresh(true);
      });
    },

    onCancelUpload: function () {
      if (!_oView) return;
      var oDialog = Fragment.byId(_oView.getId(), "uploadDialog");
      if (oDialog) oDialog.close();
    }
  };
});

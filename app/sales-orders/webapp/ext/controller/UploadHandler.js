sap.ui.define([
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/ui/model/json/JSONModel"
], function (Fragment, MessageToast, JSONModel) {
  "use strict";

  var _dialogPromise = null;

  function _getView(oEvent) {
    var oSource = oEvent.getSource();
    var oView = null;
    var oParent = oSource;
    while (oParent) {
      if (oParent.isA && oParent.isA("sap.ui.core.mvc.View")) {
        oView = oParent;
        break;
      }
      oParent = oParent.getParent ? oParent.getParent() : null;
    }
    return oView;
  }

  return {

    onOpenUploadDialog: function (oEvent) {
      var oView = _getView(oEvent);
      if (!oView) return;

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

        // Load schemas from Document AI
        var oModel = oView.getModel();
        var oBinding = oModel.bindContext("/getDocumentAISchemas(...)");
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
      var oFiles = oEvent.getParameter("files") || [];
      var aFiles = Array.from(oFiles).map(function (f) {
        return { name: f.name, schemaId: "", _file: f };
      });
      var oView = _getView(oEvent) || oEvent.getSource().getParent();
      var oUpload = oView && oView.getModel("upload");
      if (!oUpload) return;
      oUpload.setProperty("/files", aFiles);

      var oStrip = Fragment.byId(oView.getId(), "fileCountStrip");
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

    onSubmitUpload: function (oEvent) {
      var oView = _getView(oEvent) || oEvent.getSource().getParent();
      if (!oView) return;
      var oUpload = oView.getModel("upload");
      var aFiles  = oUpload.getProperty("/files");
      if (!aFiles || aFiles.length === 0) return;

      var schemaMode     = oUpload.getProperty("/schemaMode");
      var globalSchemaId = oUpload.getProperty("/globalSchemaId");

      oUpload.setProperty("/submitting", true);

      var oDialog = Fragment.byId(oView.getId(), "uploadDialog");
      if (oDialog) oDialog.close();

      var n = aFiles.length;
      MessageToast.show(n === 1 ? "1 document soumis pour traitement" : n + " documents soumis pour traitement");

      var uploadOne = function (fileEntry) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onload = function (e) {
            var base64   = e.target.result.split(",")[1];
            var schemaId = schemaMode === "global" ? globalSchemaId : (fileEntry.schemaId || "");
            fetch("/odata/v4/sales-order-capture/uploadFiles", {
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

    onCancelUpload: function (oEvent) {
      var oDialog = oEvent.getSource().getParent();
      if (oDialog) oDialog.close();
    }
  };
});

sap.ui.define([
  "sap/ui/core/mvc/ControllerExtension",
  "sap/ui/model/json/JSONModel",
  "sap/ui/core/Fragment",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function (ControllerExtension, JSONModel, Fragment, MessageToast, MessageBox) {
  "use strict";

  return ControllerExtension.extend("salesorders.ext.controller.ListReportExtension", {
    override: {
      onInit: function () {
        this.base.getView().setModel(new JSONModel({ toProcess: 0, total: 0 }), "kpi");
        this.base.getView().setModel(new JSONModel({
          files:          [],
          schemas:        [{ id: "", name: "Standard (commande client)" }],
          schemasLoading: false,
          schemaMode:     "global",
          globalSchemaId: "",
          submitting:     false
        }), "upload");
      },

      onAfterRendering: function () {
        if (!this._kpiLoaded) {
          this._kpiLoaded = true;
          this._loadKPIs();
        }
      }
    },

    _loadKPIs: function () {
      const oView  = this.base.getView();
      const oModel = oView.getModel();
      const oCtxBinding = oModel.bindContext("/getSalesOrderKPIs(...)");
      oCtxBinding.execute().then(() => {
        const oData = oCtxBinding.getBoundContext().getObject();
        oView.getModel("kpi").setData({ toProcess: oData.toProcess, total: oData.total });
      }).catch(() => {});
    },

    onOpenUploadDialog: function () {
      const oView = this.base.getView();

      if (!this._uploadDialogPromise) {
        this._uploadDialogPromise = Fragment.load({
          id:         oView.getId(),
          name:       "salesorders.ext.fragment.UploadDialog",
          controller: this
        }).then(function (oDialog) {
          oView.addDependent(oDialog);
          return oDialog;
        });
      }

      this._uploadDialogPromise.then((oDialog) => {
        const oUploadModel = oView.getModel("upload");
        oUploadModel.setData({
          files:          [],
          schemas:        [{ id: "", name: "Standard (commande client)" }],
          schemasLoading: true,
          schemaMode:     "global",
          globalSchemaId: "",
          submitting:     false
        });

        const oFileUploader = Fragment.byId(oView.getId(), "fileUploader");
        if (oFileUploader) oFileUploader.clear();
        const oStrip = Fragment.byId(oView.getId(), "fileCountStrip");
        if (oStrip) oStrip.setVisible(false);

        oDialog.open();
        this._loadSchemas();
      });
    },

    _loadSchemas: function () {
      const oModel   = this.base.getView().getModel();
      const oUpload  = this.base.getView().getModel("upload");
      const oBinding = oModel.bindContext("/getDocumentAISchemas(...)");

      oBinding.execute().then(() => {
        const schemas = oBinding.getBoundContext().getObject()?.value || [];
        oUpload.setProperty("/schemas", [
          { id: "", name: "Standard (commande client)" },
          ...schemas
        ]);
        oUpload.setProperty("/schemasLoading", false);
      }).catch(() => {
        oUpload.setProperty("/schemasLoading", false);
      });
    },

    onFileSelectionChange: function (oEvent) {
      const oFiles = oEvent.getParameter("files") || [];
      const aFiles = Array.from(oFiles).map(f => ({ name: f.name, schemaId: "", _file: f }));
      const oUpload = this.base.getView().getModel("upload");
      oUpload.setProperty("/files", aFiles);

      const oStrip = Fragment.byId(this.base.getView().getId(), "fileCountStrip");
      if (oStrip) {
        const n = aFiles.length;
        oStrip.setText(n === 1 ? "1 fichier sélectionné" : `${n} fichiers sélectionnés`);
        oStrip.setVisible(n > 0);
      }
    },

    onFileTypeMismatch: function () {
      MessageToast.show("Type de fichier non autorisé. Formats acceptés : PDF, JPG, PNG, TIFF.");
    },

    onSchemaModeChange: function () {
    },

    onSubmitUpload: function () {
      const oView   = this.base.getView();
      const oUpload = oView.getModel("upload");
      const aFiles  = oUpload.getProperty("/files");

      if (!aFiles || aFiles.length === 0) return;

      const schemaMode     = oUpload.getProperty("/schemaMode");
      const globalSchemaId = oUpload.getProperty("/globalSchemaId");

      oUpload.setProperty("/submitting", true);

      const oDialog = Fragment.byId(oView.getId(), "uploadDialog");
      if (oDialog) oDialog.close();

      const n = aFiles.length;
      MessageToast.show(n === 1 ? "1 document soumis pour traitement" : `${n} documents soumis pour traitement`);

      const oODataModel = oView.getModel();
      const sServiceUrl = new URL(oODataModel.getServiceUrl(), document.baseURI).href.replace(/\/$/, "");
      const uploadOne = (fileEntry) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64   = e.target.result.split(",")[1];
          const schemaId = schemaMode === "global" ? globalSchemaId : (fileEntry.schemaId || "");
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
          .then(r => r.json())
          .then(result => {
            if (result.error) console.error("[upload] failed for", fileEntry.name, result.error.message);
            resolve();
          })
          .catch(err => {
            console.error("[upload] network error for", fileEntry.name, err.message);
            resolve();
          });
        };
        reader.readAsDataURL(fileEntry._file);
      });

      Promise.all(aFiles.map(uploadOne)).then(() => {
        oUpload.setProperty("/submitting", false);
        oView.getModel().refresh(true);
        this._loadKPIs();
      });
    },

    onCancelUpload: function () {
      const oDialog = Fragment.byId(this.base.getView().getId(), "uploadDialog");
      if (oDialog) oDialog.close();
    }
  });
});

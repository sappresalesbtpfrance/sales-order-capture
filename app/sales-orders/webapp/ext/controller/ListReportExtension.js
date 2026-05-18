sap.ui.define(["sap/ui/core/mvc/ControllerExtension", "sap/ui/model/json/JSONModel"], function (ControllerExtension, JSONModel) {
  "use strict";

  return ControllerExtension.extend("salesorders.ext.controller.ListReportExtension", {
    override: {
      onInit: function () {
        this.base.getView().setModel(new JSONModel({ toProcess: 0, total: 0 }), "kpi");
        const oModel = this.base.getView().getModel();
        oModel.metadataLoaded().then(this._loadKPIs.bind(this));
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
    }
  });
});

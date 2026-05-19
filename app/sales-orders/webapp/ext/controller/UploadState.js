/**
 * Shared state between ListReportExtension (ControllerExtension) and UploadHandler (plain module).
 * ListReportExtension stores the view ref here during onInit; UploadHandler reads it.
 */
sap.ui.define([], function () {
  "use strict";
  return {
    oView: null
  };
});

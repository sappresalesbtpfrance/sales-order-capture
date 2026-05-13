using { soc } from '../db/schema';
using { API_SALES_ORDER_SRV } from './external/API_SALES_ORDER_SRV';

service SalesOrderCaptureService @(path: '/odata/v4/sales-order-capture') {

  @odata.draft.enabled
  entity SalesOrderRequests as projection on soc.SalesOrderRequests
    actions {
      action simulateCreation() returns SalesOrderRequests;
      action createSalesOrder() returns SalesOrderRequests;
      action retryExtraction() returns SalesOrderRequests;
    };

  entity SalesOrderRequestItems as projection on soc.SalesOrderRequestItems;

  // Unbound action for multi-file upload
  action uploadFiles(files: many {
    fileName : String(255);
    content  : LargeBinary @Core.MediaType: 'application/octet-stream';
    mimeType : String(100);
  }) returns many SalesOrderRequests;
}

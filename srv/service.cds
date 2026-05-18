using { soc } from '../db/schema';
using { API_SALES_ORDER_SRV } from './external/API_SALES_ORDER_SRV';
using { API_SALESORGANIZATION_SRV } from './external/API_SALESORGANIZATION_SRV';
using { API_DISTRIBUTIONCHANNEL_SRV } from './external/API_DISTRIBUTIONCHANNEL_SRV';

service SalesOrderCaptureService @(path: '/odata/v4/sales-order-capture') {

  @odata.draft.enabled
  entity SalesOrderRequests as projection on soc.SalesOrderRequests
    actions {
      action simulateCreation() returns SalesOrderRequests;
      action createSalesOrder() returns SalesOrderRequests;
      action retryExtraction() returns SalesOrderRequests;
    };

  entity SalesOrderRequestItems as projection on soc.SalesOrderRequestItems;

  // ── Value help entities (read-only, from S/4) ─────────────────────────────
  @readonly entity VH_SalesOrganization as projection on API_SALESORGANIZATION_SRV.A_SalesOrganizationText {
    key SalesOrganization,
    SalesOrganizationName,
    Language
  };

  @readonly entity VH_DistributionChannel as projection on API_DISTRIBUTIONCHANNEL_SRV.A_DistributionChannelText {
    key DistributionChannel,
    DistributionChannelName,
    Language
  };

  // KPI function for dynamic tile and KPI tag
  type DynamicTileInfo {
    number      : Integer;
    numberUnit  : String;
    numberState : String;
    infoState   : String;
    info        : String;
    icon        : String;
    toProcess   : Integer;
    total       : Integer;
  };

  function getSalesOrderKPIs() returns DynamicTileInfo;

  // Unbound action for multi-file upload
  action uploadFiles(files: many {
    fileName : String(255);
    content  : LargeBinary @Core.MediaType: 'application/octet-stream';
    mimeType : String(100);
  }) returns many SalesOrderRequests;
}

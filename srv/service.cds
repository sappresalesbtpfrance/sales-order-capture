using { soc } from '../db/schema';
using { API_SALES_ORDER_SRV } from './external/API_SALES_ORDER_SRV';
using { API_SALESORGANIZATION_SRV } from './external/API_SALESORGANIZATION_SRV';
using { API_DISTRIBUTIONCHANNEL_SRV } from './external/API_DISTRIBUTIONCHANNEL_SRV';
using { API_BUSINESS_PARTNER } from './external/API_BUSINESS_PARTNER';
using { API_DIVISION_SRV } from './external/API_DIVISION_SRV';
using { API_COMPANYCODE_SRV } from './external/API_COMPANYCODE_SRV';
using { API_PLANT_SRV } from './external/API_PLANT_SRV';
using { API_COUNTRY_SRV } from './external/API_COUNTRY_SRV';

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

  @readonly entity VH_Customer as projection on API_BUSINESS_PARTNER.A_Customer {
    key Customer,
    CustomerName
  };

  @readonly entity VH_Division as projection on API_DIVISION_SRV.A_DivisionText {
    key Division,
    DivisionName,
    Language
  };

  @readonly entity VH_CompanyCode as projection on API_COMPANYCODE_SRV.A_CompanyCode {
    key CompanyCode,
    CompanyCodeName
  };

  @readonly entity VH_Plant as projection on API_PLANT_SRV.A_Plant {
    key Plant,
    PlantName
  };

  @readonly entity VH_Country as projection on API_COUNTRY_SRV.A_CountryText {
    key Country,
    CountryName,
    Language
  };

  @readonly entity Currencies {
    key code      : String(3);
    name          : String(42);
    symbol        : String(5);
    minorUnit     : Integer;
  };

  // ── Value help entities (in-memory, from service logic) ───────────────────
  @readonly entity VH_ProcessingStatus {
    key code : String(20);
    name     : String(50);
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

  // Document AI schemas (fetched dynamically from Document AI service)
  type DocumentAISchema {
    id           : String(255);
    name         : String(255);
    documentType : String(100);
  };
  function getDocumentAISchemas() returns many DocumentAISchema;

  // Unbound action for multi-file upload
  action uploadFiles(files: many {
    fileName : String(255);
    content  : LargeBinary @Core.MediaType: 'application/octet-stream';
    mimeType : String(100);
    schemaId : String(255);
  }) returns many SalesOrderRequests;
}

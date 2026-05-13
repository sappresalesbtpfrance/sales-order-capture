namespace soc;

using { cuid, managed, sap.common.CodeList } from '@sap/cds/common';
using { Attachments } from '@cap-js/attachments';

// ── Processing Status ─────────────────────────────────────────────────────────
type ProcessingStatus : String(20) enum {
  New            = 'NEW';
  InProcess      = 'IN_PROCESS';
  DataComplete   = 'DATA_COMPLETE';
  DataIncomplete = 'DATA_INCOMPLETE';
  Completed      = 'COMPLETED';
  Error          = 'ERROR';
}

// ── Simulation Status ─────────────────────────────────────────────────────────
type SimulationStatus : String(20) enum {
  NotSimulated = 'NOT_SIMULATED';
  Successful   = 'SUCCESSFUL';
  Failed       = 'FAILED';
}

// ── Sales Order Request (header) ──────────────────────────────────────────────
entity SalesOrderRequests : cuid, managed {
  // Processing metadata
  requestNumber       : String(20);
  processingStatus    : ProcessingStatus default 'NEW';
  simulationStatus    : SimulationStatus default 'NOT_SIMULATED';
  virtual processingStatusCriticality : Integer;

  // Source file
  fileName            : String(255);
  attachments         : Composition of many Attachments;

  // Created Sales Order (once confirmed)
  salesOrder          : String(10);

  // Header — Basic Sales Data
  salesOrganization   : String(4);
  distributionChannel : String(2);
  division            : String(2);
  salesOrderType      : String(4);
  companyCode         : String(4);

  // Header — Sold-to Party
  soldToParty         : String(10);
  soldToPartyName     : String(80);
  soldToStreet        : String(60);
  soldToHouseNumber   : String(10);
  soldToPostalCode    : String(10);
  soldToCity          : String(40);
  soldToCountry       : String(3);

  // Header — Ship-to Party
  shipToParty         : String(10);
  shipToPartyName     : String(80);
  shipToStreet        : String(60);
  shipToHouseNumber   : String(10);
  shipToPostalCode    : String(10);
  shipToCity          : String(40);
  shipToCountry       : String(3);

  // Header — Extracted Purchasing Data
  purchaseOrderByCustomer     : String(35);
  purchaseOrderByCustomerDate : Date;
  requestedDeliveryDate       : Date;
  transactionCurrency         : String(5);

  // Net values
  extractedNetAmount  : Decimal(15,2);
  simulatedNetAmount  : Decimal(15,2);

  // Extraction log
  extractionLog       : LargeString;
  lastSimulatedAt     : Timestamp;

  // Items
  items               : Composition of many SalesOrderRequestItems on items.request = $self;
}

// ── Sales Order Request Items ─────────────────────────────────────────────────
entity SalesOrderRequestItems : cuid {
  request             : Association to SalesOrderRequests;
  itemNumber          : String(6);
  material            : String(40);
  materialDescription : String(40);
  requestedQuantity   : Decimal(13,3);
  requestedQuantityUnit : String(3);
  netAmount           : Decimal(15,2);
  plant               : String(4);
  storageLocation     : String(4);
}

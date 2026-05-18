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
  requestNumber       : String(20)  @title: 'Sales Order Request';
  processingStatus    : ProcessingStatus default 'NEW'  @title: 'Processing Status';
  simulationStatus    : SimulationStatus default 'NOT_SIMULATED'  @title: 'Order Simulation';
  virtual processingStatusCriticality : Integer;
  virtual workflowStep                : Integer; // 1=uploaded 2=extracted 3=simulated 4=completed
  virtual salesOrderUrl               : String;

  fileName            : String(255) @title: 'File Name';
  attachments         : Composition of many Attachments;

  salesOrder          : String(10)  @title: 'Sales Order';

  salesOrganization   : String(4)   @title: 'Sales Organization';
  distributionChannel : String(2)   @title: 'Distribution Channel';
  division            : String(2)   @title: 'Division';
  salesOrderType      : String(4)   @title: 'Sales Order Type';
  companyCode         : String(4)   @title: 'Company Code';

  soldToParty         : String(10)  @title: 'Sold-to Party';
  soldToPartyName     : String(80)  @title: 'Name';
  soldToStreet        : String(60)  @title: 'Street';
  soldToHouseNumber   : String(10)  @title: 'House Number';
  soldToPostalCode    : String(10)  @title: 'Postal Code';
  soldToCity          : String(40)  @title: 'City';
  soldToCountry       : String(3)   @title: 'Country';

  shipToParty         : String(10)  @title: 'Ship-to Party';
  shipToPartyName     : String(80)  @title: 'Name';
  shipToStreet        : String(60)  @title: 'Street';
  shipToHouseNumber   : String(10)  @title: 'House Number';
  shipToPostalCode    : String(10)  @title: 'Postal Code';
  shipToCity          : String(40)  @title: 'City';
  shipToCountry       : String(3)   @title: 'Country';

  purchaseOrderByCustomer     : String(35) @title: 'Purchase Order Number';
  purchaseOrderByCustomerDate : Date       @title: 'Purchase Order Date';
  requestedDeliveryDate       : Date       @title: 'Requested Delivery Date';
  transactionCurrency         : String(5)  @title: 'Document Currency';

  extractedNetAmount  : Decimal(15,2) @title: 'Extracted Net Value';
  simulatedNetAmount  : Decimal(15,2) @title: 'Simulated Net Value';

  extractionLog       : LargeString   @title: 'Extraction Log';
  docAiSchemaId       : String(255)   @title: 'Document AI Schema';
  lastSimulatedAt     : Timestamp     @title: 'Last Simulated On';

  items               : Composition of many SalesOrderRequestItems on items.request = $self;
}

// ── Sales Order Request Items ─────────────────────────────────────────────────
entity SalesOrderRequestItems : cuid {
  request               : Association to SalesOrderRequests;
  itemNumber            : String(6)     @title: 'Item';
  material              : String(40)    @title: 'Material';
  materialDescription   : String(40)    @title: 'Description';
  requestedQuantity     : Decimal(13,3) @title: 'Quantity';
  requestedQuantityUnit : String(3)     @title: 'Unit';
  netAmount             : Decimal(15,2) @title: 'Net Amount';
  plant                 : String(4)     @title: 'Plant';
  storageLocation       : String(4)     @title: 'Storage Location';
}

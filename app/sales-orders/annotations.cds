using SalesOrderCaptureService as service from '../../srv/service';
using from '../../srv/external/API_SALESORGANIZATION_SRV';
using from '../../srv/external/API_DISTRIBUTIONCHANNEL_SRV';
using from '../../srv/external/API_BUSINESS_PARTNER';
using from '../../srv/external/API_DIVISION_SRV';
using from '../../srv/external/API_COMPANYCODE_SRV';
using from '../../srv/external/API_PLANT_SRV';
using from '../../srv/external/API_COUNTRY_SRV';

// Hide native Create button — upload dialog replaces it
annotate service.SalesOrderRequests with @(
  Capabilities.InsertRestrictions: { Insertable: false }
);

// ── Value Help annotations ────────────────────────────────────────────────────
annotate service.SalesOrderRequests with {
  salesOrganization @(
    Common.ValueList: {
      CollectionPath: 'VH_SalesOrganization',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: salesOrganization, ValueListProperty: 'SalesOrganization' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'SalesOrganizationName' },
      ],
      PresentationVariantQualifier: '',
    },
    Common.ValueListWithFixedValues: false
  );

  distributionChannel @(
    Common.ValueList: {
      CollectionPath: 'VH_DistributionChannel',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: distributionChannel, ValueListProperty: 'DistributionChannel' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'DistributionChannelName' },
      ],
    },
    Common.ValueListWithFixedValues: false
  );

  soldToParty @(
    Common.ValueList: {
      CollectionPath: 'VH_Customer',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: soldToParty, ValueListProperty: 'Customer' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'CustomerName' },
      ],
    },
    Common.ValueListWithFixedValues: false
  );

  shipToParty @(
    Common.ValueList: {
      CollectionPath: 'VH_Customer',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: shipToParty, ValueListProperty: 'Customer' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'CustomerName' },
      ],
    },
    Common.ValueListWithFixedValues: false
  );

  division @(
    Common.ValueList: {
      CollectionPath: 'VH_Division',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: division, ValueListProperty: 'Division' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'DivisionName' },
      ],
    },
    Common.ValueListWithFixedValues: false
  );

  companyCode @(
    Common.ValueList: {
      CollectionPath: 'VH_CompanyCode',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: companyCode, ValueListProperty: 'CompanyCode' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'CompanyCodeName' },
      ],
    },
    Common.ValueListWithFixedValues: false
  );

  transactionCurrency @(
    Common.ValueList: {
      CollectionPath: 'Currencies',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: transactionCurrency, ValueListProperty: 'code' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' },
      ],
    },
    Common.ValueListWithFixedValues: false
  );

  soldToCountry @(
    Common.ValueList: {
      CollectionPath: 'VH_Country',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: soldToCountry, ValueListProperty: 'Country' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'CountryName' },
      ],
    },
    Common.ValueListWithFixedValues: false
  );

  shipToCountry @(
    Common.ValueList: {
      CollectionPath: 'VH_Country',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: shipToCountry, ValueListProperty: 'Country' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'CountryName' },
      ],
    },
    Common.ValueListWithFixedValues: false
  );

  processingStatus @(
    Common.ValueList: {
      CollectionPath: 'VH_ProcessingStatus',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: processingStatus, ValueListProperty: 'code' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'name' },
      ],
    },
    Common.ValueListWithFixedValues: true
  );

  salesOrderType @(
    Common.ValueList: {
      CollectionPath: 'VH_SalesOrderType',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: salesOrderType, ValueListProperty: 'code' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'description' },
      ],
    },
    Common.ValueListWithFixedValues: true
  );

  requestNumber @(
    Common.ValueList: {
      CollectionPath: 'SalesOrderRequests',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: requestNumber, ValueListProperty: 'requestNumber' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'fileName' },
      ],
    },
    Common.ValueListWithFixedValues: false
  );

  salesOrder @(
    Common.ValueList: {
      CollectionPath: 'SalesOrderRequests',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: salesOrder, ValueListProperty: 'salesOrder' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'requestNumber' },
      ],
    },
    Common.ValueListWithFixedValues: false
  );

  purchaseOrderByCustomer @(
    Common.ValueList: {
      CollectionPath: 'SalesOrderRequests',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: purchaseOrderByCustomer, ValueListProperty: 'purchaseOrderByCustomer' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'requestNumber' },
      ],
    },
    Common.ValueListWithFixedValues: false
  );
};

// ── List Report ───────────────────────────────────────────────────────────────
annotate service.SalesOrderRequests with @(

    UI.SelectionFields: [
        processingStatus,
        requestNumber,
        createdBy,
        createdAt,
        salesOrder,
        requestedDeliveryDate,
        purchaseOrderByCustomer,
        companyCode,
        salesOrganization,
        distributionChannel,
        division,
    ],

    UI.LineItem: [
        {
            $Type: 'UI.DataField',
            Label: 'Sales Order Request',
            Value: requestNumber,
        },
        {
            $Type: 'UI.DataField',
            Label: 'File Name',
            Value: fileName,
        },
        {
            $Type: 'UI.DataFieldForAction',
            Label: 'Retry Extraction',
            Action: 'SalesOrderCaptureService.retryExtraction',
            Inline: false,
        },
        {
            $Type:       'UI.DataField',
            Label:       'Order Simulation',
            Value:       simulationStatus,
            Criticality: (simulationStatus = 'SUCCESSFUL' ? 3 : simulationStatus = 'FAILED' ? 1 : 0),
        },
        {
            $Type:               'UI.DataFieldWithUrl',
            Label:               'Sales Order',
            Value:               salesOrder,
            Url:                 salesOrderUrl,
            ![@HTML5.LinkTarget]: '_blank',
        },
    ],


    UI.PresentationVariant: {
        SortOrder: [{
            Property: createdAt,
            Descending: true,
        }],
        Visualizations: ['@UI.LineItem'],
    },
);

// ── Object Page ───────────────────────────────────────────────────────────────
annotate service.SalesOrderRequests with @(

    UI.HeaderInfo: {
        TypeName:       'Sales Order Request',
        TypeNamePlural: 'Sales Order Requests',
        Title:          { Value: requestNumber },
        Description:    { Value: fileName },
    },

    UI.HeaderFacets: [
        {
            $Type:  'UI.ReferenceFacet',
            Target: '@UI.FieldGroup#ProcessingInfo',
        },
        {
            $Type:  'UI.ReferenceFacet',
            Target: '@UI.FieldGroup#NetValues',
        },
        {
            $Type:  'UI.ReferenceFacet',
            Target: '@UI.FieldGroup#DocumentAI',
        },
    ],

    UI.FieldGroup#ProcessingInfo: {
        Data: [
            {
                $Type: 'UI.DataField',
                Label: 'Processing Status',
                Value: processingStatus,
                Criticality: processingStatusCriticality,
            },
            {
                $Type:       'UI.DataField',
                Label:       'Order Simulation',
                Value:       simulationStatus,
                Criticality: (simulationStatus = 'SUCCESSFUL' ? 3 : simulationStatus = 'FAILED' ? 1 : 0),
            },
            {
                $Type: 'UI.DataField',
                Label: 'Company Code',
                Value: companyCode,
            },
            {
                $Type:               'UI.DataFieldWithUrl',
                Label:               'Sales Order',
                Value:               salesOrder,
                Url:                 salesOrderUrl,
                ![@HTML5.LinkTarget]: '_blank',
            },
            {
                $Type: 'UI.DataField',
                Label: 'Last Changed By',
                Value: modifiedBy,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Changed On/At',
                Value: modifiedAt,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Created By',
                Value: createdBy,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Created On/At',
                Value: createdAt,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Last Simulated On',
                Value: lastSimulatedAt,
            },
        ],
    },

    UI.FieldGroup#NetValues: {
        Data: [
            {
                $Type: 'UI.DataField',
                Label: 'Extracted Net Value',
                Value: extractedNetAmount,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Simulated Net Value',
                Value: simulatedNetAmount,
            },
        ],
    },

    UI.FieldGroup#DocumentAI: {
        Label: 'Document AI',
        Data: [
            {
                $Type: 'UI.DataField',
                Label: 'Extraction Status',
                Value: processingStatus,
                Criticality: processingStatusCriticality,
            },
            {
                $Type: 'UI.DataField',
                Label: 'AI Confidence (%)',
                Value: docAiConfidence,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Schema',
                Value: docAiSchemaName,
            },
            {
                $Type: 'UI.DataField',
                Label: 'Extraction Log',
                Value: extractionLog,
            },
        ],
    },

    UI.Facets: [
        {
            $Type:  'UI.CollectionFacet',
            ID:     'HeaderData',
            Label:  'Header Data',
            Facets: [
                {
                    $Type:  'UI.ReferenceFacet',
                    ID:     'BasicSalesData',
                    Label:  'Basic Sales Data',
                    Target: '@UI.FieldGroup#BasicSalesData',
                },
                {
                    $Type:  'UI.ReferenceFacet',
                    ID:     'SoldToPartyData',
                    Label:  'Sold-to Party Data',
                    Target: '@UI.FieldGroup#SoldToPartyData',
                },
                {
                    $Type:  'UI.ReferenceFacet',
                    ID:     'ShipToPartyData',
                    Label:  'Ship-to Party Data',
                    Target: '@UI.FieldGroup#ShipToPartyData',
                },
                {
                    $Type:  'UI.ReferenceFacet',
                    ID:     'PurchasingData',
                    Label:  'Extracted Purchasing Data',
                    Target: '@UI.FieldGroup#PurchasingData',
                },
            ],
        },
        {
            $Type:  'UI.CollectionFacet',
            ID:     'ItemData',
            Label:  'Item Data',
            Facets: [
                {
                    $Type:  'UI.ReferenceFacet',
                    ID:     'Items',
                    Label:  'Items',
                    Target: 'items/@UI.LineItem',
                },
            ],
        },
    ],

    UI.FieldGroup#BasicSalesData: {
        Data: [
            { $Type: 'UI.DataField', Label: 'Sales Organization', Value: salesOrganization },
            { $Type: 'UI.DataField', Label: 'Distribution Channel', Value: distributionChannel },
            { $Type: 'UI.DataField', Label: 'Division', Value: division },
            { $Type: 'UI.DataField', Label: 'Sales Order Type', Value: salesOrderType },
        ],
    },

    UI.FieldGroup#SoldToPartyData: {
        Data: [
            { $Type: 'UI.DataField', Label: 'Sold-to Party', Value: soldToParty },
            { $Type: 'UI.DataField', Label: 'Name', Value: soldToPartyName },
            { $Type: 'UI.DataField', Label: 'Street', Value: soldToStreet },
            { $Type: 'UI.DataField', Label: 'House Number', Value: soldToHouseNumber },
            { $Type: 'UI.DataField', Label: 'Postal Code', Value: soldToPostalCode },
            { $Type: 'UI.DataField', Label: 'City', Value: soldToCity },
            { $Type: 'UI.DataField', Label: 'Country', Value: soldToCountry },
        ],
    },

    UI.FieldGroup#ShipToPartyData: {
        Data: [
            { $Type: 'UI.DataField', Label: 'Ship-to Party', Value: shipToParty },
            { $Type: 'UI.DataField', Label: 'Name', Value: shipToPartyName },
            { $Type: 'UI.DataField', Label: 'Street', Value: shipToStreet },
            { $Type: 'UI.DataField', Label: 'House Number', Value: shipToHouseNumber },
            { $Type: 'UI.DataField', Label: 'Postal Code', Value: shipToPostalCode },
            { $Type: 'UI.DataField', Label: 'City', Value: shipToCity },
            { $Type: 'UI.DataField', Label: 'Country', Value: shipToCountry },
        ],
    },

    UI.FieldGroup#PurchasingData: {
        Data: [
            { $Type: 'UI.DataField', Label: 'Purchase Order Number', Value: purchaseOrderByCustomer },
            { $Type: 'UI.DataField', Label: 'Purchase Order Date', Value: purchaseOrderByCustomerDate },
            { $Type: 'UI.DataField', Label: 'Requested Delivery Date', Value: requestedDeliveryDate },
            { $Type: 'UI.DataField', Label: 'Document Currency', Value: transactionCurrency },
        ],
    },

    // Bound actions on Object Page toolbar
    UI.Identification: [
        {
            $Type:  'UI.DataFieldForAction',
            Label:  'Create Sales Order',
            Action: 'SalesOrderCaptureService.createSalesOrder',
        },
        {
            $Type:  'UI.DataFieldForAction',
            Label:  'Simulate Creation',
            Action: 'SalesOrderCaptureService.simulateCreation',
        },
        {
            $Type:  'UI.DataFieldForAction',
            Label:  'Retry Extraction',
            Action: 'SalesOrderCaptureService.retryExtraction',
        },
    ],
);

// ── Items table on Object Page ────────────────────────────────────────────────
annotate service.SalesOrderRequestItems with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Label: 'Item',             Value: itemNumber },
        { $Type: 'UI.DataField', Label: 'Material',          Value: material },
        { $Type: 'UI.DataField', Label: 'Description',       Value: materialDescription },
        { $Type: 'UI.DataField', Label: 'Quantity',          Value: requestedQuantity },
        { $Type: 'UI.DataField', Label: 'Unit',              Value: requestedQuantityUnit },
        { $Type: 'UI.DataField', Label: 'Net Amount',        Value: netAmount },
        { $Type: 'UI.DataField', Label: 'Plant',             Value: plant },
    ],
);

annotate service.SalesOrderRequestItems with {
  plant @(
    Common.ValueList: {
      CollectionPath: 'VH_Plant',
      Parameters: [
        { $Type: 'Common.ValueListParameterOut', LocalDataProperty: plant, ValueListProperty: 'Plant' },
        { $Type: 'Common.ValueListParameterDisplayOnly', ValueListProperty: 'PlantName' },
      ],
    },
    Common.ValueListWithFixedValues: false
  );
};

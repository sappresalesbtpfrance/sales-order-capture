const cds = require('@sap/cds');

const PROCESSING_STATUS = {
  NEW:             'NEW',
  IN_PROCESS:      'IN_PROCESS',
  DATA_COMPLETE:   'DATA_COMPLETE',
  DATA_INCOMPLETE: 'DATA_INCOMPLETE',
  COMPLETED:       'COMPLETED',
  ERROR:           'ERROR',
};

const SIMULATION_STATUS = {
  NOT_SIMULATED: 'NOT_SIMULATED',
  SUCCESSFUL:    'SUCCESSFUL',
  FAILED:        'FAILED',
};

const STATUS_CRITICALITY = {
  [PROCESSING_STATUS.NEW]:             2,
  [PROCESSING_STATUS.IN_PROCESS]:      2,
  [PROCESSING_STATUS.DATA_COMPLETE]:   3,
  [PROCESSING_STATUS.DATA_INCOMPLETE]: 1,
  [PROCESSING_STATUS.COMPLETED]:       3,
  [PROCESSING_STATUS.ERROR]:           1,
};

module.exports = cds.service.impl(async function () {
  const { SalesOrderRequests, SalesOrderRequestItems, VH_SalesOrganization, VH_DistributionChannel } = this.entities;

  // ── Value Help handlers (delegated to S/4, language-aware) ────────────────
  const _readVH = async (entityName, keyField, nameField, req) => {
    const lang = (req.locale || 'en').toUpperCase();
    const s4   = await cds.connect.to(entityName.startsWith('VH_SalesOrg') ? 'API_SALESORGANIZATION_SRV' : 'API_DISTRIBUTIONCHANNEL_SRV');
    const table = entityName.startsWith('VH_SalesOrg') ? 'A_SalesOrganizationText' : 'A_DistributionChannelText';
    let rows = await s4.run(SELECT.from(table).where({ Language: lang }));
    if (!rows.length) rows = await s4.run(SELECT.from(table).where({ Language: 'EN' }));
    return rows.map(r => ({ [keyField]: r[keyField], [nameField]: r[nameField], Language: r.Language }));
  };

  this.on('READ', VH_SalesOrganization,  (req) => _readVH('VH_SalesOrganization',  'SalesOrganization',  'SalesOrganizationName',  req));
  this.on('READ', VH_DistributionChannel, (req) => _readVH('VH_DistributionChannel', 'DistributionChannel', 'DistributionChannelName', req));

  // ── Compute virtual fields ─────────────────────────────────────────────────
  const S4_FLP_BASE = 'https://vhcals4hci.dummy.nodomain:44301/sap/bc/ui5_ui5/ui2/ushell/shells/abap/FioriLaunchpad.html';

  const computeVirtualFields = (results) => {
    for (const req of [results].flat()) {
      req.processingStatusCriticality = STATUS_CRITICALITY[req.processingStatus] ?? 0;

      if (req.salesOrder) {
        req.workflowStep   = 4;
        req.salesOrderUrl  = `${S4_FLP_BASE}#SalesOrder-editSalesOrderV2?SalesOrder=${req.salesOrder}&/SalesOrderManage('${req.salesOrder}')`;
      } else if (req.simulationStatus === SIMULATION_STATUS.SUCCESSFUL) {
        req.workflowStep = 3;
      } else if ([
        PROCESSING_STATUS.DATA_COMPLETE,
        PROCESSING_STATUS.DATA_INCOMPLETE,
      ].includes(req.processingStatus)) {
        req.workflowStep = 2;
      } else {
        req.workflowStep = 1;
      }
    }
  };

  this.after('READ', SalesOrderRequests, computeVirtualFields);
  this.after('READ', SalesOrderRequests.drafts, computeVirtualFields);

  // ── KPI function ───────────────────────────────────────────────────────────
  const KPI_LABELS = {
    fr: { unit: 'à traiter',     info: total => `${total} au total` },
    de: { unit: 'zu bearbeiten', info: total => `${total} insgesamt` },
    en: { unit: 'to process',    info: total => `${total} total` },
  };

  this.on('getSalesOrderKPIs', async (req) => {
    const TO_PROCESS_STATUSES = [
      PROCESSING_STATUS.DATA_COMPLETE,
      PROCESSING_STATUS.DATA_INCOMPLETE,
      PROCESSING_STATUS.IN_PROCESS,
    ];
    const [{ total }]     = await SELECT`count(*) as total`.from(SalesOrderRequests);
    const [{ toProcess }] = await SELECT`count(*) as toProcess`.from(SalesOrderRequests)
      .where({ processingStatus: { in: TO_PROCESS_STATUSES } });

    const n = Number(toProcess);
    const t = KPI_LABELS[req.locale] ?? KPI_LABELS['en'];
    return {
      number:      n,
      numberUnit:  t.unit,
      numberState: n > 0 ? 'Critical' : 'Positive',
      infoState:   n > 0 ? 'Critical' : 'Positive',
      info:        t.info(Number(total)),
      icon:        'sap-icon://sales-order',
      toProcess:   n,
      total:       Number(total),
    };
  });


  this.on('uploadFiles', async (req) => {
    const { files } = req.data;
    if (!files?.length) return req.error(400, 'No files provided');

    const results = [];
    const errors  = [];

    await Promise.all(files.map(async (file) => {
      try {
        const record = await INSERT.into(SalesOrderRequests).entries({
          fileName:        file.fileName,
          processingStatus: PROCESSING_STATUS.IN_PROCESS,
        });
        const ID = record.ID ?? record[0]?.ID;

        _extractAsync(ID, file).catch(async (err) => {
          cds.log('sales-order-capture').error(`Extraction failed for ${file.fileName}:`, err);
          await UPDATE(SalesOrderRequests, ID).with({
            processingStatus: PROCESSING_STATUS.ERROR,
            extractionLog:    err.message,
          });
        });

        results.push(ID);
      } catch (err) {
        errors.push({ fileName: file.fileName, error: err.message });
      }
    }));

    if (errors.length) {
      req.notify(207, `${results.length} file(s) accepted, ${errors.length} failed: ${errors.map(e => e.fileName).join(', ')}`);
    }

    return SELECT.from(SalesOrderRequests).where({ ID: { in: results } });
  });

  // ── Retry extraction ────────────────────────────────────────────────────────
  this.on('retryExtraction', SalesOrderRequests, async (req) => {
    const { ID } = req.params[0];
    const record = await SELECT.one.from(SalesOrderRequests, ID);
    if (!record) return req.error(404, 'Record not found');

    await UPDATE(SalesOrderRequests, ID).with({
      processingStatus: PROCESSING_STATUS.IN_PROCESS,
      extractionLog:    null,
    });

    _extractAsync(ID, { fileName: record.fileName }).catch(async (err) => {
      cds.log('sales-order-capture').error(`Retry extraction failed for ${record.fileName}:`, err);
      await UPDATE(SalesOrderRequests, ID).with({
        processingStatus: PROCESSING_STATUS.ERROR,
        extractionLog:    err.message,
      });
    });

    return SELECT.one.from(SalesOrderRequests, ID);
  });

  // ── Simulate creation ───────────────────────────────────────────────────────
  this.on('simulateCreation', SalesOrderRequests, async (req) => {
    const { ID } = req.params[0];
    const [record, items] = await Promise.all([
      SELECT.one.from(SalesOrderRequests, ID),
      SELECT.from(SalesOrderRequestItems).where({ request_ID: ID }),
    ]);
    if (!record) return req.error(404, 'Record not found');

    try {
      const s4 = await cds.connect.to('API_SALES_ORDER_SRV');
      const payload = _buildS4Payload(record, items);

      // POST with sap-simulate=true header triggers S/4 order simulation without persisting
      const simResult = await s4.send({
        method: 'POST',
        path:   '/A_SalesOrder',
        data:   payload,
        headers: { 'sap-simulate': 'true' },
      });

      await UPDATE(SalesOrderRequests, ID).with({
        simulationStatus:   SIMULATION_STATUS.SUCCESSFUL,
        simulatedNetAmount: simResult?.TotalNetAmount ?? 0,
        lastSimulatedAt:    new Date().toISOString(),
      });
    } catch (err) {
      await UPDATE(SalesOrderRequests, ID).with({
        simulationStatus: SIMULATION_STATUS.FAILED,
        extractionLog:    err.message,
      });
      return req.error(500, `Simulation failed: ${err.message}`);
    }

    return SELECT.one.from(SalesOrderRequests, ID);
  });

  // ── Create Sales Order ──────────────────────────────────────────────────────
  this.on('createSalesOrder', SalesOrderRequests, async (req) => {
    const { ID } = req.params[0];
    const [record, items] = await Promise.all([
      SELECT.one.from(SalesOrderRequests, ID),
      SELECT.from(SalesOrderRequestItems).where({ request_ID: ID }),
    ]);
    if (!record) return req.error(404, 'Record not found');
    if (record.salesOrder) return req.error(409, `Sales Order ${record.salesOrder} already created`);

    try {
      const s4 = await cds.connect.to('API_SALES_ORDER_SRV');
      const payload = _buildS4Payload(record, items);

      const created = await s4.send({
        method: 'POST',
        path:   '/A_SalesOrder',
        data:   payload,
      });

      const salesOrderId = created?.SalesOrder;
      if (!salesOrderId) throw new Error('S/4HANA did not return a SalesOrder ID');

      await UPDATE(SalesOrderRequests, ID).with({
        salesOrder:       salesOrderId,
        processingStatus: PROCESSING_STATUS.COMPLETED,
      });
    } catch (err) {
      await UPDATE(SalesOrderRequests, ID).with({
        processingStatus: PROCESSING_STATUS.ERROR,
        extractionLog:    err.message,
      });
      return req.error(500, `Sales Order creation failed: ${err.message}`);
    }

    return SELECT.one.from(SalesOrderRequests, ID);
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function _buildS4Payload(header, items) {
    return {
      SalesOrderType:          header.salesOrderType      || 'OR',
      SalesOrganization:       header.salesOrganization,
      DistributionChannel:     header.distributionChannel,
      OrganizationDivision:    header.division,
      SoldToParty:             header.soldToParty,
      PurchaseOrderByCustomer: header.purchaseOrderByCustomer,
      RequestedDeliveryDate:   header.requestedDeliveryDate,
      TransactionCurrency:     header.transactionCurrency,
      to_Item: {
        results: items.map((item, idx) => ({
          SalesOrderItem:        String((idx + 1) * 10).padStart(6, '0'),
          Material:              item.material,
          RequestedQuantity:     String(item.requestedQuantity),
          RequestedQuantityUnit: item.requestedQuantityUnit,
          Plant:                 item.plant,
        })),
      },
    };
  }

  async function _extractAsync(requestId, file) {
    // Document AI extraction — implemented once schema/model confirmed in the tenant.
    // Until then, marks the record as DATA_INCOMPLETE for manual entry.
    await UPDATE(SalesOrderRequests, requestId).with({
      processingStatus: PROCESSING_STATUS.DATA_INCOMPLETE,
      extractionLog:    'Document AI extraction not yet configured — please fill in data manually.',
    });
  }
});

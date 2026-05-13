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
  [PROCESSING_STATUS.NEW]:             2,  // grey
  [PROCESSING_STATUS.IN_PROCESS]:      2,  // grey
  [PROCESSING_STATUS.DATA_COMPLETE]:   3,  // green
  [PROCESSING_STATUS.DATA_INCOMPLETE]: 1,  // red
  [PROCESSING_STATUS.COMPLETED]:       3,  // green
  [PROCESSING_STATUS.ERROR]:           1,  // red
};

module.exports = cds.service.impl(async function () {
  const { SalesOrderRequests, SalesOrderRequestItems } = this.entities;

  // ── Compute virtual criticality ─────────────────────────────────────────────
  this.after('READ', SalesOrderRequests, (results) => {
    for (const req of [results].flat()) {
      req.processingStatusCriticality = STATUS_CRITICALITY[req.processingStatus] ?? 0;
    }
  });

  // ── Upload multiple files ───────────────────────────────────────────────────
  this.on('uploadFiles', async (req) => {
    const { files } = req.data;
    if (!files?.length) req.error(400, 'No files provided');

    const results = [];
    const errors  = [];

    await Promise.all(files.map(async (file) => {
      try {
        // 1) Create SalesOrderRequest record
        const { ID } = await INSERT.into(SalesOrderRequests).entries({
          fileName:        file.fileName,
          processingStatus: PROCESSING_STATUS.IN_PROCESS,
        });

        // 2) Trigger Document AI extraction (async — fire and don't await)
        _extractAsync(ID, file).catch((err) => {
          cds.log('sales-order-capture').error(`Extraction failed for ${file.fileName}:`, err);
          UPDATE(SalesOrderRequests, ID).with({ processingStatus: PROCESSING_STATUS.ERROR, extractionLog: err.message });
        });

        results.push({ ID, fileName: file.fileName, processingStatus: PROCESSING_STATUS.IN_PROCESS });
      } catch (err) {
        errors.push({ fileName: file.fileName, error: err.message });
      }
    }));

    if (errors.length) {
      req.notify(207, `${results.length} file(s) accepted, ${errors.length} failed: ${errors.map(e => e.fileName).join(', ')}`);
    }

    return SELECT.from(SalesOrderRequests).where({ ID: { in: results.map(r => r.ID) } });
  });

  // ── Retry extraction ────────────────────────────────────────────────────────
  this.on('retryExtraction', SalesOrderRequests, async (req) => {
    const { ID } = req.params[0];
    const record = await SELECT.one.from(SalesOrderRequests, ID);
    if (!record) return req.error(404, 'Record not found');

    await UPDATE(SalesOrderRequests, ID).with({ processingStatus: PROCESSING_STATUS.IN_PROCESS, extractionLog: null });
    _extractAsync(ID, { fileName: record.fileName }).catch((err) => {
      cds.log('sales-order-capture').error(`Retry extraction failed for ${record.fileName}:`, err);
      UPDATE(SalesOrderRequests, ID).with({ processingStatus: PROCESSING_STATUS.ERROR, extractionLog: err.message });
    });

    return SELECT.one.from(SalesOrderRequests, ID);
  });

  // ── Simulate creation ───────────────────────────────────────────────────────
  this.on('simulateCreation', SalesOrderRequests, async (req) => {
    const { ID } = req.params[0];
    const record = await SELECT.one.from(SalesOrderRequests, ID).columns('*');
    if (!record) return req.error(404, 'Record not found');

    try {
      const s4 = await cds.connect.to('API_SALES_ORDER_SRV');
      const soPayload = _buildS4Payload(record, await _getItems(ID));

      // Simulation via $value check — S/4 returns order data without persisting
      const simResult = await s4.post('/A_SalesOrder', soPayload, { headers: { Prefer: 'return=representation' } });

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
    const record = await SELECT.one.from(SalesOrderRequests, ID).columns('*');
    if (!record) return req.error(404, 'Record not found');
    if (record.salesOrder) return req.error(409, `Sales Order ${record.salesOrder} already created`);

    try {
      const s4   = await cds.connect.to('API_SALES_ORDER_SRV');
      const items = await _getItems(ID);
      const soPayload = _buildS4Payload(record, items);

      const created = await s4.run(INSERT.into('A_SalesOrder').entries(soPayload));
      const salesOrderId = created?.SalesOrder ?? created?.[0]?.SalesOrder;

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

  async function _getItems(requestId) {
    return SELECT.from(SalesOrderRequestItems).where({ request_ID: requestId });
  }

  function _buildS4Payload(header, items) {
    return {
      SalesOrderType:           header.salesOrderType      || 'OR',
      SalesOrganization:        header.salesOrganization,
      DistributionChannel:      header.distributionChannel,
      OrganizationDivision:     header.division,
      SoldToParty:              header.soldToParty,
      PurchaseOrderByCustomer:  header.purchaseOrderByCustomer,
      RequestedDeliveryDate:    header.requestedDeliveryDate,
      TransactionCurrency:      header.transactionCurrency,
      to_Item: items.map((item, idx) => ({
        SalesOrderItem:          String((idx + 1) * 10).padStart(6, '0'),
        Material:                item.material,
        RequestedQuantity:       item.requestedQuantity,
        RequestedQuantityUnit:   item.requestedQuantityUnit,
        Plant:                   item.plant,
      })),
    };
  }

  async function _extractAsync(requestId, file) {
    // Placeholder: Document AI extraction will be implemented once
    // the Document AI schema/model is confirmed in the tenant.
    // For now, marks the record as DATA_INCOMPLETE so the user can edit manually.
    await UPDATE(SalesOrderRequests, requestId).with({
      processingStatus: PROCESSING_STATUS.DATA_INCOMPLETE,
      extractionLog:    'Document AI extraction not yet configured — please fill in data manually.',
    });
  }
});

# Sales Order Capture

Automatic extraction of Sales Orders from PDF/image documents via SAP Document AI, with Fiori Elements UI for review and confirmation.

## Features

- Multi-file upload (PDF, JPEG, PNG)
- Automatic data extraction via SAP Document AI
- Manual review and editing via Fiori Elements UI
- Order simulation against S/4HANA before confirmation
- One-click Sales Order creation in S/4HANA
- Deep-link navigation to S/4HANA Manage Sales Orders app

## Architecture

- **Backend**: SAP CAP Node.js (OData V4)
- **Frontend**: SAP Fiori Elements (List Report + Object Page)
- **Document AI**: SAP Document Information Extraction
- **ERP**: SAP S/4HANA Cloud (API_SALES_ORDER_SRV)
- **Database**: SAP HANA Cloud (HDI container) / SQLite (local dev)

## Local Development

```bash
npm install
npm run dev
```

App available at: http://localhost:4004

## Deployment

```bash
npm run build
mbt build
cf deploy mta_archives/sales-order-capture_1.0.0.mtar
```

## Project Structure

```
sales-order-capture/
├── db/
│   └── schema.cds          # Data model
├── srv/
│   ├── service.cds         # OData V4 service definition
│   ├── service.js          # Business logic handlers
│   └── external/           # S/4HANA API definitions
├── app/
│   └── sales-orders/       # Fiori Elements app
├── mta.yaml                # MTA deployment descriptor
└── xs-security.json        # XSUAA security config
```

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
- **Auth**: IAS (Identity Authentication Service) via Work Zone managed approuter

## Local Development

```bash
npm install
npm run dev
```

App available at: http://localhost:4004

## Deployment

```bash
mbt build
cf deploy mta_archives/sales-order-capture_1.0.10.mtar
```

### BTP Infrastructure

- **Subaccount**: Test Joule - Demo (`test-joule-demo-58bwtnjw`)
- **CF Org**: `Joule Demo - SAP` / Space: `dev`
- **Region**: eu10

### Work Zone + IAS Authentication

This subaccount uses IAS as IdP. Work Zone Standard issues IAS tokens (not XSUAA tokens). The following is required for CAP to accept these tokens:

1. **IAS binding on the srv module** — CAP auto-detects `auth: ias` when the `identity` service is bound
2. **cert route on the srv module** — required for IAS mTLS
3. **`srv-api` destination in `destination-content`** (not `init_data`) with `OAuth2UserTokenExchange`

If redeploying from scratch and a `srv-api` destination already exists in the Destination service instance, delete it first (it has locked `Type`/`ProxyType` properties that block content deployment):

```bash
# Get credentials
cf create-service-key sales-order-capture-destination tmp-key
cf service-key sales-order-capture-destination tmp-key

# Get a token then delete the destination
curl -X DELETE \
  "https://destination-configuration.cfapps.eu10.hana.ondemand.com/destination-configuration/v1/instanceDestinations/srv-api" \
  -H "Authorization: Bearer $TOKEN"

cf delete-service-key sales-order-capture-destination tmp-key
```

After deployment, test in a private browsing window to bypass the Work Zone managed approuter token cache.

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

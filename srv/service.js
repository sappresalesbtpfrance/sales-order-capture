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
  const { SalesOrderRequests, SalesOrderRequestItems, VH_SalesOrganization, VH_DistributionChannel, VH_Customer, VH_Division, VH_CompanyCode, VH_Plant, VH_Country, VH_ProcessingStatus, Currencies } = this.entities;

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

  this.on('READ', VH_Customer, async (req) => {
    const bp = await cds.connect.to('API_BUSINESS_PARTNER');
    let rows = await bp.run(SELECT.from('API_BUSINESS_PARTNER.A_Customer').columns('Customer', 'CustomerName'));
    return rows.map(r => ({ Customer: r.Customer, CustomerName: r.CustomerName }));
  });

  this.on('READ', VH_Division, async (req) => {
    const lang = (req.locale || 'en').toUpperCase();
    const s4 = await cds.connect.to('API_DIVISION_SRV');
    let rows = await s4.run(SELECT.from('API_DIVISION_SRV.A_DivisionText').where({ Language: lang }));
    if (!rows.length) rows = await s4.run(SELECT.from('API_DIVISION_SRV.A_DivisionText').where({ Language: 'EN' }));
    return rows.map(r => ({ Division: r.Division, DivisionName: r.DivisionName, Language: r.Language }));
  });

  this.on('READ', VH_CompanyCode, async (req) => {
    const s4 = await cds.connect.to('API_COMPANYCODE_SRV');
    const rows = await s4.run(SELECT.from('API_COMPANYCODE_SRV.A_CompanyCode').columns('CompanyCode', 'CompanyCodeName'));
    return rows.map(r => ({ CompanyCode: r.CompanyCode, CompanyCodeName: r.CompanyCodeName }));
  });

  this.on('READ', VH_Plant, async (req) => {
    const s4 = await cds.connect.to('API_PLANT_SRV');
    const rows = await s4.run(SELECT.from('API_PLANT_SRV.A_Plant').columns('Plant', 'PlantName'));
    return rows.map(r => ({ Plant: r.Plant, PlantName: r.PlantName }));
  });

  this.on('READ', VH_Country, async (req) => {
    const lang = (req.locale || 'en').toUpperCase();
    const s4 = await cds.connect.to('API_COUNTRY_SRV');
    let rows = await s4.run(SELECT.from('API_COUNTRY_SRV.A_CountryText').where({ Language: lang }));
    if (!rows.length) rows = await s4.run(SELECT.from('API_COUNTRY_SRV.A_CountryText').where({ Language: 'EN' }));
    return rows.map(r => ({ Country: r.Country, CountryName: r.CountryName, Language: r.Language }));
  });

  const PROCESSING_STATUS_LABELS = {
    en: { NEW: 'New', IN_PROCESS: 'In Process', DATA_COMPLETE: 'Data Complete', DATA_INCOMPLETE: 'Data Incomplete', COMPLETED: 'Completed', ERROR: 'Error' },
    fr: { NEW: 'Nouveau', IN_PROCESS: 'En cours', DATA_COMPLETE: 'Données complètes', DATA_INCOMPLETE: 'Données incomplètes', COMPLETED: 'Terminé', ERROR: 'Erreur' },
    de: { NEW: 'Neu', IN_PROCESS: 'In Bearbeitung', DATA_COMPLETE: 'Daten vollständig', DATA_INCOMPLETE: 'Daten unvollständig', COMPLETED: 'Abgeschlossen', ERROR: 'Fehler' },
  };

  this.on('READ', VH_ProcessingStatus, async (req) => {
    const labels = PROCESSING_STATUS_LABELS[req.locale] ?? PROCESSING_STATUS_LABELS['en'];
    return Object.entries(labels).map(([code, name]) => ({ code, name }));
  });

  // ── Currencies (ISO 4217 static list) ────────────────────────────────────
  const CURRENCIES = [
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', minorUnit: 2 },
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋', minorUnit: 2 },
  { code: 'ALL', name: 'Albanian Lek', symbol: 'L', minorUnit: 2 },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏', minorUnit: 2 },
  { code: 'ANG', name: 'Netherlands Antillean Guilder', symbol: 'ƒ', minorUnit: 2 },
  { code: 'AOA', name: 'Angolan Kwanza', symbol: 'Kz', minorUnit: 2 },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', minorUnit: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', minorUnit: 2 },
  { code: 'AWG', name: 'Aruban Florin', symbol: 'ƒ', minorUnit: 2 },
  { code: 'AZN', name: 'Azerbaijani Manat', symbol: '₼', minorUnit: 2 },
  { code: 'BAM', name: 'Bosnia-Herzegovina Convertible Mark', symbol: 'KM', minorUnit: 2 },
  { code: 'BBD', name: 'Barbadian Dollar', symbol: '$', minorUnit: 2 },
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳', minorUnit: 2 },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', minorUnit: 2 },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: '.د.ب', minorUnit: 3 },
  { code: 'BIF', name: 'Burundian Franc', symbol: 'Fr', minorUnit: 0 },
  { code: 'BMD', name: 'Bermudian Dollar', symbol: '$', minorUnit: 2 },
  { code: 'BND', name: 'Brunei Dollar', symbol: '$', minorUnit: 2 },
  { code: 'BOB', name: 'Bolivian Boliviano', symbol: 'Bs.', minorUnit: 2 },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', minorUnit: 2 },
  { code: 'BSD', name: 'Bahamian Dollar', symbol: '$', minorUnit: 2 },
  { code: 'BTN', name: 'Bhutanese Ngultrum', symbol: 'Nu', minorUnit: 2 },
  { code: 'BWP', name: 'Botswana Pula', symbol: 'P', minorUnit: 2 },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br', minorUnit: 2 },
  { code: 'BZD', name: 'Belize Dollar', symbol: '$', minorUnit: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', minorUnit: 2 },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'Fr', minorUnit: 2 },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', minorUnit: 2 },
  { code: 'CLP', name: 'Chilean Peso', symbol: '$', minorUnit: 0 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', minorUnit: 2 },
  { code: 'COP', name: 'Colombian Peso', symbol: '$', minorUnit: 2 },
  { code: 'CRC', name: 'Costa Rican Colón', symbol: '₡', minorUnit: 2 },
  { code: 'CUP', name: 'Cuban Peso', symbol: '$', minorUnit: 2 },
  { code: 'CVE', name: 'Cape Verdean Escudo', symbol: '$', minorUnit: 2 },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', minorUnit: 2 },
  { code: 'DJF', name: 'Djiboutian Franc', symbol: 'Fr', minorUnit: 0 },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', minorUnit: 2 },
  { code: 'DOP', name: 'Dominican Peso', symbol: '$', minorUnit: 2 },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'دج', minorUnit: 2 },
  { code: 'EGP', name: 'Egyptian Pound', symbol: '£', minorUnit: 2 },
  { code: 'ERN', name: 'Eritrean Nakfa', symbol: 'Nfk', minorUnit: 2 },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', minorUnit: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', minorUnit: 2 },
  { code: 'FJD', name: 'Fijian Dollar', symbol: '$', minorUnit: 2 },
  { code: 'FKP', name: 'Falkland Islands Pound', symbol: '£', minorUnit: 2 },
  { code: 'GBP', name: 'British Pound Sterling', symbol: '£', minorUnit: 2 },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾', minorUnit: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵', minorUnit: 2 },
  { code: 'GIP', name: 'Gibraltar Pound', symbol: '£', minorUnit: 2 },
  { code: 'GMD', name: 'Gambian Dalasi', symbol: 'D', minorUnit: 2 },
  { code: 'GNF', name: 'Guinean Franc', symbol: 'Fr', minorUnit: 0 },
  { code: 'GTQ', name: 'Guatemalan Quetzal', symbol: 'Q', minorUnit: 2 },
  { code: 'GYD', name: 'Guyanese Dollar', symbol: '$', minorUnit: 2 },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', minorUnit: 2 },
  { code: 'HNL', name: 'Honduran Lempira', symbol: 'L', minorUnit: 2 },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', minorUnit: 2 },
  { code: 'HTG', name: 'Haitian Gourde', symbol: 'G', minorUnit: 2 },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft', minorUnit: 2 },
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', minorUnit: 2 },
  { code: 'ILS', name: 'Israeli New Shekel', symbol: '₪', minorUnit: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', minorUnit: 2 },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', minorUnit: 3 },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼', minorUnit: 2 },
  { code: 'ISK', name: 'Icelandic Króna', symbol: 'kr', minorUnit: 0 },
  { code: 'JMD', name: 'Jamaican Dollar', symbol: '$', minorUnit: 2 },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'JD', minorUnit: 3 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', minorUnit: 0 },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', minorUnit: 2 },
  { code: 'KGS', name: 'Kyrgyzstani Som', symbol: 'лв', minorUnit: 2 },
  { code: 'KHR', name: 'Cambodian Riel', symbol: '៛', minorUnit: 2 },
  { code: 'KMF', name: 'Comorian Franc', symbol: 'Fr', minorUnit: 0 },
  { code: 'KRW', name: 'South Korean Won', symbol: '₩', minorUnit: 0 },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'KD', minorUnit: 3 },
  { code: 'KYD', name: 'Cayman Islands Dollar', symbol: '$', minorUnit: 2 },
  { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸', minorUnit: 2 },
  { code: 'LAK', name: 'Laotian Kip', symbol: '₭', minorUnit: 2 },
  { code: 'LBP', name: 'Lebanese Pound', symbol: '£', minorUnit: 2 },
  { code: 'LKR', name: 'Sri Lankan Rupee', symbol: '₨', minorUnit: 2 },
  { code: 'LRD', name: 'Liberian Dollar', symbol: '$', minorUnit: 2 },
  { code: 'LSL', name: 'Lesotho Loti', symbol: 'L', minorUnit: 2 },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'LD', minorUnit: 3 },
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'MAD', minorUnit: 2 },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'L', minorUnit: 2 },
  { code: 'MGA', name: 'Malagasy Ariary', symbol: 'Ar', minorUnit: 2 },
  { code: 'MKD', name: 'Macedonian Denar', symbol: 'ден', minorUnit: 2 },
  { code: 'MMK', name: 'Myanmar Kyat', symbol: 'K', minorUnit: 2 },
  { code: 'MNT', name: 'Mongolian Tögrög', symbol: '₮', minorUnit: 2 },
  { code: 'MOP', name: 'Macanese Pataca', symbol: 'P', minorUnit: 2 },
  { code: 'MRU', name: 'Mauritanian Ouguiya', symbol: 'UM', minorUnit: 2 },
  { code: 'MUR', name: 'Mauritian Rupee', symbol: '₨', minorUnit: 2 },
  { code: 'MVR', name: 'Maldivian Rufiyaa', symbol: 'Rf', minorUnit: 2 },
  { code: 'MWK', name: 'Malawian Kwacha', symbol: 'MK', minorUnit: 2 },
  { code: 'MXN', name: 'Mexican Peso', symbol: '$', minorUnit: 2 },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', minorUnit: 2 },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT', minorUnit: 2 },
  { code: 'NAD', name: 'Namibian Dollar', symbol: '$', minorUnit: 2 },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', minorUnit: 2 },
  { code: 'NIO', name: 'Nicaraguan Córdoba', symbol: 'C$', minorUnit: 2 },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', minorUnit: 2 },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: '₨', minorUnit: 2 },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', minorUnit: 2 },
  { code: 'OMR', name: 'Omani Rial', symbol: '﷼', minorUnit: 3 },
  { code: 'PAB', name: 'Panamanian Balboa', symbol: 'B/.', minorUnit: 2 },
  { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/.', minorUnit: 2 },
  { code: 'PGK', name: 'Papua New Guinean Kina', symbol: 'K', minorUnit: 2 },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', minorUnit: 2 },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨', minorUnit: 2 },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł', minorUnit: 2 },
  { code: 'PYG', name: 'Paraguayan Guaraní', symbol: 'Gs', minorUnit: 0 },
  { code: 'QAR', name: 'Qatari Riyal', symbol: '﷼', minorUnit: 2 },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', minorUnit: 2 },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'din', minorUnit: 2 },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', minorUnit: 2 },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'Fr', minorUnit: 0 },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼', minorUnit: 2 },
  { code: 'SBD', name: 'Solomon Islands Dollar', symbol: '$', minorUnit: 2 },
  { code: 'SCR', name: 'Seychellois Rupee', symbol: '₨', minorUnit: 2 },
  { code: 'SDG', name: 'Sudanese Pound', symbol: '£', minorUnit: 2 },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', minorUnit: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', minorUnit: 2 },
  { code: 'SHP', name: 'Saint Helena Pound', symbol: '£', minorUnit: 2 },
  { code: 'SLL', name: 'Sierra Leonean Leone', symbol: 'Le', minorUnit: 2 },
  { code: 'SOS', name: 'Somali Shilling', symbol: 'Sh', minorUnit: 2 },
  { code: 'SRD', name: 'Surinamese Dollar', symbol: '$', minorUnit: 2 },
  { code: 'STN', name: 'São Tomé and Príncipe Dobra', symbol: 'Db', minorUnit: 2 },
  { code: 'SVC', name: 'Salvadoran Colón', symbol: '₡', minorUnit: 2 },
  { code: 'SYP', name: 'Syrian Pound', symbol: '£', minorUnit: 2 },
  { code: 'SZL', name: 'Swazi Lilangeni', symbol: 'L', minorUnit: 2 },
  { code: 'THB', name: 'Thai Baht', symbol: '฿', minorUnit: 2 },
  { code: 'TJS', name: 'Tajikistani Somoni', symbol: 'SM', minorUnit: 2 },
  { code: 'TMT', name: 'Turkmenistan Manat', symbol: 'T', minorUnit: 2 },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'DT', minorUnit: 3 },
  { code: 'TOP', name: 'Tongan Paʻanga', symbol: 'T$', minorUnit: 2 },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', minorUnit: 2 },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', symbol: 'TT$', minorUnit: 2 },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', minorUnit: 2 },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'Sh', minorUnit: 2 },
  { code: 'UAH', name: 'Ukrainian Hryvnia', symbol: '₴', minorUnit: 2 },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'Sh', minorUnit: 0 },
  { code: 'USD', name: 'United States Dollar', symbol: '$', minorUnit: 2 },
  { code: 'UYU', name: 'Uruguayan Peso', symbol: '$U', minorUnit: 2 },
  { code: 'UZS', name: 'Uzbekistani Som', symbol: 'лв', minorUnit: 2 },
  { code: 'VES', name: 'Venezuelan Bolívar Soberano', symbol: 'Bs.S', minorUnit: 2 },
  { code: 'VND', name: 'Vietnamese Dong', symbol: '₫', minorUnit: 0 },
  { code: 'VUV', name: 'Vanuatu Vatu', symbol: 'Vt', minorUnit: 0 },
  { code: 'WST', name: 'Samoan Tala', symbol: 'T', minorUnit: 2 },
  { code: 'XAF', name: 'Central African CFA Franc', symbol: 'Fr', minorUnit: 0 },
  { code: 'XCD', name: 'East Caribbean Dollar', symbol: '$', minorUnit: 2 },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'Fr', minorUnit: 0 },
  { code: 'XPF', name: 'CFP Franc', symbol: 'Fr', minorUnit: 0 },
  { code: 'YER', name: 'Yemeni Rial', symbol: '﷼', minorUnit: 2 },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', minorUnit: 2 },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', minorUnit: 2 },
  { code: 'ZWL', name: 'Zimbabwean Dollar', symbol: '$', minorUnit: 2 },
];

  this.on('READ', Currencies, () => CURRENCIES);

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


  // ── Document AI helpers ────────────────────────────────────────────────────
  let _docAiToken = null;
  let _tokenExpiry = 0;

  async function getDocAiToken() {
    if (_docAiToken && Date.now() < _tokenExpiry - 30000) return _docAiToken;
    const cfg = cds.env.requires?.DOCUMENT_AI?.credentials || {};
    const tokenUrl = cfg.tokenServiceUrl || cfg['token-service-url'];
    const res = await fetch(`${tokenUrl}?grant_type=client_credentials`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    const data = await res.json();
    _docAiToken = data.access_token;
    _tokenExpiry = Date.now() + data.expires_in * 1000;
    return _docAiToken;
  }

  this.on('getDocumentAISchemas', async () => {
    try {
      const token = await getDocAiToken();
      const baseUrl = cds.env.requires?.DOCUMENT_AI?.credentials?.url || 'https://eu10.doc.cloud.sap';
      const res = await fetch(
        `${baseUrl}/document-information-extraction/v1/schemas?clientId=default&predefined=false`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      const schemas = data?.schemas || [];
      return schemas.map(s => ({ id: s.id, name: s.name, documentType: s.documentType || '' }));
    } catch (err) {
      cds.log('sales-order-capture').warn('getDocumentAISchemas failed:', err.message);
      return [];
    }
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
          docAiSchemaId:   file.schemaId || null,
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

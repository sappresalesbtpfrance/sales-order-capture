sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"salesorders/test/integration/pages/SalesOrderRequestsList",
	"salesorders/test/integration/pages/SalesOrderRequestsObjectPage"
], function (JourneyRunner, SalesOrderRequestsList, SalesOrderRequestsObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('salesorders') + '/test/flpSandbox.html#salesorders-tile',
        pages: {
			onTheSalesOrderRequestsList: SalesOrderRequestsList,
			onTheSalesOrderRequestsObjectPage: SalesOrderRequestsObjectPage
        },
        async: true
    });

    return runner;
});


sap.ui.define([
    "sap/ui/test/opaQunit",
    "./pages/JourneyRunner"
], function (opaTest, runner) {
    "use strict";

    function journey() {
        QUnit.module("First journey");

        opaTest("Start application", function (Given, When, Then) {
            Given.iStartMyApp();
            Then.onTheSalesOrderRequestsList.iSeeThisPage();
        });


        opaTest("Navigate to ObjectPage", function (Given, When, Then) {
            // Note: this test will fail if the ListReport page doesn't show any data
            
            When.onTheSalesOrderRequestsList.onFilterBar().iExecuteSearch();
            
            Then.onTheSalesOrderRequestsList.onTable().iCheckRows();

            When.onTheSalesOrderRequestsList.onTable().iPressRow(0);
            Then.onTheSalesOrderRequestsObjectPage.iSeeThisPage();

        });

        opaTest("Teardown", function (Given, When, Then) { 
            // Cleanup
            Given.iTearDownMyApp();
        });
    }

    runner.run([journey]);
});
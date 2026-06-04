sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("mickey.controller.Main", {
        onInit: function () {
            // Mock data for dropdowns
            var aProductionOrders = [
                { key: "PO-2026-001", text: "PO-2026-001 (Cotton Jersey - Red)" },
                { key: "PO-2026-002", text: "PO-2026-002 (Polyester Blend - Blue)" },
                { key: "PO-2026-003", text: "PO-2026-003 (Silk Satin - White)" }
            ];

            var aOperations = [
                { key: "OP-010", text: "OP-010 (Weaving / Knitting)" },
                { key: "OP-020", text: "OP-020 (Dyeing / Coloring)" },
                { key: "OP-030", text: "OP-030 (Finishing / Inspection)" }
            ];

            var aProcesses = [
                { key: "weaving", text: "Weaving" },
                { key: "dyeing", text: "Dyeing" },
                { key: "finishing", text: "Finishing" }
            ];

            var oDefectsMap = {
                "weaving": [
                    { name: "Broken Pick" },
                    { name: "Double Pick" },
                    { name: "Weft Loop" },
                    { name: "Misdraw" },
                    { name: "Slub" },
                    { name: "Hole" }
                ],
                "dyeing": [
                    { name: "Color Shade" },
                    { name: "Dye Spot" },
                    { name: "Uneven Dyeing" },
                    { name: "Bleach Spot" },
                    { name: "Streaks" },
                    { name: "Patchiness" }
                ],
                "finishing": [
                    { name: "Crease Mark" },
                    { name: "Skewness" },
                    { name: "Stains" },
                    { name: "Torn Edge" },
                    { name: "Calender Mark" },
                    { name: "Width Variation" }
                ]
            };

            // Operator mapping based on PO
            this._oOperatorMap = {
                "PO-2026-001": "Alice Miller (Grade A Inspector)",
                "PO-2026-002": "Bob Jones (Senior Operator)",
                "PO-2026-003": "Charlie Davis (Quality Lead)"
            };

            var oModel = new JSONModel({
                productionOrders: aProductionOrders,
                operations: aOperations,
                processes: aProcesses,
                currentDefects: oDefectsMap["weaving"], // Default to weaving
                capturedDefects: [],
                selection: {
                    productionOrder: "",
                    operation: "",
                    operator: "",
                    process: "weaving",
                    meterReading: "",
                    points: "1"
                }
            });

            this._oDefectsMap = oDefectsMap;
            this.getView().setModel(oModel);
        },

        onProductionOrderChange: function (oEvent) {
            var oModel = this.getView().getModel();
            var oSource = oEvent.getSource();
            var sKey = oSource.getSelectedKey();
            
            // If key is empty, check if we can resolve it from the typed value
            if (!sKey) {
                var sValue = oSource.getValue();
                var aPO = oModel.getProperty("/productionOrders") || [];
                var oFound = aPO.find(function(po) {
                    return po.key === sValue || po.text === sValue || po.text.indexOf(sValue) !== -1;
                });
                if (oFound) {
                    sKey = oFound.key;
                    oSource.setSelectedKey(sKey);
                }
            }
            
            var sOperator = this._oOperatorMap[sKey] || "";
            oModel.setProperty("/selection/operator", sOperator);
        },

        onMeterReadingSubmit: function (oEvent) {
            // Prevent Enter key press in input from triggering button clicks
        },

        onProcessChange: function (oEvent) {
            var oModel = this.getView().getModel();
            var sProcessKey = oEvent.getSource().getSelectedKey();
            var aDefects = this._oDefectsMap[sProcessKey] || [];
            oModel.setProperty("/currentDefects", aDefects);
            MessageToast.show("Loaded defects list for process: " + sProcessKey);
        },

        onDefectClick: function (oEvent) {
            var oModel = this.getView().getModel();
            var oSelection = oModel.getProperty("/selection");

            // Validations
            if (!oSelection.productionOrder || oSelection.productionOrder.trim() === "") {
                MessageToast.show("Please select a Production Order first!");
                return;
            }
            if (!oSelection.operation || oSelection.operation.trim() === "") {
                MessageToast.show("Please select an Operation first!");
                return;
            }
            if (!oSelection.meterReading || oSelection.meterReading.trim() === "") {
                MessageToast.show("Please enter a Meter Reading first!");
                return;
            }

            var sDefectName = oEvent.getSource().getText();
            var fMeter = parseFloat(oSelection.meterReading);
            if (isNaN(fMeter)) {
                MessageToast.show("Please enter a valid numeric Meter Reading!");
                return;
            }

            var aCaptured = oModel.getProperty("/capturedDefects") || [];
            
            // Add captured defect details
            aCaptured.push({
                defectName: sDefectName,
                meterReading: fMeter.toFixed(2),
                points: oSelection.points,
                productionOrder: oSelection.productionOrder,
                operation: oSelection.operation,
                process: oSelection.process,
                operator: oSelection.operator || "N/A",
                timestamp: new Date().toLocaleTimeString()
            });

            oModel.setProperty("/capturedDefects", aCaptured);

            // Auto-increment meter reading by 5 meters as a user-friendly helper
            var fNextMeter = fMeter + 5.0;
            oModel.setProperty("/selection/meterReading", fNextMeter.toFixed(2));

            MessageToast.show("Defect '" + sDefectName + "' added at " + fMeter.toFixed(2) + "m.");
        },

        onDeleteDefect: function (oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext();
            var sPath = oContext.getPath();
            var iIndex = parseInt(sPath.substring(sPath.lastIndexOf("/") + 1), 10);
            
            var oModel = this.getView().getModel();
            var aCaptured = oModel.getProperty("/capturedDefects");
            aCaptured.splice(iIndex, 1);
            oModel.setProperty("/capturedDefects", aCaptured);
            MessageToast.show("Defect deleted.");
        },

        onFinalSubmit: function () {
            var oModel = this.getView().getModel();
            var aCaptured = oModel.getProperty("/capturedDefects") || [];

            if (aCaptured.length === 0) {
                MessageToast.show("No captured defects to submit!");
                return;
            }

            MessageToast.show("Successfully submitted " + aCaptured.length + " defect logs to SAP!");
            oModel.setProperty("/capturedDefects", []);
            oModel.setProperty("/selection/meterReading", "");
        }
    });
});

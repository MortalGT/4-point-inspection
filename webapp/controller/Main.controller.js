sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
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

            var aDemoDefects = [
                { name: "Light Repeat line" },
                { name: "Heavy Repeat line" },
                { name: "Yarn pulling" },
                { name: "Heavy yarn pulling" },
                { name: "Neps / Kapus / Yarn Knots" },
                { name: "Boing" },
                { name: "Moyar" },
                { name: "Light Carbonize" },
                { name: "Heavy Carbonize" },
                { name: "Fold mark dagi" },
                { name: "Pin out" },
                { name: "Stenter Stoppage" },
                { name: "Dagi" },
                { name: "Boarder side patta" },
                { name: "Wrong cutting" },
                { name: "Kniting Chira" },
                { name: "Light needle line" },
                { name: "Heavy needle line" },
                { name: "Light rupture" },
                { name: "Heavy Rupture" }
            ];

            var oDefectsMap = {
                "weaving": aDemoDefects,
                "dyeing": aDemoDefects,
                "finishing": aDemoDefects
            };

            // Operator mapping based on PO
            this._oOperatorMap = {
                "PO-2026-001": "Alice Miller (Grade A Inspector)",
                "PO-2026-002": "Bob Jones (Senior Operator)",
                "PO-2026-003": "Charlie Davis (Quality Lead)"
            };

            // Lot mapping based on PO
            this._oLotMap = {
                "PO-2026-001": "LOT-99201",
                "PO-2026-002": "LOT-88102",
                "PO-2026-003": "LOT-77303"
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
                    lotNumber: "",
                    process: "weaving",
                    meterReading: ""
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

            var sLot = this._oLotMap[sKey] || "";
            oModel.setProperty("/selection/lotNumber", sLot);
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
                productionOrder: oSelection.productionOrder,
                operation: oSelection.operation,
                process: oSelection.process,
                operator: oSelection.operator || "N/A",
                lotNumber: oSelection.lotNumber || "N/A",
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

            // Generate random 10-digit numbers
            var sDocNum = Math.floor(1000000000 + Math.random() * 9000000000).toString();
            var sBatchNum = Math.floor(1000000000 + Math.random() * 9000000000).toString();

            var sMessage = "Document number " + sDocNum + " has been posted.\n\nBatch " + sBatchNum + " has been created.";

            MessageBox.success(sMessage, {
                title: "Inspection Submitted"
            });

            oModel.setProperty("/capturedDefects", []);
            oModel.setProperty("/selection/meterReading", "");
            oModel.setProperty("/selection/lotNumber", "");
            oModel.setProperty("/selection/operator", "");
            oModel.setProperty("/selection/productionOrder", "");
            oModel.setProperty("/selection/operation", "");
        }
    });
});

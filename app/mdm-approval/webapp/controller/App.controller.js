sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/UIComponent",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, History, UIComponent, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("com.company.mdmapproval.controller.App", {

        onInit: function () {
            // Initialize the flexible column layout
            this._initializeFlexibleColumnLayout();

            // Load initial data
            this._loadInitialData();
        },

        /**
         * Navigation back button handler
         * This handles the back navigation for the entire application
         */
        onNavBack: function () {
            var oHistory = History.getInstance();
            var sPreviousHash = oHistory.getPreviousHash();
            var oFCL = this.byId("fcl");

            // If we're in a multi-column layout, navigate back within the layout
            if (oFCL.getLayout() !== "OneColumn") {
                // Navigate back to list view
                oFCL.setLayout("OneColumn");
                this._updateNavigationButtonVisibility();
                return;
            }

            // If there's a previous hash, go back in browser history
            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                // Otherwise navigate to the Fiori Launchpad or main page
                this._navigateToLaunchpad();
            }
        },

        /**
         * Handle navigation to business partners list
         */
        onNavigateToBusinessPartners: function () {
            var oFCL = this.byId("fcl");
            oFCL.setLayout("OneColumn");
            this._updateNavigationButtonVisibility();
            MessageToast.show("Navigated to Business Partners");
        },

        /**
         * Handle navigation to duplicates view
         */
        onNavigateToDuplicates: function () {
            MessageToast.show("Duplicates view - Feature coming soon");
        },

        /**
         * Handle navigation to approvals view
         */
        onNavigateToApprovals: function () {
            MessageToast.show("Approvals view - Feature coming soon");
        },

        /**
         * Handle navigation to reports view
         */
        onNavigateToReports: function () {
            MessageToast.show("Reports view - Feature coming soon");
        },

        /**
         * Handle user menu press
         */
        onUserMenuPress: function () {
            MessageToast.show("User menu - Feature coming soon");
        },

        /**
         * Handle create request button press
         */
        onCreateRequest: function () {
            MessageToast.show("Create Request dialog - Feature coming soon");
        },

        /**
         * Handle refresh button press
         */
        onRefresh: function () {
            this._loadInitialData();
            MessageToast.show("Data refreshed");
        },

        /**
         * Handle filter changes
         */
        onFilterChange: function () {
            // Apply filters to the table
            this._applyFilters();
        },

        /**
         * Handle search
         */
        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("newValue");
            this._searchBusinessPartners(sQuery);
        },

        /**
         * Handle table selection change
         */
        onSelectionChange: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("listItem");
            if (oSelectedItem) {
                this._showDetailView(oSelectedItem.getBindingContext().getObject());
            }
        },

        /**
         * Handle item press in the table
         */
        onItemPress: function (oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext();
            if (oBindingContext) {
                this._showDetailView(oBindingContext.getObject());
            }
        },

        /**
         * Handle view details button press
         */
        onViewDetails: function (oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext();
            if (oBindingContext) {
                this._showDetailView(oBindingContext.getObject());
            }
        },

        /**
         * Handle check duplicates button press
         */
        onCheckDuplicates: function (oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext();
            if (oBindingContext) {
                var oRequest = oBindingContext.getObject();
                this._checkDuplicates(oRequest);
            }
        },

        /**
         * Handle approve button press
         */
        onApprove: function (oEvent) {
            var oBindingContext = oEvent.getSource().getBindingContext();
            if (oBindingContext) {
                var oRequest = oBindingContext.getObject();
                this._approveRequest(oRequest);
            }
        },

        /**
         * Handle export to Excel button press
         */
        onExportToExcel: function () {
            MessageToast.show("Export to Excel - Feature coming soon");
        },

        /**
         * Handle flexible column layout state change
         */
        onStateChanged: function (oEvent) {
            var sLayout = oEvent.getParameter("layout");
            this._updateNavigationButtonVisibility();
        },

        /**
         * Initialize the flexible column layout
         * @private
         */
        _initializeFlexibleColumnLayout: function () {
            var oFCL = this.byId("fcl");
            oFCL.setLayout("OneColumn");
        },

        /**
         * Load initial data for the application
         * @private
         */
        _loadInitialData: function () {
            var oModel = this.getView().getModel();

            // Set up initial data structure
            var oData = {
                BusinessPartnerRequests: [],
                totalRequests: 0,
                pendingRequests: 0,
                duplicateRequests: 0,
                statusOptions: [
                    { key: "Draft", text: "Draft" },
                    { key: "Submitted", text: "Submitted" },
                    { key: "ComplianceCheck", text: "Compliance Check" },
                    { key: "DuplicateReview", text: "Duplicate Review" },
                    { key: "Approved", text: "Approved" },
                    { key: "Rejected", text: "Rejected" }
                ],
                sourceSystemOptions: [
                    { key: "Manual", text: "Manual" },
                    { key: "Coupa", text: "Coupa" },
                    { key: "Salesforce", text: "Salesforce" },
                    { key: "PI", text: "Purchasing Interface" }
                ],
                requestTypeOptions: [
                    { key: "Create", text: "Create" },
                    { key: "Update", text: "Update" },
                    { key: "Block", text: "Block" }
                ],
                selectedStatuses: [],
                selectedSourceSystems: [],
                selectedRequestTypes: []
            };

            if (!oModel) {
                // Create a JSON model if it doesn't exist
                var oJSONModel = new sap.ui.model.json.JSONModel(oData);
                this.getView().setModel(oJSONModel);
            } else {
                oModel.setData(oData);
            }

            // Load business partner requests from the service
            this._loadBusinessPartnerRequests();
        },

        /**
         * Load business partner requests from the service
         * @private
         */
        _loadBusinessPartnerRequests: function () {
            // This would typically make an OData call to load the requests
            // For now, we'll set up the binding to the OData service
            var oTable = this.byId("businessPartnerTable");
            if (oTable) {
                // The binding is already set in the XML view
                // We can add additional logic here if needed
            }
        },

        /**
         * Show detail view for a business partner request
         * @private
         * @param {object} oRequest The business partner request object
         */
        _showDetailView: function (oRequest) {
            var oFCL = this.byId("fcl");

            // Switch to two column layout
            oFCL.setLayout("TwoColumnsMidExpanded");

            // Load detail view content (this would be dynamically loaded)
            var oDetailPage = this.byId("detailPage");
            // Here you would load the detail view content based on the request

            this._updateNavigationButtonVisibility();

            MessageToast.show("Showing details for: " + oRequest.partnerName);
        },

        /**
         * Check for duplicates
         * @private
         * @param {object} oRequest The business partner request object
         */
        _checkDuplicates: function (oRequest) {
            MessageToast.show("Checking duplicates for: " + oRequest.partnerName);
            // Here you would call the duplicate check service
        },

        /**
         * Approve a request
         * @private
         * @param {object} oRequest The business partner request object
         */
        _approveRequest: function (oRequest) {
            var that = this;

            MessageBox.confirm("Are you sure you want to approve this request?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        // Call the approval service
                        that._callApprovalService(oRequest);
                    }
                }
            });
        },

        /**
         * Call the approval service and handle structured response
         * @private
         * @param {object} oRequest The business partner request object
         */
        _callApprovalService: function (oRequest) {
            var that = this;
            var oModel = this.getView().getModel();

            // Call the approveRequest action
            var sPath = "/BusinessPartnerRequests('" + oRequest.ID + "')/approveRequest";

            oModel.callFunction(sPath, {
                method: "POST",
                urlParameters: {
                    comments: "Approved via UI"
                },
                success: function (oData) {
                    that._handleServiceResponse(oData);
                },
                error: function (oError) {
                    that._handleServiceError(oError);
                }
            });
        },

        /**
         * Handle structured service response with navigation instructions
         * @private
         * @param {object} oResponse The service response
         */
        _handleServiceResponse: function (oResponse) {
            var that = this;

            if (oResponse && oResponse.showSuccessDialog && oResponse.successDialogOptions) {
                // Show structured success dialog with navigation options
                this._showSuccessDialog(oResponse.successDialogOptions);
            } else if (oResponse && oResponse.navigationAction === 'backToList') {
                // Direct navigation back to list
                MessageToast.show(oResponse.message || "Action completed successfully");
                this._navigateBackToList();
            } else {
                // Fallback to simple message
                MessageToast.show(oResponse.message || "Action completed successfully");
            }
        },

        /**
         * Show structured success dialog with action buttons
         * @private
         * @param {object} oDialogOptions The dialog configuration
         */
        _showSuccessDialog: function (oDialogOptions) {
            var that = this;
            var aButtons = [];

            // Build action buttons from the response
            if (oDialogOptions.actions) {
                oDialogOptions.actions.forEach(function (oAction) {
                    aButtons.push({
                        text: oAction.text,
                        type: oAction.emphasized ? "Emphasized" : "Default",
                        press: function () {
                            that._handleDialogAction(oAction);
                        }
                    });
                });
            }

            // Create and show the dialog
            MessageBox.show(oDialogOptions.message, {
                icon: MessageBox.Icon.SUCCESS,
                title: oDialogOptions.title,
                actions: aButtons.length > 0 ? aButtons.map(function(btn) { return btn.text; }) : [MessageBox.Action.OK],
                onClose: function (sAction) {
                    // Find the corresponding action and execute it
                    var oSelectedAction = oDialogOptions.actions && oDialogOptions.actions.find(function (action) {
                        return action.text === sAction;
                    });

                    if (oSelectedAction) {
                        that._handleDialogAction(oSelectedAction);
                    } else if (sAction === MessageBox.Action.OK) {
                        that._navigateBackToList();
                    }
                }
            });
        },

        /**
         * Handle dialog action selection
         * @private
         * @param {object} oAction The selected action
         */
        _handleDialogAction: function (oAction) {
            switch (oAction.action) {
                case 'backToList':
                    this._navigateBackToList();
                    break;
                case 'viewBPDetails':
                    this._viewBPDetails(oAction.parameters);
                    break;
                case 'viewDuplicates':
                    this._viewDuplicates(oAction.parameters);
                    break;
                case 'viewMergeDetails':
                    this._viewMergeDetails(oAction.parameters);
                    break;
                default:
                    this._navigateBackToList();
            }
        },

        /**
         * View business partner details
         * @private
         * @param {object} oParameters Action parameters
         */
        _viewBPDetails: function (oParameters) {
            if (oParameters && oParameters.sapBpNumber) {
                MessageToast.show("Viewing BP Details for: " + oParameters.sapBpNumber);
                // TODO: Navigate to BP details view
            }
            this._navigateBackToList();
        },

        /**
         * View duplicate analysis
         * @private
         * @param {object} oParameters Action parameters
         */
        _viewDuplicates: function (oParameters) {
            if (oParameters && oParameters.requestId) {
                MessageToast.show("Viewing duplicate analysis for request");
                // TODO: Navigate to duplicate analysis view
            }
            this._navigateBackToList();
        },

        /**
         * View merge details
         * @private
         * @param {object} oParameters Action parameters
         */
        _viewMergeDetails: function (oParameters) {
            if (oParameters && oParameters.requestId) {
                MessageToast.show("Viewing merge details");
                // TODO: Navigate to merge details view
            }
            this._navigateBackToList();
        },

        /**
         * Handle service errors
         * @private
         * @param {object} oError The error object
         */
        _handleServiceError: function (oError) {
            var sMessage = "An error occurred during the operation.";

            if (oError && oError.responseText) {
                try {
                    var oErrorData = JSON.parse(oError.responseText);
                    if (oErrorData.error && oErrorData.error.message) {
                        sMessage = oErrorData.error.message;
                    }
                } catch (e) {
                    // Use default message
                }
            }

            MessageBox.error(sMessage);
        },

        /**
         * Navigate back to list view after completing an action
         * @private
         */
        _navigateBackToList: function () {
            var oFCL = this.byId("fcl");
            oFCL.setLayout("OneColumn");
            this._updateNavigationButtonVisibility();

            // Refresh the data
            this._loadBusinessPartnerRequests();

            MessageToast.show("Returned to Business Partner list");
        },

        /**
         * Apply filters to the business partner table
         * @private
         */
        _applyFilters: function () {
            // Get filter values and apply them to the table binding
            var oTable = this.byId("businessPartnerTable");
            if (oTable) {
                // Apply filters based on selected values
                // This would be implemented based on the specific filtering logic needed
            }
        },

        /**
         * Search business partners
         * @private
         * @param {string} sQuery The search query
         */
        _searchBusinessPartners: function (sQuery) {
            var oTable = this.byId("businessPartnerTable");
            if (oTable) {
                var oBinding = oTable.getBinding("items");
                if (oBinding) {
                    if (sQuery) {
                        var aFilters = [
                            new sap.ui.model.Filter("partnerName", sap.ui.model.FilterOperator.Contains, sQuery),
                            new sap.ui.model.Filter("requestNumber", sap.ui.model.FilterOperator.Contains, sQuery)
                        ];
                        var oOrFilter = new sap.ui.model.Filter({
                            filters: aFilters,
                            and: false
                        });
                        oBinding.filter([oOrFilter]);
                    } else {
                        oBinding.filter([]);
                    }
                }
            }
        },

        /**
         * Update navigation button visibility based on current layout
         * @private
         */
        _updateNavigationButtonVisibility: function () {
            var oFCL = this.byId("fcl");
            var oPage = this.byId("appPage");

            if (oFCL && oPage) {
                var sLayout = oFCL.getLayout();
                // Show nav button when in detail view (not OneColumn)
                var bShowNavButton = sLayout !== "OneColumn";
                oPage.setShowNavButton(bShowNavButton);
            }
        },

        /**
         * Navigate to Fiori Launchpad or main application
         * @private
         */
        _navigateToLaunchpad: function () {
            // Navigate to Fiori Launchpad if available
            if (sap.ushell && sap.ushell.Container) {
                sap.ushell.Container.getService("CrossApplicationNavigation").toExternal({
                    target: { shellHash: "#" }
                });
            } else {
                // Fallback to main application page
                window.location.href = "/webapp/index.html";
            }
        },

        // Formatter functions
        formatStatusState: function (sStatus) {
            switch (sStatus) {
                case "Approved":
                    return "Success";
                case "Rejected":
                    return "Error";
                case "ComplianceCheck":
                case "DuplicateReview":
                    return "Warning";
                default:
                    return "None";
            }
        },

        formatDate: function (dDate) {
            if (dDate) {
                return new Date(dDate).toLocaleDateString();
            }
            return "";
        },

        showDuplicateButton: function (sStatus) {
            return sStatus === "Submitted" || sStatus === "ComplianceCheck";
        },

        showApproveButton: function (sStatus) {
            return sStatus === "DuplicateReview" || sStatus === "ComplianceCheck";
        }
    });
});
-- Initial data for MDM Application

-- Business Channels Master Data
INSERT INTO mdm_db_BusinessChannels (ID, channelCode, channelName, description, isActive) VALUES
('bc1', 'NONMERCH', 'Non-merchandise', 'Non-merchandise procurement', 1),
('bc2', 'MERCHOWN', 'Merchandise (own-stock)', 'Own stock merchandise', 1),
('bc3', 'MERCHNON', 'Merchandise (non own-stock)', 'Non own-stock merchandise', 1),
('bc4', 'MARKETPLACE', 'Marketplace/Partner program', 'Marketplace and partner programs', 1),
('bc5', 'ADBUSINESS', 'Ad business', 'Advertising business channel', 1);

-- System Configuration
INSERT INTO mdm_db_SystemConfiguration (ID, configKey, configValue, description, isActive) VALUES
('sc1', 'DUPLICATE_THRESHOLD', '0.95', 'Threshold for duplicate detection (0-1)', 1),
('sc2', 'AUTO_APPROVAL_LIMIT', '10000', 'Auto approval limit for low-risk requests', 1),
('sc3', 'VIES_API_ENDPOINT', 'http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl', 'VIES API endpoint', 1),
('sc4', 'AEB_API_ENDPOINT', 'https://api.aeb.com/compliance/check', 'AEB compliance API endpoint', 1),
('sc5', 'KYC_REVIEW_PERIOD', '6', 'KYC review period in months', 1),
('sc6', 'NOTIFICATION_EMAIL_TEMPLATE', 'default', 'Email template for notifications', 1);

-- Workflow Steps
INSERT INTO mdm_db_WorkflowSteps (ID, workflowName, stepNumber, stepName, approverRole, isParallel, isMandatory, timeoutDays) VALUES
('ws1', 'SUPPLIER_APPROVAL', 1, 'Initial Review', 'MDMApprover', 0, 1, 3),
('ws2', 'SUPPLIER_APPROVAL', 2, 'Compliance Check', 'MDMApprover', 0, 1, 2),
('ws3', 'SUPPLIER_APPROVAL', 3, 'Final Approval', 'MDMApprover', 0, 1, 5),
('ws4', 'CUSTOMER_APPROVAL', 1, 'Initial Review', 'MDMApprover', 0, 1, 3),
('ws5', 'CUSTOMER_APPROVAL', 2, 'Credit Check', 'MDMApprover', 0, 1, 2),
('ws6', 'CUSTOMER_APPROVAL', 3, 'Final Approval', 'MDMApprover', 0, 1, 5);

-- User Roles
INSERT INTO mdm_db_UserRoles (ID, userId, userName, userEmail, role, systemAccess, isActive) VALUES
('ur1', 'alice', 'Alice Johnson', 'alice@company.com', 'MDMApprover', 'SAP,Coupa,Salesforce,PI', 1),
('ur2', 'bob', 'Bob Smith', 'bob@company.com', 'SystemOwner', 'Coupa', 1),
('ur3', 'carol', 'Carol Williams', 'carol@company.com', 'BusinessUser', 'Salesforce', 1),
('ur4', 'david', 'David Brown', 'david@company.com', 'SystemOwner', 'PI', 1),
('ur5', 'emma', 'Emma Davis', 'emma@company.com', 'Admin', 'SAP,Coupa,Salesforce,PI', 1);

-- Sample Business Partner Request (for testing)
INSERT INTO mdm_db_BusinessPartnerRequests (
    ID, requestNumber, entityType, requestType, sourceSystem, status,
    requesterId, requesterName, requesterEmail,
    partnerName, searchTerm, partnerRole, businessChannels,
    coupaInternalNo, paymentTerms, paymentMethod, reconAccount,
    aebComplianceStatus, viesValidationStatus,
    kycCompleted, comments
) VALUES (
    'req1', 'MDM-20241012-0001', 'Supplier', 'Create', 'Coupa', 'Draft',
    'carol', 'Carol Williams', 'carol@company.com',
    'ACME Corporation Ltd', 'ACME', 'Supplier', 'NONMERCH',
    'COUPA-12345', 'NET30', 'BankTransfer', '2000000',
    'NotChecked', 'NotChecked',
    0, 'Initial test supplier request'
);

-- Sample addresses for the test request
INSERT INTO mdm_db_PartnerAddresses (
    ID, request_ID, addressType, name1, name2, street, streetNumber,
    city, postalCode, region, country_code, timeZone, language, isDefault
) VALUES (
    'addr1', 'req1', 'Main', 'ACME Corporation Ltd', 'Procurement Department',
    'Main Street', '123', 'New York', '10001', 'NY', 'US', 'EST', 'EN', 1
);

-- Sample emails for the test request
INSERT INTO mdm_db_PartnerEmails (
    ID, request_ID, emailType, emailAddress, notes, isDefault
) VALUES (
    'email1', 'req1', 'Primary', 'contact@acme.com', 'Main contact', 1);

INSERT INTO mdm_db_PartnerEmails (
    ID, request_ID, emailType, emailAddress, notes, isDefault
) VALUES (
    'email2', 'req1', 'AP', 'ap@acme.com', 'VN - AP team contact', 0);

-- Sample bank details for the test request
INSERT INTO mdm_db_PartnerBanks (
    ID, request_ID, bankCountry_code, bankKey, bankName, accountHolder,
    accountNumber, iban, swiftCode, currency_code, isDefault
) VALUES (
    'bank1', 'req1', 'US', 'BOA001', 'Bank of America', 'ACME Corporation Ltd',
    '1234567890', 'US12BOFA12345678901234567890', 'BOFAUS3N', 'USD', 1);

-- Sample VAT IDs for the test request
INSERT INTO mdm_db_PartnerVatIds (
    ID, request_ID, country_code, vatNumber, vatType, validationStatus, isDefault
) VALUES (
    'vat1', 'req1', 'US', '123456789', 'Standard', 'NotChecked', 1);

-- Sample approval history
INSERT INTO mdm_db_ApprovalHistory (
    ID, request_ID, approverUserId, approverName, action,
    previousStatus, newStatus, comments, systemGenerated
) VALUES (
    'hist1', 'req1', 'system', 'System', 'Create',
    NULL, 'Draft', 'Request created automatically', 1
);

-- Sample Existing Partners for Duplicate Checking
INSERT INTO mdm_db_ExistingPartners (
    ID, sapBpNumber, partnerName, partnerType, status,
    establishedAddress, establishedVatId, establishedCountry,
    createdAt, lastUpdated, sourceSystem, searchTerms,
    allVatIds, allAddresses, businessChannels
) VALUES
(
    'ep1', 'BP100001', 'Global Tech Solutions Inc', 'Supplier', 'Active',
    '{"name1":"Global Tech Solutions Inc","street":"Technology Blvd","streetNumber":"456","city":"San Francisco","postalCode":"94105","country":"US"}',
    'US987654321', 'US',
    '2023-01-15T10:00:00.000Z', '2024-09-15T14:30:00.000Z', 'Coupa',
    'Global Tech Solutions GTS Technology',
    '["US987654321","CA123456789"]',
    '[{"type":"Main","street":"Technology Blvd 456","city":"San Francisco","country":"US"},{"type":"Billing","street":"Finance Ave 789","city":"San Francisco","country":"US"}]',
    'NONMERCH,ADBUSINESS'
),
(
    'ep2', 'BP100002', 'European Supplies GmbH', 'Supplier', 'Active',
    '{"name1":"European Supplies GmbH","street":"Hauptstraße","streetNumber":"123","city":"Berlin","postalCode":"10115","country":"DE"}',
    'DE123456789', 'DE',
    '2023-03-20T09:15:00.000Z', '2024-08-10T11:45:00.000Z', 'PI',
    'European Supplies GmbH Supplies Europe',
    '["DE123456789","AT987654321"]',
    '[{"type":"Main","street":"Hauptstraße 123","city":"Berlin","country":"DE"}]',
    'MERCHOWN'
),
(
    'ep3', 'BP100003', 'ACME Industries Ltd', 'Both', 'Active',
    '{"name1":"ACME Industries Ltd","street":"Industrial Park","streetNumber":"999","city":"Manchester","postalCode":"M1 1AA","country":"GB"}',
    'GB999888777', 'GB',
    '2023-06-10T14:20:00.000Z', '2024-10-01T16:00:00.000Z', 'Salesforce',
    'ACME Industries Manufacturing Industrial',
    '["GB999888777","IE9876543210"]',
    '[{"type":"Main","street":"Industrial Park 999","city":"Manchester","country":"GB"},{"type":"Shipping","street":"Warehouse District 555","city":"Liverpool","country":"GB"}]',
    'MERCHOWN,MARKETPLACE'
),
(
    'ep4', 'BP100004', 'French Distribution SA', 'Customer', 'Active',
    '{"name1":"French Distribution SA","street":"Rue de Commerce","streetNumber":"25","city":"Paris","postalCode":"75001","country":"FR"}',
    'FR12345678901', 'FR',
    '2023-08-05T12:30:00.000Z', '2024-09-25T09:15:00.000Z', 'Salesforce',
    'French Distribution France Commerce',
    '["FR12345678901"]',
    '[{"type":"Main","street":"Rue de Commerce 25","city":"Paris","country":"FR"}]',
    'MARKETPLACE'
),
(
    'ep5', 'BP100005', 'Nordic Services AB', 'Supplier', 'Blocked',
    '{"name1":"Nordic Services AB","street":"Storgatan","streetNumber":"88","city":"Stockholm","postalCode":"11122","country":"SE"}',
    'SE556677889901', 'SE',
    '2022-12-01T08:45:00.000Z', '2024-07-15T13:20:00.000Z', 'Coupa',
    'Nordic Services Sweden Scandinavia',
    '["SE556677889901","NO123456789MVA"]',
    '[{"type":"Main","street":"Storgatan 88","city":"Stockholm","country":"SE"}]',
    'NONMERCH'
);

-- Sample duplicate scenario: Create a test request that will have established VAT ID duplicates
INSERT INTO mdm_db_BusinessPartnerRequests (
    ID, requestNumber, entityType, requestType, sourceSystem, status,
    requesterId, requesterName, requesterEmail,
    partnerName, searchTerm, partnerRole, businessChannels,
    coupaInternalNo, paymentTerms, paymentMethod, reconAccount,
    aebComplianceStatus, viesValidationStatus,
    kycCompleted, comments
) VALUES (
    'req2', 'MDM-20241012-0002', 'Supplier', 'Create', 'Coupa', 'Draft',
    'carol', 'Carol Williams', 'carol@company.com',
    'Global Tech Solutions Ltd', 'GLOBAL', 'Supplier', 'NONMERCH',
    'COUPA-67890', 'NET15', 'BankTransfer', '2000000',
    'NotChecked', 'NotChecked',
    0, 'Test request that will trigger established VAT ID duplicate check'
);

-- Add address for the duplicate test request (US established address)
INSERT INTO mdm_db_PartnerAddresses (
    ID, request_ID, addressType, name1, street, streetNumber,
    city, postalCode, region, country_code, isDefault
) VALUES (
    'addr2', 'req2', 'Main', 'Global Tech Solutions Ltd', 'Tech Boulevard', '789',
    'San Francisco', '94105', 'CA', 'US', 1
);

-- Add VAT ID that matches existing partner (will trigger duplicate)
INSERT INTO mdm_db_PartnerVatIds (
    ID, request_ID, country_code, vatNumber, vatType, validationStatus, isDefault
) VALUES (
    'vat2', 'req2', 'US', '987654321', 'Standard', 'NotChecked', 1
);
using mdm.db as db from '../db/data-model';

service MDMService @(path:'/mdm', requires: 'authenticated-user') {

  // Main Business Partner Request Entity
  @odata.draft.enabled

  @cds.redirection.target
  @restrict: [
    { grant: ['READ'], to: ['BusinessUser', 'MDMApprover', 'SystemOwner'] },
    { grant: ['CREATE', 'UPDATE'], to: ['BusinessUser', 'MDMApprover'] },
    { grant: ['DELETE'], to: ['MDMApprover'] }
  ]
  entity BusinessPartnerRequests as projection on db.BusinessPartnerRequests actions {
    // Custom actions for approval workflow
    action submitForApproval() returns String;
    action performComplianceCheck() returns ComplianceCheckResult;
    action checkEstablishedVatDuplicates() returns array of EstablishedVatDuplicateResult;
    action approveRequest(comments: String) returns String;
    action rejectRequest(reason: String) returns String;
    action mergeWithExistingPartner(
      existingBpNumber: String,
      mergeComments: String
    ) returns String;
    action createNewPartner(comments: String) returns String;
    action checkDuplicates() returns array of DuplicateResult;
    action uploadDocument(
      fileName: String,
      fileType: String,
      documentType: String,
      base64Content: String
    ) returns String;
  };

  // Specialized View for Coupa App
  @odata.draft.enabled
  @restrict: [
    { grant: ['READ', 'CREATE', 'UPDATE'], to: ['BusinessUser', 'MDMApprover'] }
  ]
  entity CoupaRequests as projection on db.BusinessPartnerRequests {
    *
  } where sourceSystem = 'Coupa';

  // Specialized View for Salesforce App
  @odata.draft.bypass
  @restrict: [
    { grant: ['READ', 'CREATE', 'UPDATE'], to: ['BusinessUser', 'MDMApprover'] }
  ]
  entity SalesforceRequests as projection on db.BusinessPartnerRequests {
    *
  } where sourceSystem = 'Salesforce';

  // Specialized View for PI App
  @odata.draft.bypass
  @restrict: [
    { grant: ['READ', 'CREATE', 'UPDATE'], to: ['SystemOwner', 'MDMApprover'] }
  ]
  entity PIRequests as projection on db.BusinessPartnerRequests {
    *
  } where sourceSystem = 'PI';

  // Address Management
  @restrict: [
    { grant: ['READ'], to: ['BusinessUser', 'MDMApprover', 'SystemOwner'] },
    { grant: ['CREATE', 'UPDATE'], to: ['BusinessUser', 'MDMApprover'] },
    { grant: ['DELETE'], to: ['MDMApprover'] }
  ]
  entity PartnerAddresses as projection on db.PartnerAddresses;

  // Email Management
  @restrict: [
    { grant: ['READ'], to: ['BusinessUser', 'MDMApprover', 'SystemOwner'] },
    { grant: ['CREATE', 'UPDATE'], to: ['BusinessUser', 'MDMApprover'] },
    { grant: ['DELETE'], to: ['MDMApprover'] }
  ]
  entity PartnerEmails as projection on db.PartnerEmails;

  // Bank Management
  @restrict: [
    { grant: ['READ'], to: ['BusinessUser', 'MDMApprover', 'SystemOwner'] },
    { grant: ['CREATE', 'UPDATE'], to: ['BusinessUser', 'MDMApprover'] },
    { grant: ['DELETE'], to: ['MDMApprover'] }
  ]
  entity PartnerBanks as projection on db.PartnerBanks;

  // VAT ID Management
  @restrict: [
    { grant: ['READ'], to: ['BusinessUser', 'MDMApprover', 'SystemOwner'] },
    { grant: ['CREATE', 'UPDATE'], to: ['BusinessUser', 'MDMApprover'] },
    { grant: ['DELETE'], to: ['MDMApprover'] }
  ]
  entity PartnerVatIds as projection on db.PartnerVatIds actions {
    action validateVatId() returns VatValidationResult;
  };

  // Attachment Management
  @restrict: [
    { grant: ['READ'], to: ['BusinessUser', 'MDMApprover', 'SystemOwner'] },
    { grant: ['CREATE', 'UPDATE'], to: ['BusinessUser', 'MDMApprover'] },
    { grant: ['DELETE'], to: ['MDMApprover'] }
  ]
  entity RequestAttachments as projection on db.RequestAttachments;

  // Approval History
  @readonly
  @restrict: [
    { grant: ['READ'], to: ['BusinessUser', 'MDMApprover', 'SystemOwner'] }
  ]
  entity ApprovalHistory as projection on db.ApprovalHistory;

  // Duplicate Check Results
  @readonly
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] }
  ]
  entity DuplicateChecks as projection on db.DuplicateChecks;

  // Change Notifications for Satellite Systems
  @restrict: [
    { grant: ['READ'], to: ['SystemOwner', 'MDMApprover'] },
    { grant: ['CREATE', 'UPDATE'], to: ['MDMApprover'] },
    { grant: ['DELETE'], to: ['MDMApprover'] }
  ]
  entity ChangeNotifications as projection on db.ChangeNotifications {
    *,
    acknowledgments : redirected to NotificationAcknowledgments
  } actions {
    action acknowledgeNotification(
      comments: String,
      systemOwnerUserId: String,
      targetSystem: String
    ) returns String;
    action sendNotifications() returns String;
  };

  // Notification Acknowledgments
  @restrict: [
    { grant: ['READ'], to: ['SystemOwner', 'MDMApprover'] },
    { grant: ['CREATE', 'UPDATE'], to: ['SystemOwner'] }
  ]
  entity NotificationAcknowledgments as projection on db.NotificationAcknowledgments;

  // Configuration and Master Data
  @restrict: [
    { grant: ['READ'], to: ['BusinessUser', 'MDMApprover', 'SystemOwner'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['MDMApprover'] }
  ]
  entity BusinessChannels as projection on db.BusinessChannels;

  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['MDMApprover'] }
  ]
  entity SystemConfiguration as projection on db.SystemConfiguration;

  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['MDMApprover'] }
  ]
  entity WorkflowSteps as projection on db.WorkflowSteps;

  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['MDMApprover'] }
  ]
  entity UserRoles as projection on db.UserRoles;

  // Existing Partners for Duplicate Checking
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] },
    { grant: ['CREATE', 'UPDATE', 'DELETE'], to: ['MDMApprover'] }
  ]
  entity ExistingPartners as projection on db.ExistingPartners;

  // SAP Business Partner API Integration Entities
  @readonly
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] }
  ]
  entity A_BusinessPartner as projection on db.A_BusinessPartner {
    *,
    addresses : redirected to A_BusinessPartnerAddress,
    roles : redirected to A_BusinessPartnerRole,
    taxNumbers : redirected to A_BusinessPartnerTaxNumber,
    banks : redirected to A_BusinessPartnerBank,
    suppliers : redirected to A_Supplier,
    customers : redirected to A_Customer,
    contacts : redirected to A_BusinessPartnerContact
  };

  @readonly
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] }
  ]
  entity A_BusinessPartnerAddress as projection on db.A_BusinessPartnerAddress;

  @readonly
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] }
  ]
  entity A_BusinessPartnerRole as projection on db.A_BusinessPartnerRole;

  @readonly
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] }
  ]
  entity A_BusinessPartnerTaxNumber as projection on db.A_BusinessPartnerTaxNumber;

  @readonly
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] }
  ]
  entity A_BusinessPartnerBank as projection on db.A_BusinessPartnerBank;

  @readonly
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] }
  ]
  entity A_BusinessPartnerContact as projection on db.A_BusinessPartnerContact;

  @readonly
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] }
  ]
  entity A_Supplier as projection on db.A_Supplier;

  @readonly
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] }
  ]
  entity A_Customer as projection on db.A_Customer;

  // Integration Endpoints for External Systems
  @readonly
  entity IntegrationEndpoints {
    key endpoint : String(100);
    method : String(10);
    description : String(200);
    samplePayload : String(2000);
  };

  // Views for different user roles
  @readonly
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover'] }
  ]
  view PendingApprovals as select from db.BusinessPartnerRequests {
    *
  } where status in ('Submitted', 'InReview', 'ComplianceCheck');

  @readonly
  @restrict: [
    { grant: ['READ'], to: ['BusinessUser', 'MDMApprover', 'SystemOwner'] }
  ]
  view MyRequests as select from db.BusinessPartnerRequests {
    *
  } where requesterId = $user;

  @readonly
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] }
  ]
  view RecentlyApproved as select from db.BusinessPartnerRequests {
    *
  } where status = 'Approved' and approvedAt > $now - 30; // Last 30 days

  // Dashboard Views
  @readonly
  @restrict: [
    { grant: ['READ'], to: ['MDMApprover', 'SystemOwner'] }
  ]
  view ApprovalMetrics as select from db.BusinessPartnerRequests {
    key status,
    key sourceSystem,
    count(*) as requestCount : Integer,
    avg(
      case
        when approvedAt is not null and createdAt is not null
        then 1  // Simplified - would use proper date diff in real implementation
        else null
      end
    ) as avgProcessingDays : Decimal(10,2)
  } group by status, sourceSystem;

  // Functions for business logic
  function getComplianceStatus(requestId: UUID) returns ComplianceCheckResult;
  function validateBusinessPartner(requestId: UUID) returns ValidationResult;
  function searchDuplicates(
    partnerName: String,
    vatIds: array of String,
    threshold: Decimal
  ) returns array of DuplicateResult;

  // Types for structured returns
  type ComplianceCheckResult {
    aebStatus: String;
    aebDetails: String;
    viesStatus: String;
    viesDetails: String;
    overallStatus: String;
    checkTimestamp: DateTime;
  };

  type VatValidationResult {
    isValid: Boolean;
    vatNumber: String;
    country: String;
    companyName: String;
    companyAddress: String;
    validationDate: DateTime;
    errorMessage: String;
  };

  type DuplicateResult {
    bpNumber: String;
    bpName: String;
    matchScore: Decimal;
    matchType: String;
    matchDetails: String;
  };

  type EstablishedVatDuplicateResult {
    bpNumber: String;
    bpName: String;
    partnerType: String;
    status: String;
    establishedVatId: String;
    establishedCountry: String;
    establishedAddress: String;
    lastUpdated: DateTime;
    sourceSystem: String;
    businessChannels: String;
    canMerge: Boolean;
    mergeRecommendation: String;
  };

  type ValidationResult {
    isValid: Boolean;
    errors: array of ValidationError;
    warnings: array of ValidationWarning;
  };

  type ValidationError {
    field: String;
    message: String;
    severity: String;
  };

  type ValidationWarning {
    field: String;
    message: String;
    recommendation: String;
  };
}
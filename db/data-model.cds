namespace mdm.db;

using { managed, cuid, Country, Currency } from '@sap/cds/common';

// SAP Business Partner API Aligned Entities
// Following API_BUSINESS_PARTNER specification

// Business Partner Header - Core entity following SAP standard
entity A_BusinessPartner : cuid, managed {
  BusinessPartner       : String(10) @readonly; // SAP BP Number
  Customer              : String(10);
  Supplier              : String(10);
  AcademicTitle         : String(4);
  AuthorizationGroup    : String(4);
  BusinessPartnerCategory : String(1); // 1=Person, 2=Organization, 3=Group
  BusinessPartnerFullName : String(81);
  BusinessPartnerGrouping : String(4);
  BusinessPartnerName   : String(81);
  BusinessPartnerUUID   : UUID;
  CorrespondenceLanguage : String(2);
  CreatedByUser         : String(12);
  CreationDate          : Date;
  CreationTime          : Time;
  FirstName             : String(40);
  FormOfAddress         : String(4);
  Industry              : String(10);
  InternationalLocationNumber1 : String(7);
  InternationalLocationNumber2 : String(5);
  IsFemale              : Boolean;
  IsMale                : Boolean;
  IsNaturalPerson       : String(1);
  IsSexUnknown          : Boolean;
  GenderCodeName        : String(1);
  Language              : String(2);
  LastChangeDate        : Date;
  LastChangeTime        : Time;
  LastChangedByUser     : String(12);
  LastName              : String(40);
  LegalForm             : String(2);
  OrganizationBPName1   : String(40);
  OrganizationBPName2   : String(40);
  OrganizationBPName3   : String(40);
  OrganizationBPName4   : String(40);
  OrganizationFoundationDate : Date;
  OrganizationLiquidationDate : Date;
  SearchTerm1           : String(20);
  SearchTerm2           : String(20);
  AdditionalLastName    : String(40);
  BirthDate             : Date;
  BusinessPartnerBirthplaceName : String(40);
  BusinessPartnerIsBlocked : Boolean;
  BusinessPartnerType   : String(4);
  ETag                  : String;
  GroupBusinessPartnerName1 : String(40);
  GroupBusinessPartnerName2 : String(40);
  IndependentAddressID  : String(10);
  InternationalLocationNumber3 : String(1);
  MiddleName            : String(40);
  NameCountry           : String(3);
  NameFormat            : String(2);
  PersonFullName        : String(80);
  PersonNumber          : String(10);
  IsMarkedForArchiving  : Boolean;
  BusinessPartnerIDByExtSystem : String(20);
  BusinessPartnerPrintFormat : String(1);
  BusinessPartnerOccupation : String(4);
  BusPartMaritalStatus  : String(1);
  BusPartNationality    : String(3);
  BusinessPartnerBirthName : String(40);
  BusinessPartnerSupplementName : String(4);
  NaturalPersonEmployerName : String(35);
  LastNamePrefix        : String(4);
  LastNameSecondPrefix  : String(4);
  Initials              : String(10);
  IsStandardBusinessPartner : Boolean;

  // Associations to other entities
  addresses             : Composition of many A_BusinessPartnerAddress on addresses.BusinessPartner = BusinessPartner;
  roles                 : Composition of many A_BusinessPartnerRole on roles.BusinessPartner = BusinessPartner;
  taxNumbers            : Composition of many A_BusinessPartnerTaxNumber on taxNumbers.BusinessPartner = BusinessPartner;
  banks                 : Composition of many A_BusinessPartnerBank on banks.BusinessPartner = BusinessPartner;
  suppliers             : Composition of many A_Supplier on suppliers.Supplier = Supplier;
  customers             : Composition of many A_Customer on customers.Customer = Customer;
  contacts              : Composition of many A_BusinessPartnerContact on contacts.BusinessPartner = BusinessPartner;
}

// Business Partner Address - following SAP API structure
entity A_BusinessPartnerAddress : cuid {
  BusinessPartner       : String(10);
  AddressID             : String(10);
  ValidityStartDate     : Date;
  ValidityEndDate       : Date;
  AuthorizationGroup    : String(4);
  AddressUUID           : UUID;
  AdditionalStreetPrefixName : String(40);
  AdditionalStreetSuffixName : String(40);
  AddressTimeZone       : String(6);
  CareOfName            : String(40);
  CityCode              : String(12);
  CityName              : String(40);
  CompanyPostalCode     : String(10);
  Country               : String(3);
  County                : String(40);
  DeliveryServiceNumber : String(10);
  DeliveryServiceTypeCode : String(4);
  District              : String(40);
  FormOfAddress         : String(4);
  FullName              : String(80);
  HomeCityName          : String(40);
  HouseNumber           : String(10);
  HouseNumberSupplementText : String(10);
  Language              : String(2);
  POBox                 : String(10);
  POBoxDeviatingCityName : String(40);
  POBoxDeviatingCountry : String(3);
  POBoxDeviatingRegion  : String(3);
  POBoxIsWithoutNumber  : Boolean;
  POBoxLobbyName        : String(40);
  POBoxPostalCode       : String(10);
  Person                : String(10);
  PostalCode            : String(10);
  PrfrdCommMediumType   : String(3);
  Region                : String(3);
  StreetName            : String(60);
  StreetPrefixName      : String(40);
  StreetSuffixName      : String(40);
  TaxJurisdiction       : String(15);
  TransportZone         : String(10);
  AddressIDByExternalSystem : String(20);
  CountyCode            : String(8);
  TownshipCode          : String(8);
  TownshipName          : String(40);
}

// Supplier Entity
entity A_Supplier : cuid {
  Supplier              : String(10);
  AlternativePayeeAccountNumber : String(10);
  AuthorizationGroup    : String(4);
  BusinessPartner       : String(10);
  CreatedByUser         : String(12);
  CreationDate          : Date;
  CustomerIsReleased    : Boolean;
  NaturalPerson         : String(10);
  PaymentIsBlockedForSupplier : Boolean;
  PostingIsBlocked      : Boolean;
  PurchasingIsBlocked   : Boolean;
  SupplierAccountGroup  : String(4);
  SupplierFullName      : String(80);
  SupplierName          : String(35);
  VATRegistration       : String(20);
  BirthDate             : Date;
  ConcatenatedInternationalLocNo : String(20);
  DeletionIndicator     : Boolean;
  FiscalAddress         : String(10);
  Industry              : String(10);
  InternationalLocationNumber1 : String(7);
  InternationalLocationNumber2 : String(5);
  InternationalLocationNumber3 : String(1);
  IsNaturalPerson       : String(1);
  PaymentReason         : String(4);
  ResponsibleType       : String(2);
  SuplrQltyInProcmtCertfnValidTo : Date;
  SuplrQualityManagementSystem : String(4);
  SupplierCorporateGroup : String(10);
  SupplierProcurementBlock : String(2);
  TaxNumber1            : String(16);
  TaxNumber2            : String(11);
  TaxNumber3            : String(18);
  TaxNumber4            : String(18);
  TaxNumber5            : String(60);
  TaxNumberResponsible  : String(18);
  TaxNumberType         : String(2);
  VATLiability          : Boolean;
  VATRegistrationCountry : String(3);
}

// Customer Entity
entity A_Customer : cuid {
  Customer              : String(10);
  AuthorizationGroup    : String(4);
  BillingIsBlockedForCustomer : String(2);
  CreatedByUser         : String(12);
  CreationDate          : Date;
  CustomerAccountGroup  : String(4);
  CustomerClassification : String(2);
  CustomerFullName      : String(80);
  CustomerName          : String(35);
  DeliveryIsBlocked     : String(2);
  NFPartnerIsNaturalPerson : String(1);
  OrderIsBlockedForCustomer : String(2);
  PostingIsBlocked      : Boolean;
  Supplier              : String(10);
  CustomerCorporateGroup : String(10);
  FiscalAddress         : String(10);
  Industry              : String(10);
  TaxNumber1            : String(16);
  TaxNumber2            : String(11);
  TaxNumber3            : String(18);
  TaxNumber4            : String(18);
  TaxNumber5            : String(60);
  TaxNumberType         : String(2);
  VATRegistration       : String(20);
  DeletionIndicator     : Boolean;
  ExpressTrainStationName : String(25);
  TrainStationName      : String(25);
  CityCode              : String(4);
  County                : String(3);
}

// Business Partner Role
entity A_BusinessPartnerRole : cuid {
  BusinessPartner       : String(10);
  BusinessPartnerRole   : String(6);
  ValidFrom             : Date;
  ValidTo               : Date;
  AuthorizationGroup    : String(4);
}

// Business Partner Tax Number
entity A_BusinessPartnerTaxNumber : cuid {
  BusinessPartner       : String(10);
  BPTaxType             : String(4);
  BPTaxNumber           : String(20);
  BPTaxLongNumber       : String(60);
  AuthorizationGroup    : String(4);
}

// Business Partner Bank
entity A_BusinessPartnerBank : cuid {
  BusinessPartner       : String(10);
  BankIdentification    : String(4);
  BankCountryKey        : String(3);
  BankName              : String(60);
  BankNumber            : String(15);
  SWIFTCode             : String(11);
  BankControlKey        : String(2);
  BankAccountHolderName : String(60);
  BankAccountName       : String(40);
  ValidityStartDate     : Date;
  ValidityEndDate       : Date;
  IBAN                  : String(34);
  IBANValidityStartDate : Date;
  BankAccount           : String(18);
  BankAccountReferenceText : String(20);
  CollectionAuthInd     : Boolean;
  CityName              : String(35);
  AuthorizationGroup    : String(4);
}

// Business Partner Contact
entity A_BusinessPartnerContact : cuid {
  BusinessPartner       : String(10); // Added for association
  RelationshipNumber    : String(12);
  BusinessPartnerCompany : String(10);
  BusinessPartnerPerson : String(10);
  ValidityEndDate       : Date;
  ValidityStartDate     : Date;
  IsStandardRelationship : Boolean;
  RelationshipCategory  : String(6);
}

// MDM Enhancement - Business Partner Request Wrapper
// Enhanced according to ENHANCED_FEATURES.md requirements
entity BusinessPartnerRequests : cuid, managed {
  requestNumber     : String(20) @readonly;

  // Enhanced entity and request types as per requirements
  entityType        : String(20) @default: 'Supplier';
  requestType       : String(20) @default: 'Create';
  sourceSystem      : String(20) @default: 'Manual';

  // Enhanced status including DuplicateReview as per ENHANCED_FEATURES.md
  status            : String(20) @default: 'Draft';
  statusCriticality : Integer @default: 0; // 0=None, 1=Success, 2=Warning, 3=Error

  // Link to SAP Business Partner API entities - removed associations to fix column issues
  // businessPartner   : Association to A_BusinessPartner;
  // targetSupplier    : Association to A_Supplier;
  // targetCustomer    : Association to A_Customer;

  // For Update requests - existing partner information (ENHANCED_FEATURES.md requirement)
  existingBpNumber  : String(20); // SAP BP number if updating existing partner
  existingBpName    : String(100); // Name of existing partner for reference
  changeDescription : String(500); // Description of what needs to be updated

  // Requester Information
  requesterId       : String(100);
  requesterName     : String(100);
  requesterEmail    : String(100);

  // Business Partner Basic Info - Enhanced fields as per ENHANCED_FEATURES.md
  // Main fields in the front end (from requirements):
  // 1) System - covered by sourceSystem
  // 2) Internal ID - covered by coupaInternalNo, salesforceId, piId
  // 3) Name
  partnerName       : String(100) @mandatory;
  searchTerm        : String(20);
  partnerRole       : String(20) @default: 'Supplier';
  businessChannels  : String(200); // Industry codes for business channels

  // External System IDs (Internal IDs for different systems)
  coupaInternalNo   : String(50);
  salesforceId      : String(50);
  piId              : String(50);

  // Coupa Specific Fields
  vendorClassification : String(20); // Strategic, Preferred, Standard
  purchaseCategories   : String(500); // Comma-separated list
  spendThreshold       : Decimal(15,2);
  procurementContact   : String(100);
  // businessChannels already exists

  // Salesforce Specific Fields
  accountType          : String(20); // Customer, Prospect, Partner
  industry             : String(50);
  territory            : String(50);
  parentAccount        : String(50);
  opportunityIds       : String(500); // Comma-separated list
  salesOwner           : String(100);
  revenueband          : String(20);

  // Purchasing Interface (PI) Specific Fields
  systemMapping        : String(50);
  messageFormat        : String(10); // IDoc, XML, JSON
  routingRules         : String(500);
  transformationRules  : String(50);
  systemOwner          : String(100);
  businessDomain       : String(50);

  // Enhanced Payment Information (vendor specific substructure from requirements)
  paymentTerms      : String(10);        // Payment terms
  paymentMethod     : String(20) @default: 'BankTransfer'; // Payment method
  currency_code     : String(3);         // Currency code (e.g., USD, EUR, GBP)
  companyCode       : String(4);         // Company code
  withholdingTax    : String(20);        // Withholding Tax
  reconAccount      : String(20);        // Recon Account

  // Customer specific fields
  customerReconAccount : String(20);     // Customer Recon account Number
  customerCompanyCode  : String(4);      // Customer company code
  customerPaymentTerms : String(10);     // Customer Payment terms

  // Note: Contract Account Specific fields omitted as per requirements
  // "Contract Account Specific doesnt exists in api and so there is no need for mapping now"

  // Communication language (from requirements)
  communicationLanguage : String(2);

  // Compliance Status
  aebComplianceStatus    : String(20) @default: 'NotChecked';
  aebComplianceDetails   : String(500);
  viesValidationStatus   : String(20) @default: 'NotChecked';
  viesValidationDetails  : String(500);

  // KYC Information
  kycCompleted      : Boolean @default: false;
  kycCompletedBy    : String(100);
  kycCompletedAt    : DateTime;
  kycDocuments      : String(1000); // JSON string of document references

  // Approval Information
  approvedBy        : String(100);
  approvedAt        : DateTime;
  rejectionReason   : String(500);
  sapBpNumber       : String(20);

  // Comments and Notes
  comments          : String(1000);
  internalNotes     : String(1000);

  // Associations - Enhanced for all required fields
  addresses         : Composition of many PartnerAddresses on addresses.request = $self;
  emails            : Composition of many PartnerEmails on emails.request = $self;
  banks             : Composition of many PartnerBanks on banks.request = $self;
  vatIds            : Composition of many PartnerVatIds on vatIds.request = $self;
  attachments       : Composition of many RequestAttachments on attachments.request = $self;
  approvalHistory   : Composition of many ApprovalHistory on approvalHistory.request = $self;
  duplicateChecks   : Composition of many DuplicateChecks on duplicateChecks.request = $self;
}

// Partner Address Information (4. address from requirements)
entity PartnerAddresses : cuid {
  request           : Association to BusinessPartnerRequests;
  addressType       : String(20) @default: 'Main';
  name1             : String(100);
  name2             : String(100);
  name3             : String(100);
  name4             : String(100);
  street            : String(100);
  streetNumber      : String(20);
  city              : String(100);
  postalCode        : String(20);
  region            : String(20);
  country_code      : String(2);  // Country code (e.g., US, DE, FR)
  timeZone          : String(10);
  language          : String(2);
  isDefault         : Boolean @default: false;
  isEstablished     : Boolean @default: false; // Enhanced for established address identification
}

// Partner Email Information (8. all email ID's from requirements)
entity PartnerEmails : cuid {
  request           : Association to BusinessPartnerRequests;
  emailType         : String(20) @default: 'Primary';
  emailAddress      : String(100) @mandatory;
  notes             : String(200); // VN for AP team, CU for AR team
  isDefault         : Boolean @default: false;
}

// Partner Bank Information (7. All bank accounts from requirements)
entity PartnerBanks : cuid {
  request           : Association to BusinessPartnerRequests;
  bankCountry_code  : String(2);  // Bank country code
  bankKey           : String(20);
  bankName          : String(100);
  accountHolder     : String(100);
  accountNumber     : String(50) @mandatory;
  iban              : String(50);
  swiftCode         : String(20);
  currency_code     : String(3);  // Currency code
  bankReference     : String(50);
  isDefault         : Boolean @default: false;
}

// Partner VAT ID Information (5. Established VAT ID and 6. List of all VAT ID's from requirements)
entity PartnerVatIds : cuid {
  request           : Association to BusinessPartnerRequests;
  country_code      : String(2) @mandatory;  // Country code
  vatNumber         : String(50) @mandatory;
  vatType           : String(20) @default: 'Standard';
  validationStatus  : String(20) @default: 'NotChecked';
  validationDate    : DateTime;
  validationDetails : String(500);
  isDefault         : Boolean @default: false;
  isEstablished     : Boolean @default: false; // Enhanced for established VAT ID identification
}

// Request Attachments
entity RequestAttachments : cuid, managed {
  request           : Association to BusinessPartnerRequests;
  fileName          : String(255) @mandatory;
  fileType          : String(50);
  fileSize          : Integer;
  filePath          : String(500);
  documentType      : String(50) @default: 'Other';
  description       : String(200);
}

// Approval History - Enhanced for duplicate checking workflow
entity ApprovalHistory : cuid, managed {
  request           : Association to BusinessPartnerRequests;
  approverUserId    : String(100);
  approverName      : String(100);
  action            : String(50);
  previousStatus    : String(20);
  newStatus         : String(20);
  comments          : String(500);
  systemGenerated   : Boolean @default: false;
}

// Enhanced Duplicate Check Results (ENHANCED_FEATURES.md requirements)
entity DuplicateChecks : cuid, managed {
  request           : Association to BusinessPartnerRequests;
  matchType         : String(20);
  matchScore        : Decimal(5,2); // 0-100 percentage
  existingBpNumber  : String(20);
  existingBpName    : String(100);
  matchDetails      : String(500);
  reviewRequired    : Boolean @default: true;

  // Enhanced duplicate information for established VAT ID matching (ENHANCED_FEATURES.md)
  establishedVatId  : String(50); // The established VAT ID that matched
  establishedCountry: String(2);  // Country of established address
  partnerStatus     : String(20); // Status of existing partner (Active, Blocked, etc.)
  lastUpdated       : DateTime;   // When existing partner was last updated
  sourceSystem      : String(20); // Source system of existing partner
  businessChannels  : String(200); // Business channels of existing partner

  // Merge decision tracking (ENHANCED_FEATURES.md)
  mergeDecision     : String(20);
  mergeDecisionBy   : String(100); // User who made the merge decision
  mergeDecisionAt   : DateTime;
  mergeComments     : String(500);
  canMerge          : Boolean @default: true; // Whether merge is technically possible
  mergeRecommendation : String(200); // System recommendation for merge
}

// System Configuration
entity SystemConfiguration : cuid, managed {
  configKey         : String(100) @mandatory;
  configValue       : String(500);
  description       : String(200);
  isActive          : Boolean @default: true;
}

// Notification Management for Satellite Systems
entity ChangeNotifications : cuid, managed {
  bpNumber          : String(20) @mandatory;
  bpName            : String(100);
  changeType        : String(50);
  changedBySystem   : String(20);
  impactedSystems   : String(100); // Comma-separated list
  fieldsChanged     : String(500); // JSON string of changed fields
  changeDetails     : String(1000); // JSON string of before/after values
  notificationSent  : Boolean @default: false;
  notificationSentAt: DateTime;

  // Acknowledgment tracking
  acknowledgments   : Composition of many NotificationAcknowledgments on acknowledgments.notification = $self;
}

// Notification Acknowledgments
entity NotificationAcknowledgments : cuid, managed {
  notification      : Association to ChangeNotifications;
  systemOwnerUserId : String(100);
  systemOwnerName   : String(100);
  targetSystem      : String(20);
  acknowledgedAt    : DateTime;
  comments          : String(500);
}

// Master Data for Business Channels
entity BusinessChannels : cuid {
  channelCode       : String(20) @mandatory;
  channelName       : String(100) @mandatory;
  description       : String(200);
  isActive          : Boolean @default: true;
}

// Workflow Configuration
entity WorkflowSteps : cuid {
  workflowName      : String(50) @mandatory;
  stepNumber        : Integer @mandatory;
  stepName          : String(100) @mandatory;
  approverRole      : String(50);
  isParallel        : Boolean @default: false;
  isMandatory       : Boolean @default: true;
  timeoutDays       : Integer @default: 5;
}

// User Roles and Permissions
entity UserRoles : cuid {
  userId            : String(100) @mandatory;
  userName          : String(100);
  userEmail         : String(100);
  role              : String(50);
  systemAccess      : String(100); // Comma-separated list of systems
  isActive          : Boolean @default: true;
}

// SAP System Integration - Mock existing partners for duplicate checking (ENHANCED_FEATURES.md)
entity ExistingPartners : cuid {
  sapBpNumber       : String(20) @mandatory;
  partnerName       : String(100) @mandatory;
  partnerType       : String(20);
  status            : String(20) @default: 'Active';
  establishedAddress: String(500); // JSON string of established address
  establishedVatId  : String(50);  // Primary/established VAT ID
  establishedCountry: String(2);   // Country of established address
  createdAt         : DateTime;
  lastUpdated       : DateTime;
  sourceSystem      : String(20);  // Original source system

  // Additional partner details for comparison
  searchTerms       : String(200); // Search terms for fuzzy matching
  allVatIds         : String(500);  // JSON array of all VAT IDs
  allAddresses      : String(2000); // JSON array of all addresses
  businessChannels  : String(200);
}
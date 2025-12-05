# MDM UI Applications - Complete Requirements Specification

> **Source**: MDM app.pdf - Solution Blueprint for MDM Workstream  
> **Last Updated**: 2025-12-01  
> **Status**: Comprehensive field-level requirements with MDM App workflow visualization

## Table of Contents

1. [Application Overview](#application-overview)
2. [Persona Definitions](#persona-definitions)
3. [Application 1: Coupa Supplier Requests](#application-1-coupa-supplier-requests)
4. [Application 2: Salesforce Customer Requests](#application-2-salesforce-customer-requests)
5. [Application 3: PI Supplier Requests](#application-3-pi-supplier-requests)
6. [Application 4: MDM Approval App](#application-4-mdm-approval-app)
7. [Application 5: Satellite Notification App](#application-5-satellite-notification-app)
8. [Application 6: Unified Request Creation](#application-6-unified-request-creation)
9. [Data Field Specifications](#data-field-specifications)
10. [Validation Rules](#validation-rules)
11. [Workflow States](#workflow-states)
12. [API Specifications](#api-specifications)
13. [Implementation Progress](#implementation-progress)

---

## Application Overview

The MDM Request Hub consists of **6 distinct Fiori Elements applications** serving **3 user personas**:

| App ID | Application Name | Target Persona | Implementation Status |
|--------|-----------------|----------------|----------------------|
| 1 | Coupa Supplier Requests | Persona 1 (Coupa Owner) | ✅ Foundation & Change Request UI Complete |
| 2 | Salesforce Customer Requests | Persona 1 (Salesforce Owner) | ❌ Not Implemented |
| 3 | PI Supplier Requests | Persona 1 (PI Owner) | ❌ Not Implemented |
| 4 | MDM Approval App | Persona 2 (MDM Team) | ⚠️ Partially Implemented |
| 5 | Satellite Notification App | Persona 3 (Acknowledging Owner) | ⚠️ Entity Only |
| 6 | Unified Request Creation | Persona 1 (All Owners) | ❌ Not Implemented |

---

## Persona Definitions

### Persona 1: Requesting Satellite Owner

**Description**: Business operational users from Coupa, PI, or Salesforce who initiate Business Partner requests.

**Responsibilities**:
- ✅ Initiate new Business Partner creation requests
- ✅ Search for existing Business Partners to prevent duplicates
- ✅ Submit change requests for existing Business Partners
- ✅ Track status of submitted requests
- ✅ Upload supporting documentation (VAT certificates, bank confirmations, trade registers)
- ✅ Receive notifications on request status changes

**Key Interaction**: Simplified, system-specific forms showing only relevant fields for their context.

**Authorization**: 
- Scope: `BusinessUser`
- Access: Create/Read own requests, Upload documents for own requests

### Persona 2: MDM Team

**Description**: Central data governance team maintaining master data quality across the enterprise.

**Responsibilities**:
- ✅ Review all incoming requests from all satellite systems (NEW status)
- ✅ Run compliance checks (VIES, AEB Sanctions, SAP Duplicates)
- ✅ Validate data against corporate standards
- ✅ Manage central documentation repository
- ✅ Approve valid requests → triggers S/4HANA integration
- ✅ Reject incomplete/incorrect requests with mandatory feedback
- ✅ Handle integration errors
- ✅ Mark requests as completed after successful integration

**Key Interaction**: Comprehensive "Inbox" view with advanced filtering, detailed view of all fields, change logs, compliance results, and document access.

**Authorization**:
- Scope: `MDMApprover`
- Access: Full CRUD on all requests, All documents, All compliance checks

### Persona 3: Acknowledging Satellite Owner

**Description**: Business owners of satellite systems who share Business Partners with other systems.

**Example**: If a BP is used by both Salesforce and Coupa, the Coupa admin is the "Acknowledging Owner" when Salesforce changes that BP's data.

**Responsibilities**:
- ✅ Receive notifications when shared data is changed by another department
- ✅ Review changes to ensure no negative impact on their system
- ✅ Acknowledge changes to confirm awareness
- ✅ View attached documentation relevant to the change

**Key Interaction**: Read-only view highlighting exact changes (Old vs New), with simple "Acknowledge" action.

**Authorization**:
- Scope: `SystemOwner`
- Access: Read notifications for own system, Acknowledge notifications

---

## Application 1: Coupa Supplier Requests

### Purpose
Streamlined interface for Coupa system owners to create and track supplier requests for **indirect procurement**.

### Current Implementation Status

#### ✅ Implemented Features (2025-11-26)

1. **Value List Configuration**
   - ✅ RequestTypes entity (Create, Change)
   - ✅ SourceSystems entity (PI, Coupa, Salesforce with SAP mapping)
   - ✅ OverallStatuses entity (NEW, PENDING_INTEGRATION, IN_PROCESS, COMPLETED, REJECTED, ERROR)

   - ✅ PaymentTerms entity (Z001-Z090)
   - ✅ PaymentMethods entity (BankTransfer, Check, Wire, ACH, CreditCard)
   - ✅ RevenueStreams entity (Marketplace, FPAY, Subscription, Licensing)
   - ✅ BillingCycles entity (Monthly, Quarterly, Semi-Annual, Annual)

2. **Enhanced Data Model**
   - ✅ Compliance fields (aebStatus, viesStatus, duplicateCheckResults - readonly for MDM)
   - ✅ Integration status tracking:
     - `integrationSuiteStatus`: Integration Suite send status
     - `sapInitialStatus`: S/4HANA create/update status
     - `satelliteStatus`: Source system sync status
     - `sapIdUpdateStatus`: S/4HANA ID update status (for creates)
   - ✅ Change tracking (`changePayload` JSON field for field diffs)

3. **Auto-Population Logic**
   - ✅ `sourceSystem` auto-set to "Coupa" (readonly, greyed out)
   - ✅ `coupaInternalNo` auto-generated UUID (readonly, greyed out)
   - ✅ `requestNumber` auto-generated (readonly)

4. **UI Annotations**
   - ✅ ValueList annotations for dropdowns:
     - sourceSystem → SourceSystems
     - requestType → RequestTypes

     - paymentTerms → PaymentTerms
     - paymentMethod → PaymentMethods
   - ✅ ReadOnly annotations for system fields
   - ✅ List Report with columns: Request Number, Supplier Name, Type, Request Type, Status, Classification

5. **Service Handlers**
   - ✅ Enhanced MDM Service with ErrorHandler, InputValidator, NotificationService, CacheService
   - ✅ Compliance check actions (performComplianceCheck)
   - ✅ Approval/Rejection workflows
   - ✅ Duplicate check integration
   - ✅ Document upload capability
   - ✅ Auto-Navigation back to List Report after Save

6. **Change Request Frontend**
   - ✅ "Start Change Request" button in List Report
   - ✅ Search Dialog (Search by Name, BP Number, VAT ID, System ID)
   - ✅ Import Logic (Pre-populates draft with SAP data)
   - ✅ Auto-Navigation to Object Page in Edit Mode

#### ⚠️ Missing Critical Features

##### 1. Create Dialog with Full Form
**Required Sections**:

**A. Basic Information Section**
- **Supplier Name** (OrganizationBPName1)
  - Type: String(80)
  - Required: Yes
  - Validation: Max 80 characters, no special characters except &, -, .
  - Help Text: "Legal entity name as registered"

- **Coupa Internal Number** (coupaInternalNo)
  - Type: String(50)
  - Required: No (auto-generated UUID)
  - Read-only: Yes
  - Status: ✅ **Implemented** - auto-generates UUID on creation
  - Help Text: "Coupa system identifier"

**B. Address Section**
- **Street** (StreetName)
  - Type: String(60)
  - Required: Yes
  - Validation: Max 60 characters
  - Help Text: "Street name without house number"

- **House Number** (HouseNumber)
  - Type: String(10)
  - Required: Yes
  - Validation: Max 10 characters, alphanumeric
  - Help Text: "Building number"

- **City** (CityName)
  - Type: String(40)
  - Required: Yes
  - Validation: Max 40 characters
  - Help Text: "City name"

- **Postal Code** (PostalCode)
  - Type: String(10)
  - Required: Yes
  - Validation: Max 10 characters, country-specific format
  - Help Text: "ZIP/Postal code"

- **Country** (Country)
  - Type: String(2)
  - Required: Yes
  - Validation: ISO 2-character code (e.g., DE, US, FR)
  - Control: Dropdown (Value Help)
  - Help Text: "Country code - must align with VAT ID country"

**C. Tax Information Section**
- **VAT ID** (TaxNumber1)
  - Type: String(20)
  - Required: Yes
  - Validation: 
    - Format check based on country (e.g., DE: 9 digits, FR: 11 characters)
    - VIES validation on field exit
  - Help Text: "Tax identification number - will be validated against VIES"
  - Error Messages:
    - "VAT ID format invalid for selected country"
    - "VAT ID not found in VIES database"
    - "VAT ID country mismatch with address country"

**D. Payment Information Section**
- **Payment Terms** (PaymentTerms)
  - Type: String(4)
  - Required: Yes
  - Validation: Must be from configured list
  - Control: Dropdown
  - Status: ✅ **Dropdown configured** with Z001-Z090 terms
  - Default: Z030
  - Help Text: "Standard payment terms for this supplier"

- **Payment Method** (PaymentMethodsList)
  - Type: String(1)
  - Required: Yes
  - Validation: Valid S/4 Key
  - Control: Dropdown
  - Status: ✅ **Dropdown configured** (BankTransfer, Check, Wire, ACH, CreditCard)
  - Default: BankTransfer
  - Help Text: "Primary payment method"

- **PO Currency** (PurchaseOrderCurrency)
  - Type: String(3)
  - Required: Yes
  - Validation: ISO 4217 currency code (e.g., EUR, USD, GBP)
  - Control: Dropdown (Value Help)
  - Help Text: "Default currency for purchase orders"

**E. Bank Details Section** (Composition: 1..n)
- **Bank Country** (BankCountryKey)
  - Type: String(2)
  - Required: Yes
  - Validation: ISO 2-character code
  - Control: Dropdown
  - Help Text: "Country where bank is located"

- **Bank Account Number** (BankAccount)
  - Type: String(18)
  - Required: Yes (if no IBAN)
  - Validation: Numeric, max 18 characters
  - Help Text: "Bank account number"

- **IBAN** (IBAN)
  - Type: String(34)
  - Required: Yes (if no Bank Account)
  - Validation: 
    - IBAN checksum validation
    - Country-specific length check
    - Format: 2-letter country code + 2 check digits + up to 30 alphanumeric
  - Help Text: "International Bank Account Number"
  - Error Messages:
    - "Invalid IBAN checksum"
    - "IBAN length incorrect for country"

- **SWIFT Code** (SWIFTCode)
  - Type: String(11)
  - Required: No
  - Validation: 8 or 11 alphanumeric characters
  - Help Text: "Bank Identifier Code (BIC/SWIFT)"

- **Add Bank Account Button**: Allows multiple bank accounts
- **Remove Bank Account Button**: Removes selected bank account

**F. Email Contacts Section** (Composition: 1..n)
- **Email Type** (emailType)
  - Type: String(20)
  - Required: Yes
  - Options:
    - Primary: "Primary contact"
    - AP: "Accounts Payable"
    - Orders: "Purchase Orders"
  - Control: Dropdown

- **Email Address** (emailAddress)
  - Type: String(241)
  - Required: Yes
  - Validation: RFC 5322 email format
  - Help Text: "Valid email address"
  - Error Message: "Invalid email format"

- **Notes** (notes)
  - Type: String(255)
  - Required: No
  - Help Text: "Additional notes (e.g., VN for AP team, CU for AR team)"

- **Add Email Button**: Allows multiple email contacts
- **Remove Email Button**: Removes selected email

**G. Document Upload Section**
- **Document Type** (documentType)
  - Required: No
  - Options:
    - VAT_CERTIFICATE: "VAT Registration Certificate"
    - BANK_CONFIRMATION: "Bank Confirmation Letter"
    - TRADE_REGISTER: "Trade Register Extract"
    - KYC_DOCUMENT: "KYC Documentation"
    - OTHER: "Other Supporting Document"
  - Control: Dropdown

- **File Upload Control**
  - Accepted formats: PDF, JPG, PNG
  - Max file size: 10MB
  - Multiple files: Yes
  - Validation:
    - File type check
    - File size check
    - Virus scan (if configured)
  - Error Messages:
    - "File type not allowed"
    - "File size exceeds 10MB limit"

**Dialog Actions**:
- **Back Button** (Header)
  - Navigation: Returns to List Report
  - Behavior: Checks for unsaved changes before navigating

- **Delete Button**
  - **Visibility**: Only for requests in 'NEW' status
  - **Restriction**: Hidden for 'PENDING_INTEGRATION', 'IN_PROCESS', 'COMPLETED', 'REJECTED'
  - Behavior: Prompts for confirmation before deleting

- **Submit Button**
  - Validates all required fields
  - Runs duplicate check (optional warning)
  - Creates request with status='NEW'
  - Shows success message with Request ID
  - Closes dialog and refreshes table

- **Cancel Button**
  - Confirms if data entered
  - Closes dialog without saving

##### 3. View SAP Business Partner
- **Entry Point**: "View SAP Partner" button on List Report.
- **Flow**:
  1. Opens "Search SAP Partner" dialog.
  2. User searches by Name or BP Number.
  3. User selects a partner.
  4. System creates a temporary draft and navigates to **Object Page** (same layout as Change mode).
  5. **Restrictions**: Save, Delete, and Edit buttons are hidden via `sessionStorage` flag.
  6. Layout and sections are identical to Change Request mode.
- **Implementation**:
  - Reuses `importSAPPartner` backend action and draft creation flow.
  - Sets `sessionStorage.setItem("sap.coupa.viewMode", "true")`.
  - `ObjectPageExt` controller detects the flag and hides action buttons.
  - Creates a draft (side effect: draft remains in list if user navigates away).

### 4. Object Page (Request Details)
**Implemented Components**:
- **Search Dialog**:
  - Search by Partner Name, SAP BP Number, VAT ID, or Satellite System ID.
  - Displays results in a table with selection capability.
- **Import Logic**:
  - Fetches full SAP Business Partner data (addresses, banks, VAT IDs).
  - Creates a new draft request pre-populated with this data.
  - Sets `requestType` to 'Change'.
  - Stores original data for delta tracking.
- **Navigation**:
  - Automatically navigates to the "Create" page (Object Page) in Edit mode after selection.
  - Automatically navigates back to the List Report after saving the request.

**Missing Components**:
- **Change Tracking UI**:
  - Visual diff view (Old vs New) is not yet implemented in the Object Page.
  - `changePayload` field exists in backend but is not visualized.
- **Read-Only Fields for Existing Data**:
  - Key fields like SAP BP Number should be read-only in Change mode.
- **Visual Diff Display**:
  - Needs a dedicated section or mode to show what has changed compared to the original SAP data.

##### 3. Request Status Dashboard
**Missing Components**:
- "My Requests" view filtered by current user
- Status timeline visualization
- Notification bell icon with count
- Request detail page with full history

##### 4. Real-Time Validation
**Implemented Validations**:
- ✅ **VAT ID Validation** (MDM App Only)
  - Connected to VIES service
  - Validates format and existence
  - Hidden in Coupa App
- ✅ **AEB Sanctions Check** (MDM App Only)
  - Connected to mock AEB service
  - Checks against sanctions lists
  - Hidden in Coupa App
- ✅ **Duplicate Check** (All Apps)
  - Fuzzy matching on Name and VAT ID
  - "Check Duplicates" button visible in Coupa App
  - Displays results in dialog

##### 5. Duplicate Check Integration
**Status**: ✅ **Fully Implemented**
**Components**:
- "Check Duplicates" button in UI (Visible in Coupa App)
- Duplicate results dialog showing:
  - BP Number
  - Partner Name
  - VAT ID
  - Street
  - City
  - Country
  - Match Score (Calculated by SAP backend, ignored for UI logic)
- **Logic**:
  - Mock interface checks for full/fuzzy match on Name or VAT ID.
  - Returns list of matched business partners with all required fields.
- Backend logic with fuzzy matching

### Configurable Master Data
**Requirement**: Status, Request Type, and Source System must be configurable via background tables.

**Status**: ✅ **Fully Implemented**

**Implemented Entities**:
1. **RequestTypes**
   - Fields: `code`, `name`, `description`, `isActive`
   - Data: Create, Change
   - Usage: Populates `requestType` dropdown

2. **SourceSystems**
   - Fields: `code`, `name`, `sapIdentificationNo`, `description`, `isActive`
   - Data: PI, Coupa, Salesforce with SAP mapping
   - Usage: Populates `sourceSystem` dropdown and filters
   - Validation: Must match exactly (Case-sensitive: "Coupa", "Salesforce", "PI", "Manual")

3. **OverallStatuses**
   - Fields: `code`, `name`, `description`, `criticality`, `isActive`
   - Data: NEW, PENDING_INTEGRATION, IN_PROCESS, PENDING_ACKNOWLEDGMENT, COMPLETED, REJECTED, ERROR
   - Usage: Defines available statuses and their flow



5. **PaymentTerms**
   - Fields: `code`, `name`, `description`, `isActive`
   - Data: Z001-Z090 (7-90 day terms)
   - Usage: Payment terms dropdown

6. **PaymentMethods**
   - Fields: `code`, `name`, `description`, `isActive`
   - Data: BankTransfer, Check, Wire, ACH, CreditCard
   - Usage: Payment methods dropdown

7. **RevenueStreams**
   - Fields: `code`, `name`, `description`, `isActive`
   - Data: Marketplace, FPAY, Subscription, Licensing
   - Usage: Salesforce revenue stream configuration

8. **BillingCycles**
   - Fields: `code`, `name`, `description`, `isActive`
   - Data: Monthly, Quarterly, Semi-Annual, Annual
   - Usage: Salesforce billing cycle configuration

---

## Application 2: Salesforce Customer Requests

### Purpose
B2B customer onboarding and management for Salesforce users, supporting **Main Account / Sub-Account** structure.

### Implementation Status: ❌ **Not Implemented**

### Required Features

#### Main Account Creation (Business Partner)

**A. Basic Information**
- **Customer Name** (OrganizationBPName1)
  - Type: String(80)
  - Required: Yes
  - Validation: Max 80 characters
  - Help Text: "Legal entity name"

- **Established VAT ID** (TaxNumber1)
  - Type: String(20)
  - Required: Yes
  - Validation: VIES format check
  - Help Text: "Primary VAT identification number"

- **BP Type** (BusinessPartnerType)
  - Type: String(4)
  - Required: No
  - Options:
    - 0001: "Standard Customer"
    - 0002: "Influencer"
    - 0003: "Partner Program"
  - Control: Dropdown
  - Help Text: "Business Partner classification"

**B. Multiple Addresses** (Composition: 1..n)
Each address must have:
- Address Type (Main, Delivery, Billing, Invoicing)
- Name1, Street, House Number, City, Postal Code, Country
- **Established Address Flag**: Indicates the legal entity address (must align with VAT ID country)

**C. Bank Information Pool** (Composition: 1..n)
- Bank Country, Bank Account, IBAN, SWIFT Code
- Multiple bank accounts allowed
- At least one required

#### Sub-Account Creation (Contract Account)

**Purpose**: Create separate contract accounts for each revenue stream and delivery address combination.

**A. Sub-Account Identification**
- **Salesforce Sub-ID** (YY1_SF_SubID)
  - Type: String(50)
  - Required: No
  - Default: "NEW" for new records
  - Read-only: Yes (for updates)
  - Help Text: "Salesforce sub-account identifier"

**B. Revenue Stream Configuration**
- **Revenue Stream** (YY1_RevenueStream)
  - Type: String(20)
  - Required: Yes
  - Options (Value List - ✅ **Entity created**):
    - MARKETPLACE: "Marketplace / Partner Program"
    - AD_BUSINESS: "Ad Business"
    - MERCH_OWN: "Merchandise (Own Stock)"
    - MERCH_NON_OWN: "Merchandise (Non-Own Stock)"
    - NON_MERCH: "Non-Merchandise"
  - Note: Current implementation has Marketplace, FPAY, Subscription, Licensing
  - Control: Dropdown
  - Help Text: "Primary revenue stream for this sub-account"

**C. Billing Configuration**
- **Billing Cycle** (YY1_BillingCycle)
  - Type: String(10)
  - Required: Yes
  - Options (Value List - ✅ **Entity created**):
    - MONTHLY: "Monthly billing"
    - QUARTERLY: "Quarterly billing"
    - ANNUAL: "Annual billing"
  - Note: Current implementation has Monthly, Quarterly, Semi-Annual, Annual
  - Control: Dropdown
  - Help Text: "Billing frequency"

**D. Address and Bank References**
- **Shipping Address Reference** (AddressID)
  - Type: String(10)
  - Required: Yes
  - Control: Dropdown (from Main Account addresses)
  - Help Text: "Select delivery address from Main Account"

- **Bank Account Reference** (BankID)
  - Type: String(4)
  - Required: No
  - Control: Dropdown (from Main Account banks)
  - Help Text: "Select bank account from Main Account pool"

**E. Email Contacts** (Composition: 1..n)
- Email Type, Email Address, Notes
- Multiple contacts allowed per sub-account

#### UI Layout
- **Two-Step Wizard**:
  - Step 1: Create/Select Main Account (Business Partner)
  - Step 2: Create Sub-Account(s) (Contract Account)
- **Table View**: Shows Main Accounts with expandable Sub-Accounts
- **Actions**: Create Main Account, Add Sub-Account, Edit, Delete

---

## Application 3: PI Supplier Requests

### Purpose
Direct procurement supplier management for PI (Purchasing Interface) system users.

### Implementation Status: ❌ **Not Implemented**

### Required Features

Same field structure as **Coupa Supplier Requests** with additional:

**A. PI-Specific Identification**
- **PI Internal Number** (piInternalNo)
  - Type: String(50)
  - Required: No (auto-generated by PI)
  - Read-only: Yes
  - Help Text: "PI system identifier"

**B. Procurement Type**
- **Procurement Category**
  - Options:
    - OWN_STOCK: "Direct Procurement (Own Stock)"
    - FBAY: "FbAY (Fulfilled by About You)"
    - DROPSHIP: "Dropshipping"
  - Required: Yes
  - Help Text: "Type of procurement arrangement"

**C. Integration with Navision**
- Status indicator showing Navision sync status
- Manual sync button for Phase 1

---

## Application 4: MDM Approval App

### Purpose
Central command center for MDM team to review, validate, and approve all requests from all satellite systems.

### Current Implementation Status: ⚠️ **Partially Implemented**

#### ✅ Implemented Features
1. ✅ **Compliance Check Actions**
   - `performComplianceCheck` action implemented
   - AEB sanctions check integration ready
   - VIES validation ready
   - Duplicate check with `checkEstablishedVatDuplicates` and `checkDuplicates` actions

2. ✅ **Approval Workflow**
   - `approveRequest` action with SAP BP number generation
   - `rejectRequest` action with mandatory reason
   - Status transition validation (VALID_STATUS_TRANSITIONS)

3. ✅ **Enhanced Service Handlers**
   - ErrorHandler for standardized error responses
   - InputValidator for comprehensive data validation
   - NotificationService for email notifications
   - CacheService for performance optimization

4. ✅ **Merge and Duplicate Resolution**
   - `mergeWithExistingPartner` action
   - `createNewPartner` action (proceed despite duplicates)

5. ✅ **Status Update Interfaces**
   - `updateSAPStatus(status)` action
   - `updateSatelliteStatus(status)` action
   - `updateSAPIdStatus(status)` action
   - These actions update integration statuses and create approval history entries

6. ✅ **Workflow Visualization**
   - ProcessFlow component on Object Page
   - Visual representation of: Duplicate Check → Compliance → Approval → Integration
   - Dynamic state updates based on current data

#### 🎯 MDM App Specific Requirements

##### A. List Report (Inbox View)

**Purpose**: Read-only inbox for MDM team to review incoming requests

##### A. List Report (Inbox)

**Purpose**: MDM team inbox to view pending approval requests

**Available Actions**:
- ✅ View SAP Partner (search and view existing partners)
- ✅ Filter and search requests
- ✅ Navigate to Object Page for review

**Explicitly Hidden Actions**:
- ❌ **Create** button (MDM doesn't create new requests)
- ❌ **Delete** button (MDM doesn't delete requests)
- ❌ **Change** button (MDM doesn't edit request data directly)

**Button Configuration**:
```json
{
  "creationMode": { "name": "Disabled" },
  "editMode": "Display"
}
```

**Implementation**: Custom JavaScript controller extension to programmatically hide buttons on page load.

##### B. Object Page (Request Review)

**Purpose**: Detailed review page with approval actions

**Header Actions** (ONLY these 4 buttons should appear):
1. **Compliance Check** - Runs VIES and AEB validation
2. **Check Duplicates** - Searches for potential duplicate partners  
3. **Approve** - Approve the request after validation
4. **Reject** - Reject the request with reason

**Explicitly Hidden Actions** (must NOT appear):
- ❌ Edit button (standard Fiori Edit)
- ❌ Delete button (standard Fiori Delete)
- ❌ Submit for Approval (not applicable to MDM)
- ❌ Merge with Existing Partner (handled via dialog, not header button)
- ❌ Create New Partner (handled via dialog, not header button)
- ❌ Check Established VAT Duplicates (superseded by Check Duplicates)

**Editable Fields**:
- Only `mdmNotes` field can be edited directly (internal MDM notes)
- All business partner data (name, address, VAT, banks) is **read-only**
- Status fields updated via actions only

**Sections**:
1. **Workflow Status** (ProcessFlow visualization) - TOP SECTION
2. Basic Information
3. Addresses
4. Emails
5. Bank Details
6. VAT IDs
7. Compliance Status
8. Documents
9. Approval History
10. Duplicate Review

##### C. Workflow Visualization Requirements

**Component**: `sap.suite.ui.commons.ProcessFlow`

**Workflow Steps**:
1. **Duplicate Check**
   - State: Neutral (Pending) / Warning (Duplicates Found) / Positive (No Duplicates)
   - Data Source: `duplicateCheckResults` field
   - Logic: Parse JSON, if array.length > 0 → Warning, else → Positive

2. **Compliance Check**
   - State: Neutral (Pending) / Positive (Passed) / Negative (Failed) / Critical (Review Required)
   - Data Sources: `aebStatus`, `viesStatus`
   - Logic: 
     - Both Pass → Positive
     - Any Fail → Negative
     - NotChecked → Neutral
     - Warning → Critical

3. **Approval Decision**
   - State: Neutral (Pending) / Positive (Approved) / Negative (Rejected) / Critical (In Review)
   - Data Source: `status` field
   - Logic:
     - 'Approved' → Positive
     - 'Rejected' → Negative
     - 'Submitted' or 'InReview' → Critical
     - Other → Neutral

4. **Integration Status**
   - State: Neutral (Pending) / Positive (Completed) / Negative (Error) / Critical (Processing)
   - Data Sources: `sapInitialStatus`, `satelliteStatus`, `sapIdUpdateStatus`
   - Logic:
     - All Success → Positive
     - Any Error → Negative
     - Status 'Approved' → Critical (Processing)
     - Other → Neutral

**Visual Flow**:
```
[Duplicate Check] → [Compliance] → [Approval] → [Integration]
```

**Position**: First section on Object Page (before "Basic Information")

##### D. Service Interface for Integration Systems

**Purpose**: External systems (SAP, Satellites) can update integration statuses

**Actions**:
```cds
action updateSAPStatus(status: String) returns String;
action updateSatelliteStatus(status: String) returns String;
action updateSAPIdStatus(status: String) returns String;
```

**Valid Status Values**: 'Pending', 'Success', 'Error', 'NotApplicable' (for sapIdUpdateStatus only)

**Behavior**:
- Updates the respective status field
- Creates an entry in ApprovalHistory with action='IntegrationUpdate'

##### E. MDM Action Specifications

###### 1. Compliance Check Action

**Action**: `performComplianceCheck()`

**Purpose**: Validate business partner against EU databases (VIES for VAT, AEB for export compliance)

**Trigger**: MDM user clicks "Compliance Check" button on Object Page header

**Process**:
1. Extract VAT IDs from request (all entries in `vatIds` collection)
2. For each EU VAT ID:
   - Call VIES service to validate VAT number
   - Store result in `viesStatus` field
3. Call AEB service to check export compliance:
   - Send company name, country, VAT numbers
   - Store result in `aebStatus` field
4. Update request fields:
   - `aebComplianceStatus`: 'Pass', 'Fail', 'Warning', or 'NotChecked'
   - `viesValidationStatus`: 'Valid', 'Invalid', 'NotChecked'  
   - `aebValidatedAt`: Current timestamp
   - `viesValidatedAt`: Current timestamp
5. Create approval history entry:
   - `action`: 'ComplianceCheck'
   - `comments`: Summary of VIES and AEB results
6. Display result dialog to user showing:
   - VIES validation results (per VAT ID)
   - AEB compliance status
   - Any warnings or errors

**Return**: `ComplianceCheckResult` object
```typescript
{
  aebStatus: String,      // 'Pass', 'Fail', 'Warning'
  viesStatus: String,     // 'Valid', 'Invalid', 'Partial'
  message: String         // Summary message for user
}
```

**Backend Integration**:
- VIES API: `http://ec.europa.eu/taxation_customs/vies/services/checkVatService`
- AEB API: `srv/lib/aeb-service.js`

**Error Handling**:
- Network errors → Set status to 'Error', show retry prompt
- Invalid VAT format → Set to 'Invalid', show format requirements
- Service unavailable → Set to 'NotChecked', log warning

###### 2. Check Duplicates Action

**Action**: `checkDuplicates()`

**Purpose**: Search for potential duplicate partners in existing SAP database

**Trigger**: MDM user clicks "Check Duplicates" button on Object Page header

**Process**:
1. Extract search criteria from request:
   - Partner name (fuzzy matching)
   - VAT IDs (exact matching)
   - Address (city, postal code, country)
2. Query `ExistingPartners` entity with OR logic:
   - Fuzzy name match (>80% similarity)
   - Exact VAT ID match
   - Address match (same city + postal code)
3. Calculate similarity score for each potential duplicate:
   - Name similarity: 0-100%
   - VAT match: +50 points
   - Address match: +30 points
4. Store results in `duplicateCheckResults` field (JSON array)
5. For each duplicate found:
   - Create entry in `DuplicateChecks` table
   - Store similarity score, matching criteria
6. Create approval history entry:
   - `action`: 'DuplicateCheck'
   - `comments`: "Found X potential duplicates"
7. Display results dialog showing:
   - List of potential duplicates
   - Similarity scores
   - Matching fields highlighted
   - Actions: "Review Details", "Mark as Different", "Merge" (future)

**Return**: `array of DuplicateResult`
```typescript
[{
  partnerName: String,    // Name of existing partner
  sapBpNumber: String,    // SAP business partner number
  similarity: Integer,    // 0-100 similarity score
  matchingFields: [String] // e.g., ['vatId', 'name']
}]
```

**Backend Integration**:
- Duplicate service: `srv/lib/enhanced-duplicate-service.js`
- Uses fuzzy matching library: `fuzzy` npm package
- Searches against: `ExistingPartners` entity

**Rules**:
- Minimum similarity threshold: 75%
- Maximum results returned: 10
- Prioritize exact VAT ID matches over fuzzy name matches

###### 3. Approve Request Action

**Action**: `approveRequest(comments: String)`

**Purpose**: Approve business partner request after validation

**Trigger**: MDM user clicks "Approve" button, enters approval comments in dialog

**Process**:
1. Validate prerequisites:
   - Compliance check completed (aebStatus and viesStatus not null)
   - Duplicate check completed
   - Status must be 'Submitted' or 'InReview'
2. Update request:
   - `status`: 'Approved'
   - `approvedBy`: Current user ID
   - `approvedAt`: Current timestamp
3. Create approval history entry:
   - `action`: 'Approved'
   - `comments`: User-provided comments
   - `performedBy`: Current user
4. Trigger integrations (async):
   - Create partner in SAP (if applicable)
   - Notify satellite systems
5. Send notification email to requester

**Return**: Success message string

**Validation**:
- Comments required (minimum 10 characters)
- User must have 'MDMApprover' role
- Cannot approve own requests (if requester = approver)

###### 4. Reject Request Action

**Action**: `rejectRequest(reason: String)`

**Purpose**: Reject business partner request with reason

**Trigger**: MDM user clicks "Reject" button, enters rejection reason in dialog

**Process**:
1. Validate:
   - Reason required (minimum 20 characters)
   - Status must allow rejection
2. Update request:
   - `status`: 'Rejected'
   - `rejectedBy`: Current user ID
   - `rejectedAt`: Current timestamp
   - `rejectionReason`: User-provided reason
3. Create approval history entry:
   - `action`: 'Rejected'
   - `comments`: Rejection reason
4. Send notification email to requester with rejection details

**Return**: Success message string

##### F. Button Hiding Implementation

**List Report**: Custom extension to hide Create, Delete, Change buttons

**File**: `app/mdm-approval/webapp/ext/controller/ListReportExt.controller.js`
```javascript
sap.ui.define([], function () {
  return {
    onAfterRendering: function() {
      // Hide Create, Delete, Change buttons from toolbar
      const toolbar = this.byId("fe::table::BusinessPartnerRequests::LineItem-toolbar");
      toolbar?.getContent().forEach(btn => {
        if (btn.getText) {
          const text = btn.getText();
          if (text === "Create" || text === "Delete" || text === "Change") {
            btn.setVisible(false);
          }
        }
      });
    }
  };
});
```

**Object Page**: Existing extension already hides unwanted action buttons

**File**: `app/mdm-approval/webapp/ext/controller/ObjectPageExt.controller.js`
- Hides: Edit, Delete, Submit for Approval, Merge, Create New Partner, Check Established VAT Duplicates
- Shows only: Compliance Check, Check Duplicates, Approve, Reject

##### D. Service Interface for Integration Systems
- Returns confirmation message

**Usage Example**:
```http
POST /mdm/BusinessPartnerRequests(ID='...')/updateSAPStatus
{ "status": "Success" }
```

#### ⚠️ Missing Critical Features

##### 1. Enhanced Central Dashboard (Inbox)

**Required Components**:

**A. Filter Bar**
- **Source System Filter**
  - Multi-select: PI, COUPA, SALESFORCE
  - Status: ⚠️ **Data available** but UI filter not implemented
  - Default: All selected

- **Request Type Filter**
  - Options: Create, Change
  - Status: ⚠️ **Data available** but UI filter not implemented
  - Default: All

- **Overall Status Filter**
  - Multi-select: NEW, PENDING_INTEGRATION, IN_PROCESS, PENDING_ACKNOWLEDGMENT, COMPLETED, REJECTED, ERROR
  - Status: ⚠️ **Data available** but UI filter not implemented
  - Default: NEW, ERROR (show pending work)

- **Date Range Filter**
  - From Date, To Date
  - Default: Last 30 days

- **Requestor Name Filter**
  - Free text search

**B. Table Columns**
| Column | Field | Sortable | Filterable | Width | Status |
|--------|-------|----------|------------|-------|--------|
| Request ID | requestNumber | Yes | Yes | 150px | ✅ Implemented |
| Source System | sourceSystem | Yes | Yes | 120px | ✅ Implemented |
| Request Type | requestType | Yes | Yes | 100px | ✅ Implemented |
| BP Name | partnerName | Yes | Yes | 200px | ✅ Implemented |
| Overall Status | status | Yes | Yes | 150px | ✅ Implemented |
| Requestor | createdBy | Yes | Yes | 150px | ❌ Missing |
| Created At | createdAt | Yes | Yes | 150px | ✅ Implemented |
| Actions | - | No | No | 100px | ❌ Missing |

**C. Row Actions**
- View Details (navigate to detail page)
- Quick Approve (if all checks passed)
- Quick Reject (opens reason dialog)

##### 2. Detailed Request Page

**Required Sections**:

**A. Header Section**
- Request ID (large, prominent)
- Overall Status (with color coding)
- Source System badge
- Request Type badge
- Created By, Created At
- Last Modified By, Last Modified At

**B. Data Sections** (Tabbed Layout)

**Tab 1: Basic Information**
- All basic fields from request
- Read-only display
- Copy to clipboard buttons

**Tab 2: Addresses**
- Table showing all addresses
- Columns: Type, Name, Street, City, Country
- Established address highlighted

**Tab 3: Contacts**
- Email contacts table
- Phone contacts table (if applicable)

**Tab 4: Bank Details**
- Bank accounts table
- Columns: Bank Country, IBAN, SWIFT, Account Number
- Validation status indicators

**Tab 5: VAT IDs**
- VAT IDs table
- Columns: Country, VAT Number, VIES Status
- Validation results

**C. Change Log / Diff View** (CRITICAL for Change Requests)

**Status**: ⚠️ **changePayload field created** but UI diff view not implemented

**Display Logic**:
```
IF requestType = 'Change' THEN
  SHOW Change Log Section
  PARSE changePayload JSON
  FOR EACH modified field:
    DISPLAY:
      - Field Name (human-readable label)
      - Old Value (red background, strikethrough)
      - New Value (green background, bold)
      - Change Timestamp
      - Changed By
END IF
```

**Visual Design**:
- Table format with 3 columns: Field Name | Old Value | New Value
- Color coding: Red (#FFE6E6) for old, Green (#E6FFE6) for new
- Icon indicators: ❌ for old, ✅ for new
- Expandable rows for complex fields (addresses, banks)

**Example**:
| Field | Old Value | New Value |
|-------|-----------|-----------|
| Phone Number | ❌ ~~+49 123 456~~ | ✅ **+49 789 012** |
| Email | ❌ ~~old@example.com~~ | ✅ **new@example.com** |

**D. Compliance & Duplicates Section**

**Status**: ⚠️ **Backend logic ready** (aebStatus, viesStatus, duplicateCheckResults fields created)

**Layout**: 3-column grid

**Column 1: VIES Status**
- Status Badge: Valid ✅ / Invalid ❌ / Not Checked ⏸️
- Field: `viesStatus` (readonly, MDM-only)
- VAT ID checked
- Country
- Check Timestamp
- Response Details: `viesDetails` field

**Column 2: AEB Sanctions Status**
- Status Badge: Clear ✅ / Blocked ❌ / Warning ⚠️ / Not Checked ⏸️
- Field: `aebStatus` (readonly, MDM-only)
- Risk Score (0-100)
- Sanctions Lists Checked
- PEPs Check Result
- Export Control Result
- Check Timestamp
- Detailed Findings: `aebDetails` field

#### AEB Trade Compliance API Specification

**API Package**: `@api/trade-compliance`  
**Method**: `screenAddresses`

**Request Structure**:
``javascript
tradeCompliance.screenAddresses({
  addresses: [
    {
      telNo: string,
      countryISO: string (2-letter ISO code),
      name: string,
      street: string,
      pc: string (postal code),
      city: string,
      email: string
    }
  ],
  screeningParameters: {
    suppressLogging: 'false' | 'true',
    considerGoodGuys: 'false' | 'true', // Whitelist known partners
    addressTypeVersion: '0'
  }
})
```

**Response Structure** (HTTP 200):

![AEB API Responses](file:///C:/Users/msudarsanan/.gemini/antigravity/brain/a29e20ce-6b42-4ed2-bdf4-534c24e2f487/aeb_api_responses.png)

```typescript
{
  // Array of screening results (one per input address)
  results: [{
    matchFound: boolean,         // true if restricted party found
    wasGoodGuy: boolean,         // true if whitelisted entity
    referenceId: string,         // From request (max 255 chars)
    referenceComment: string     // From request (max 3000 chars)
  }]
}
```

**HTTP Error Codes**:
- **401**: Unauthorized - Missing or invalid authorization token
- **405**: Method not allowed - Use POST
- **406**: Not Acceptable - Resource produces application/json or application/xml
- **415**: Unsupported Media Type

**Implementation Status**: ✅ Mock service implemented in `srv/lib/aeb-service.js`
- Screens addresses against blocked entity patterns (Iran, Syria, North Korea, etc.)
- Supports Good Guy (whitelist) functionality
- Returns `matchFound` and `wasGoodGuy` flags
- Calculates overall risk score (0-100) based on matches
- Status determination: Clear (0-40), Warning (41-70), Blocked (71-100)

**Column 3: Duplicate Check**
- Status: No Duplicates ✅ / Potential Match ⚠️ / Not Checked ⏸️
- Field: `duplicateCheckResults` (JSON array, readonly)
- If duplicates found:
  - Table of potential matches
  - Columns: BP ID, Name, VAT ID, Match Score (%)
  - "View Details" link for each match
  - "Merge with this BP" action button

**E. Documents Section**
- Table of uploaded documents
- Columns: Document Type, File Name, Size, Uploaded By, Upload Date, Actions
- Actions: Download, Preview (PDF), Delete
- Upload new document button
- Status: ⚠️ **Entity created** (RequestAttachments) but UI missing

**F. Integration Status Monitor**

**Status**: ✅ **Fields created**:
- `integrationSuiteStatus`: Integration Suite send status
- `sapInitialStatus`: S/4HANA create/update status
- `satelliteStatus`: Source system sync status
- `sapIdUpdateStatus`: S/4HANA ID update status (for creates)

**Display**: Status timeline visualization (UI not implemented)

**Steps**:
1. **Request Created** ✅
   - Timestamp
   - Created By

2. **Compliance Checks** 
   - Status: Pending ⏸️ / In Progress 🔄 / Completed ✅ / Failed ❌
   - VIES: `viesStatus`
   - AEB: `aebStatus`
   - Duplicates: `duplicateCheckResults`

3. **MDM Approval**
   - Status: Pending / Approved / Rejected
   - Approved By: `approvedBy`
   - Approval Timestamp: `approvedAt`

4. **Integration Suite** (`integrationSuiteStatus`)
   - Status: Pending ⏸️ / Success ✅ / Error ❌
   - Timestamp

5. **SAP Integration** (`sapInitialStatus`)
   - Status: Pending ⏸️ / Success ✅ / Error ❌
   - SAP BP ID: `sapBpNumber` (if success)
   - Error Message (if error)
   - Timestamp

6. **Satellite System Sync** (`satelliteStatus`)
   - Status: Pending ⏸️ / Success ✅ / Error ❌
   - Satellite System ID (if success)
   - Error Message (if error)
   - Timestamp

7. **SAP ID Update** (`sapIdUpdateStatus`)
   - Status: Pending ⏸️ / Success ✅ / Error ❌ / NotApplicable
   - Only for BP creation
   - Timestamp

**G. MDM Notes Section**
- Field: `mdmNotes` (String 1024)
- Status: ✅ **Field exists** but UI editor not implemented
- Internal notes for MDM team
- Timestamp and author for each note
- History of all notes

##### 3. Validation Actions

**A. "Run Compliance Checks" Button**
- **Visibility**: MDM Team only (hidden for Satellite Owners)
- **Status**: ✅ **Backend implemented** (`performComplianceCheck` action)

**Behavior**:
1. User clicks button
2. Button shows loading spinner
3. System makes 3 parallel API calls:
   - VIES validation via VIESService
   - AEB sanctions via AEBService
   - SAP Duplicates via EnhancedDuplicateService
4. Results populate `aebStatus`, `viesStatus`, `duplicateCheckResults` fields
5. Button changes to "Re-run Checks"
6. Success toast: "Compliance checks completed"

**Implementation Details**:
- Uses CacheService for compliance check caching
- Updates individual VAT ID validation status in PartnerVatIds table
- Creates ApprovalHistory entry for audit trail

**Error Handling**:
- If any API fails, show error message
- Allow partial results (e.g., VIES passed, AEB failed)
- "Retry Failed Checks" button

##### 4. Decision Actions

**A. "Submit for Integration" (Approve) Button**
- **Visibility**: MDM Team only
- **Status**: ✅ **Backend implemented** (`approveRequest` action)

**Pre-conditions**:
- All compliance checks must be "Valid" or "Clear"
- No blocking duplicates
- All required fields populated

**Behavior**:
1. User clicks button
2. System performs final validation
3. If validation passes:
   - Update `status` to 'Approved'
   - Generate `sapBpNumber`
   - Record `approvedBy` and `approvedAt`
   - Create approval history entry
   - Show success toast with SAP BP Number
4. If validation fails:
   - Show error message with details
   - Highlight invalid fields

**B. "Reject" Button**
- **Status**: ✅ **Backend implemented** (`rejectRequest` action)

**Behavior**:
1. User clicks button
2. Dialog opens with:
   - Title: "Reject Request"
   - Rejection Reason field (mandatory, 500 characters)
   - Confirm button
   - Cancel button
3. User enters reason and confirms
4. System:
   - Updates `status` to 'REJECTED'
   - Saves `rejectionReason`
   - Records `approvedBy` and `approvedAt`
   - Creates approval history entry
   - Triggers notification to requestor (via NotificationService)
   - Shows success toast: "Request rejected"

**C. "Mark as Completed" Button**

**Pre-conditions**:
- `sapInitialStatus` = 'Success'
- `satelliteStatus` = 'Success'
- `sapIdUpdateStatus` = 'Success' OR 'NotApplicable'

**Behavior**:
1. Button enabled only if pre-conditions met
2. User clicks button
3. System:
   - Updates `status` to 'COMPLETED'
   - Records completion timestamp
   - Shows success toast: "Request marked as completed"

---

## Application 5: Satellite Notification App

### Purpose
Notify system owners when shared Business Partners are modified by other departments.

### Implementation Status: ⚠️ **Entity Created, UI Missing**

### Required Features

#### A. Pending Tasks List

**Layout**: Simple table

**Columns**:
| Column | Field | Width |
|--------|-------|-------|
| BP Name | partnerName | 200px |
| BP ID | sapBusinessPartnerID | 120px |
| Changed By | changedBy | 150px |
| Change Date | changeDate | 150px |
| Originating System | originatingSystem | 150px |
| Actions | - | 100px |

**Filters**:
- Status: Pending (default), Acknowledged, All
- Date Range

**Row Actions**:
- View Changes (navigate to review page)
- Quick Acknowledge

#### B. Change Review Page

**Layout**: Read-only detail page

**A. Context Section**
- Business Partner Name (large heading)
- SAP BP ID
- Systems using this BP (badges)
- Change initiated by: {System} - {User}
- Change date

**B. Change Log Section**
- Exact same diff view component as MDM Approval App
- Uses `changePayload` JSON field
- Shows: Field Name | Old Value | New Value
- Color coding: Red for old, Green for new

**C. Documents Section**
- Read-only access to documents attached to change request
- Download and preview capabilities

**D. Acknowledge Action**
- Large "Acknowledge" button
- Confirmation dialog: "Confirm you have reviewed these changes"
- On confirm:
  - Record user ID and timestamp in satelliteAcknowledgments table
  - Update status to 'Acknowledged'
  - Show success toast
  - Navigate back to pending list

---

## Application 6: Unified Request Creation

### Purpose
Single entry point for all satellite system owners with dynamic UI adaptation based on user's system.

### Implementation Status: ❌ **Not Implemented**

### Required Features

#### A. Dynamic UI Adaptation

**Logic**:
```javascript
// Determine user's source system from role/scope
const userSystem = getUserSourceSystem(); // Returns: 'COUPA', 'SALESFORCE', 'PI'

// Show/hide sections based on system
if (userSystem === 'SALESFORCE') {
  showCustomerSections();
  hideSupplierSections();
  showSubAccountCreation();
} else if (userSystem === 'COUPA' || userSystem === 'PI') {
  showSupplierSections();
  hideCustomerSections();
  hideSubAccountCreation();
}
```

**Behavior**:
- Salesforce users see Customer-specific fields (Sales Area, Revenue Stream, etc.)
- Coupa/PI users see Supplier-specific fields (Purchasing Org, Payment Terms, etc.)
- Common fields (Name, Address, VAT, Bank) shown to all

#### B. Creation Wizard

**Step 1: Search Existing**
- Search bar: "Search by Name, VAT ID, or System ID"
- Results table with potential matches
- "Create New" button (if no match)
- "Select and Edit" button (for change requests)

**Step 2: Basic Information**
- Dynamic form based on user system
- Real-time validation on field exit
- Progress indicator

**Step 3: Additional Details**
- Addresses, Contacts, Banks
- Add/Remove capabilities
- Validation summary

**Step 4: Documents**
- Upload supporting documents
- Document type selection
- Preview uploaded files

**Step 5: Review and Submit**
- Summary of all entered data
- Validation status for each section
- "Submit" button
- "Save as Draft" button

#### C. Real-Time Validation

**Field Exit Validation**:

**Email**:
```javascript
validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    showError("Invalid email format");
    return false;
  }
  return true;
}
```

**Phone**:
```javascript
validatePhone(phone, country) {
  // Country-specific phone validation
  const patterns = {
    'DE': /^\+49\d{10,11}$/,
    'US': /^\+1\d{10}$/,
    'FR': /^\+33\d{9}$/
  };
  if (!patterns[country].test(phone)) {
    showError(`Invalid phone format for ${country}`);
    return false;
  }
  return true;
}
```

**VAT ID**:
```javascript
async validateVAT(vatID, country) {
  // Format check
  if (!checkVATFormat(vatID, country)) {
    showError("Invalid VAT ID format");
    return false;
  }
  
  // VIES check
  try {
    const response = await fetch(`/service/mdm/validateVIES?vatID=${vatID}&country=${country}`);
    const result = await response.json();
    if (result.valid) {
      showSuccess("VAT ID validated successfully");
      return true;
    } else {
      showWarning("VAT ID not found in VIES database");
      return false;
    }
  } catch (error) {
    showError("VIES validation failed");
    return false;
  }
}
```

#### D. Duplicate Prevention

**Search Before Create**:
- Mandatory search step before creating new BP
- Search by: Name (fuzzy 95%), VAT ID (exact), System ID
- If potential duplicates found:
  - Show warning dialog
  - List potential matches with similarity scores
  - Options: "Use Existing", "Create Anyway", "Cancel"

**Status**: ⚠️ **Backend ready** (fuzzy search and duplicate services implemented)

#### E. Change Request Support

**Pre-fill Logic**:
```javascript
loadExistingBP(bpID) {
  // Fetch current BP data
  const currentData = await fetchBPData(bpID);
  
  // Pre-fill form
  populateForm(currentData);
  
  // Enable change tracking
  enableChangeTracking(currentData);
}

trackChanges(fieldName, oldValue, newValue) {
  if (oldValue !== newValue) {
    changePayload[fieldName] = {
      old: oldValue,
      new: newValue,
      timestamp: new Date().toISOString(),
      changedBy: getCurrentUser()
    };
  }
}
```

**Change Visualization**:
- Modified fields highlighted in yellow
- "View Changes" button shows diff summary
- Change count badge

---

## Data Field Specifications

### Common Request Fields (All Systems)

| Field Name | Data Type | Required | Validation | Default | Implementation |
|------------|-----------|----------|------------|---------|----------------|
| sourceSystem | String(20) | Yes | Enum: PI, COUPA, SALESFORCE | - | ✅ Auto-set per app, Read-only in UI |
| requestType | String(10) | Yes | Enum: Create, Change | Create | ✅ Auto-set, Read-only in UI |
| status | String(30) | Yes | Enum: NEW, PENDING_INTEGRATION, IN_PROCESS, PENDING_ACKNOWLEDGMENT, COMPLETED, REJECTED, ERROR | NEW | ✅ ValueList configured |
| requestNumber | String(20) | Yes | Read-only, auto-generated | - | ✅ Auto-generated |
| coupaInternalNo | String(50) | No | Read-only, UUID | - | ✅ Auto-generated UUID |
| requestorName | String(100) | Yes | Read-only | Current user | ✅ From user context |
| mdmNotes | String(1024) | No | - | - | ✅ Field exists |
| changePayload | String(5000) | No | Valid JSON | - | ✅ Field created |
| viesStatus | String(20) | No | Enum: Valid, Invalid, NotChecked | NotChecked | ✅ Readonly, MDM-only |
| aebStatus | String(20) | No | Enum: Clear, Blocked, Warning, NotChecked | NotChecked | ✅ Readonly, MDM-only |
| duplicateCheckResults | String(2000) | No | JSON Array | - | ✅ Readonly field |
| sapBusinessPartnerID | String(10) | No | Read-only | - | ✅ Field: sapBpNumber |
| satelliteSystemID | String(50) | No | Read-only | - | ✅ Field exists |
| integrationSuiteStatus | String(20) | No | Enum: Pending, Success, Error | Pending | ✅ Field created |
| sapInitialStatus | String(20) | No | Enum: Pending, Success, Error | Pending | ✅ Field created |
| satelliteStatus | String(20) | No | Enum: Pending, Success, Error | Pending | ✅ Field created |
| sapIdUpdateStatus | String(20) | No | Enum: Pending, Success, Error, NotApplicable | Pending | ✅ Field created |
| associatedSystems | LargeString | No | JSON Array | - | ❌ Not implemented |

**Important Notes:**
- **sourceSystem**: This field is automatically set based on the satellite app (COUPA for Coupa app, SALESFORCE for Salesforce app, PI for PI app). It is displayed as read-only (greyed out) in the UI to prevent manual changes. The value is used throughout the system for routing and integration logic.
- **status**: This field is system-controlled and displays the current workflow status. It is read-only (greyed out) in the UI and updated automatically by backend processes (new requests start as 'NEW', then transition through approval states).
- **requestType**: This field is auto-set to 'Create' for new partner creation requests and is read-only (greyed out) in the UI. For change requests, it would be set to 'Change' via a separate process flow.

### Change Request Workflow (Planned)

**Requirement**: Provide a "Change" button alongside "Create" to initiate change requests for existing Business Partners.

**User Flow**:
1. **Entry Point**: User clicks "Change" button on List Report page
2. **Search Dialog Opens**: Modal dialog with search criteria fields
3. **Search Execution**: Query sent to SAP (or mock SAP service)
4. **Results Display**: Matching partners shown in table
5. **Selection & Import**: User selects a partner, data imported into form
6. **Modification**: User changes desired fields
7. **Submission**: Change request submitted with delta tracking

---

### SAP Business Partner Search Feature (Planned)

**Purpose**: Enable users to search for existing Business Partners in SAP to create change requests or verify data.

#### Search Dialog Specification

**Trigger**: Clicking "Change" button opens a modal dialog with the following search fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| **SAP BP Number** | String(10) | No | SAP Business Partner ID (e.g., "0000100001") |
| **Partner Name** | String(80) | No | Business Partner name (supports wildcards) |
| **VAT ID** | String(20) | No | VAT Registration Number |
| **Satellite System ID** | String(50) | No | External system ID (Coupa Supplier ID, Salesforce Account ID, etc.) |

**Search Behavior**:
- At least one field must be filled
- Multiple fields create an AND condition
- Wildcard support: `*` for name searches (e.g., "Acme*")
- Case-insensitive search

#### SAP OData Integration (Mock Service)

**Endpoint**: `GET /sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner`

**Query Parameters**:
```
$filter=BusinessPartner eq '0000100001' 
    or contains(BusinessPartnerFullName, 'Acme')
    or YY1_VATRegistrationNumber eq 'DE123456789'
    or YY1_ExternalSystemID eq 'COUPA-12345'
$expand=to_BusinessPartnerAddress,to_BusinessPartnerBank,to_BusinessPartnerTaxNumber
$select=BusinessPartner,BusinessPartnerFullName,OrganizationBPName1,BusinessPartnerCategory
```

**Mock Service Implementation**:
- Create mock handler in `srv/integration/sap-mock.js`
- Return sample BP data from `db/data/mock-sap-partners.json`
- Simulate 500ms-1s delay for realistic experience
- Include 5-10 sample partners with varied data

#### Search Results Display

**Results Table Columns**:
| Column | Source Field | Description |
|--------|-------------|-------------|
| BP Number | BusinessPartner | SAP BP ID |
| Name | OrganizationBPName1 | Partner name |
| Country | Country (from address) | Primary country |
| VAT ID | TaxNumber | VAT registration |
| Type | BusinessPartnerCategory | 1=Person, 2=Org |
| Status | BusinessPartnerIsBlocked | Active/Blocked |

**Actions**:
- "Select" button on each row
- "Cancel" to close dialog without selection

#### Data Import & Reverse Mapping

**Reverse Mapping Specification**: Convert SAP field names to MDM Request entity fields.

| SAP Field (API_BUSINESS_PARTNER) | MDM Request Field | Transformation |
|----------------------------------|-------------------|----------------|
| BusinessPartner | sapBpNumber | Direct copy |
| OrganizationBPName1 | partnerName | Direct copy |
| BusinessPartnerCategory | entityType | Map: 1='Person', 2='Organization' |
| to_BusinessPartnerAddress | addresses | Map to PartnerAddresses array |
| - StreetName | addresses[].street | Direct copy |
| - HouseNumber | addresses[].streetNumber | Direct copy |
| - CityName | addresses[].city | Direct copy |
| - PostalCode | addresses[].postalCode | Direct copy |
| - Country | addresses[].country_code | Direct copy |
| to_BusinessPartnerBank | banks | Map to PartnerBanks array |
| - BankCountryKey | banks[].bankCountry_code | Direct copy |
| - BankAccount | banks[].accountNumber | Direct copy |
| - IBAN | banks[].iban | Direct copy |
| - BankName | banks[].bankName | Direct copy |
| to_BusinessPartnerTaxNumber | vatIds | Map to PartnerVatIds array |
| - TaxNumber | vatIds[].vatNumber | Direct copy |
| - TaxNumberCategory | vatIds[].vatType_code | Map: 'VAT1' -> 'VAT', 'TAX1' -> 'TIN' |
| - Country | vatIds[].country_code | Direct copy |

**Auto-Population After Selection**:
1. Set `requestType` = 'Change'
2. Set `sourceSystem` based on current app
3. Populate all above fields from SAP data
4. Set `status` = 'NEW'
5. Enable form for editing (only changed fields will be tracked)

#### Change Tracking (Delta Detection)

**Implementation**:
- Store original SAP data in `originalData` field (JSON)
- On save, compare current form values with `originalData`
- Populate `changePayload` with only modified fields:

```json
{
  "partnerName": {
    "old": "Acme Corp",
    "new": "Acme Corporation",
    "changedBy": "user@example.com",
    "changedAt": "2025-11-27T10:30:00Z"
  },
  "addresses[0].street": {
    "old": "Main Street",
    "new": "123 Main Street",
    "changedBy": "user@example.com",
    "changedAt": "2025-11-27T10:30:00Z"
  }
}
```

**Implementation Status**: ❌ Not yet implemented - requires:
- Mock SAP service endpoint
- Search dialog UI component
- Reverse mapping logic
- Delta tracking mechanism

---

## Backend Foundation (Implemented)

### Auto-Population Features ✅

**Draft NEW Handler**: Automatically populates system-controlled fields when creating new requests:

```javascript
// Triggered on draft creation
this.before('NEW', BusinessPartnerRequests.drafts, async (req) => {
  req.data.sourceSystem = 'COUPA';  // Set based on app context
  req.data.requestType = 'Create';
  req.data.status = 'NEW';
});
```

**Field Behavior**:
- `sourceSystem`: Auto-set to 'COUPA', 'SALESFORCE', or 'PI' based on app
- `requestType`: Auto-set to 'Create' for new requests
- `status`: Auto-set to 'NEW' for initial state
- All three fields are read-only (`@UI.ReadOnly` + `@Core.Computed`)
- ValueLists configured for filter bar dropdowns

### Mock SAP Service ✅

**Location**: `srv/integration/sap-mock.js`

**Capabilities**:
- Search by: SAP BP Number, Partner Name (wildcard), VAT ID, Satellite System ID
- Returns 5 sample partners (DE, GB, US, FR, ES)
- Simulates network latency (500ms-1s)
- Full partner data: addresses, banks, VAT registrations

**Sample Data**: `db/data/mock-sap-partners.json`

### Change Request Actions ✅

**Service Actions** (`srv/mdm-service.cds`):
```cds
function searchSAPPartners(
  sapBpNumber: String,
  partnerName: String,
  vatId: String,
  satelliteSystemId: String
) returns array of { sapBpNumber, partnerName, country, vatId, status, isBlocked };

action importSAPPartner(sapBpNumber: String) returns String;
```

**Handlers** (`srv/mdm-service.js`):
- `searchSAPPartners`: Queries mock SAP service, returns formatted results
- `importSAPPartner`: Reverse maps SAP data to MDM format, stores original data

**Reverse Mapping**:
- SAP `BusinessPartner` → `sapBpNumber`
- SAP `OrganizationBPName1` → `partnerName`
- SAP `to_BusinessPartnerAddress` → `addresses[]`
- SAP `to_BusinessPartnerBank` → `banks[]`
- SAP `to_BusinessPartnerTaxNumber` → `vatIds[]`
- SAP `TaxNumberCategory` ('VAT1'/'TAX1') → `vatType_code` ('VAT'/'TIN')

**Delta Tracking Fields**:
- `originalData` (LargeString): Stores original SAP JSON for comparison
- `changePayload` (LargeString): Stores only modified fields in JSON format

**Testing** (REST/Postman):
```bash
# Search
POST http://localhost:4004/mdm/BusinessPartnerRequests/searchSAPPartners
{ "partnerName": "Acme*" }

# Import
POST http://localhost:4004/mdm/BusinessPartnerRequests/importSAPPartner
{ "sapBpNumber": "0000100001" }
```

---

## Implementation Summary

### Completed Features ✅
- ✅ Draft-enabled entity with auto-population
- ✅ All dropdowns using database tables (13 configuration entities)
- ✅ Countries configuration (57+ countries)
- ✅ Payment terms and methods tables
- ✅ System field auto-population (sourceSystem, requestType, status)
- ✅ Field controls (read-only with ValueLists for filtering)
- ✅ Mock SAP service with 5 sample partners
- ✅ Change Request backend (search & import actions)
- ✅ Reverse mapping from SAP to MDM
- ✅ Delta tracking infrastructure

### Pending Features ⏳
- ⏳ "Change" button in UI (requires custom UI5 controller extension)
- ⏳ Search dialog component (requires custom UI5 fragment)
- ⏳ Delta tracking logic (compare original vs. modified data)
- ⏳ Back button configuration (Fiori Launchpad integration)


### Payment Configuration Tables

| Table | Purpose | Sample Values | Maintainable |
|-------|---------|---------------|--------------|
| **PaymentTerms** | Defines payment due dates | Net 7, Net 30, Net 60, Net 90 days | ✅ Yes, via CSV |
| **PaymentMethods** | Defines payment channels | Bank Transfer, Wire, ACH, Check, Credit Card | ✅ Yes, via CSV |

**To Maintain**: Edit `db/data/mdm.db-PaymentTerms.csv` or `mdm.db-PaymentMethods.csv` and redeploy.


### Supplier-Specific Fields (Coupa, PI)

| Field Name (UI Label) | SAP Tech Name | Data Type | Required | Validation | Implementation |
|----------------------|---------------|-----------|----------|------------|----------------|
| Supplier Name | OrganizationBPName1 | String(80) | Yes | Max 80 chars | ✅ Field: partnerName |
| VAT ID | TaxNumber1 | String(20) | Yes | VIES format | ✅ Entity: PartnerVatIds |
| Tax ID Type | - | String(10) | Yes | Enum: VAT, TIN | ✅ Entity: PartnerVatIds |
| Is Established | - | Boolean | Yes | Checkbox | ✅ Entity: PartnerVatIds |
| Vendor Classification | vendorClassification | String(20) | Yes | Value List | ✅ ValueList configured |
| PO Currency | PurchaseOrderCurrency | String(3) | Yes | ISO 4217 | ✅ Field: currency_code |
| Payment Terms | PaymentTerms | String(4) | Yes | Value List | ✅ ValueList configured |
| Payment Method | PaymentMethodsList | String(1) | Yes | Value List | ✅ ValueList configured |
| Street | StreetName | String(60) | Yes | Max 60 chars | ✅ Entity: PartnerAddresses |
| House Number | HouseNumber | String(10) | Yes | Max 10 chars | ✅ Entity: PartnerAddresses |
| City | CityName | String(40) | Yes | Max 40 chars | ✅ Entity: PartnerAddresses |
| Postal Code | PostalCode | String(10) | Yes | Max 10 chars | ✅ Entity: PartnerAddresses |
| Country | Country | String(2) | Yes | ISO 2-char | ✅ Entity: PartnerAddresses |
| Bank Country | BankCountryKey | String(2) | Yes | ISO 2-char | ✅ Entity: PartnerBanks |
| Bank Account | BankAccount | String(18) | Conditional | Numeric | ✅ Entity: PartnerBanks |
| IBAN | IBAN | String(34) | Conditional | Checksum validation | ✅ Entity: PartnerBanks |

### Customer-Specific Fields (Salesforce)

#### Main Account (Business Partner)

| Field Name (UI Label) | SAP Tech Name | Data Type | Required | Implementation |
|----------------------|---------------|-----------|----------|----------------|
| Customer Name | OrganizationBPName1 | String(80) | Yes | ✅ Field: partnerName |
| Established VAT ID | TaxNumber1 | String(20) | Yes | ✅ Entity: PartnerVatIds |
| Tax ID Type | - | String(10) | Yes | Enum: VAT, TIN | ✅ Entity: PartnerVatIds |
| Is Established | - | Boolean | Yes | Checkbox | ✅ Entity: PartnerVatIds |
| BP Type | BusinessPartnerType | String(4) | No | ❌ Not implemented |
| Addresses | A_BusinessPartnerAddress | Composition | Yes | ✅ Entity: PartnerAddresses |
| Bank Info | A_BusinessPartnerBank | Composition | Yes | ✅ Entity: PartnerBanks |

#### Sub-Account (Contract Account)

| Field Name (UI Label) | SAP Tech Name | Data Type | Required | Implementation |
|----------------------|---------------|-----------|----------|----------------|
| Salesforce Sub-ID | YY1_SF_SubID | String(50) | No | ❌ Not implemented |
| Revenue Stream | YY1_RevenueStream | String(20) | Yes | ✅ ValueList configured |
| Billing Cycle | YY1_BillingCycle | String(10) | Yes | ✅ ValueList configured |
| Shipping Addr Ref | AddressID | String(10) | Yes | ❌ Not implemented |
| Bank Account Ref | BankID | String(4) | No | ❌ Not implemented |
| Email Contacts | A_AddressEmailAddress | Composition | Yes | ✅ Entity: PartnerEmails |

---

## Validation Rules

### VAT ID Validation by Country

| Country | Format | Example | Regex Pattern | Implementation |
|---------|--------|---------|---------------|----------------|
| DE (Germany) | DE + 9 digits | DE123456789 | `^DE\d{9}$` | ⚠️ Format ready, UI validation missing |
| FR (France) | FR + 2 chars + 9 digits | FR12345678901 | `^FR[A-Z0-9]{2}\d{9}$` | ⚠️ Format ready, UI validation missing |
| GB (UK) | GB + 9 or 12 digits | GB123456789 | `^GB(\d{9}|\d{12})$` | ⚠️ Format ready, UI validation missing |
| IT (Italy) | IT + 11 digits | IT12345678901 | `^IT\d{11}$` | ⚠️ Format ready, UI validation missing |
| ES (Spain) | ES + 9 chars | ESX12345678 | `^ES[A-Z0-9]\d{7}[A-Z0-9]$` | ⚠️ Format ready, UI validation missing |
| NL (Netherlands) | NL + 9 digits + B + 2 digits | NL123456789B01 | `^NL\d{9}B\d{2}$` | ⚠️ Format ready, UI validation missing |
| BE (Belgium) | BE + 10 digits | BE0123456789 | `^BE0\d{9}$` | ⚠️ Format ready, UI validation missing |
| AT (Austria) | ATU + 8 digits | ATU12345678 | `^ATU\d{8}$` | ⚠️ Format ready, UI validation missing |
| PL (Poland) | PL + 10 digits | PL1234567890 | `^PL\d{10}$` | ⚠️ Format ready, UI validation missing |
| SE (Sweden) | SE + 12 digits | SE123456789001 | `^SE\d{12}$` | ⚠️ Format ready, UI validation missing |

### IBAN Validation by Country

| Country | Length | Example | Implementation |
|---------|--------|---------|----------------|
| DE | 22 | DE89370400440532013000 | ⚠️ Backend ready, UI missing |
| FR | 27 | FR1420041010050500013M02606 | ⚠️ Backend ready, UI missing |
| GB | 22 | GB29NWBK60161331926819 | ⚠️ Backend ready, UI missing |
| IT | 27 | IT60X0542811101000000123456 | ⚠️ Backend ready, UI missing |
| ES | 24 | ES9121000418450200051332 | ⚠️ Backend ready, UI missing |
| NL | 18 | NL91ABNA0417164300 | ⚠️ Backend ready, UI missing |

**Checksum Algorithm**:
1. Move first 4 characters to end
2. Replace letters with numbers (A=10, B=11, ..., Z=35)
3. Calculate mod 97
4. Result must be 1

### Payment Terms Validation

| Code | Description | Days | Allowed | Implementation |
|------|-------------|------|---------|----------------|
| Z001 | Net 7 days | 7 | ✅ Yes | ✅ Value list configured |
| Z010 | Net 10 days | 10 | ✅ Yes | ✅ Value list configured |
| Z030 | Net 30 days | 30 | ✅ Yes | ✅ Value list configured |
| Z045 | Net 45 days | 45 | ✅ Yes | ✅ Value list configured |
| Z060 | Net 60 days | 60 | ✅ Yes | ✅ Value list configured |
| Z090 | Net 90 days | 90 | ✅ Yes | ✅ Value list configured |

---

## Workflow States

### State Transition Diagram

```
NEW
  ↓
PENDING_INTEGRATION (after MDM approval)
  ↓
IN_PROCESS (Integration Suite processing)
  ↓
PENDING_ACKNOWLEDGMENT (for change requests to shared BPs)
  ↓
COMPLETED (all systems synced)

OR

REJECTED (at any review stage)
ERROR (integration failure)
```

### State Definitions

| Status | Description | Visibility | Actions Available | Implementation |
|--------|-------------|------------|-------------------|----------------|
| NEW | Initial state after submission | All users | Run Compliance, Approve, Reject | ✅ Configured |
| PENDING_INTEGRATION | Approved, waiting for Integration Suite | MDM Team | View Status | ✅ Configured |
| IN_PROCESS | Integration Suite processing | MDM Team | View Status, Retry on Error | ✅ Configured |
| PENDING_ACKNOWLEDGMENT | Waiting for satellite owners to acknowledge changes | Satellite Owners | Acknowledge | ✅ Configured |
| COMPLETED | Successfully integrated across all systems | All users | View Only | ✅ Configured |
| REJECTED | Request rejected by MDM | All users | View Reason, Re-submit (new request) | ✅ Configured |
| ERROR | Integration error occurred | MDM Team | View Error, Retry, Manual Fix | ✅ Configured |

**Implementation Status**: ✅ All statuses configured in OverallStatuses value list with criticality mapping

---

## API Specifications

### A. Inbound API: POST /service/mdm/CoupaRequest

**Purpose**: Coupa-specific inbound process (operational overload cited)

**Implementation Status**: ❌ Not Implemented

**Payload**: JSON using SAP Tech Names

**Logic**:
- Validates payload against schema
- Sets Source System = 'COUPA'
- Sets Request Status = 'NEW'
- Persists to MDMRequest entity
- Returns HTTP 201 with Request ID

### B. Compliance/Validation APIs

**Implementation Status**: ✅ Service Handlers Ready

**VIES Check**:
- URL: https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{countryCode}/vat/{vatNumber}
- Method: GET
- Returns: valid/invalid status
- Implementation: ✅ VIESService class created

**AEB Sanctions**:
- Payload: Partner Name, VAT ID, Address, Country
- Returns: Clear/Blocked/Warning status
- Implementation: ✅ AEBService class created

**SAP Duplicates**:
- Service: API_BUSINESS_PARTNER (OData)
- Search: BPs with matching Tax Number and name (contains)
- Returns: List of matching BPs
- Implementation: ✅ EnhancedDuplicateService class created
- **Duplicate Details View**:
  - Clicking a BP Number in the results opens a read-only dialog.
  - Displays full BP details (General, Address, Tax) fetched via `getSAPPartnerDetails`.

### C. Callback API: PATCH /service/mdm/Requests(ID)

**Implementation Status**: ❌ Not Implemented

**Payloads**:
```json
{ "integrationSuiteStatus": "Success", "RequestId": "100123" }
{ "sapInitialStatus": "Success", "RequestId": "100123", "SAPBPNo": "434345" }
{ "satelliteStatus": "Success", "RequestId": "100123", "SatelliteBPID": "434345" }
{ "sapIdUpdateStatus": "Success", "RequestId": "100123" }
```

**Fields**: ✅ All status fields created in data model

### D. Outbound Event: Topic mdm/request/submit

**Implementation Status**: ❌ Event emission not implemented

**Payload**:
```json
{
  "requestID": "UUID",
  "data": "Full validated BP payload using SAP field names",
  "changePayload": "JSON diff if Change request",
  "associatedSystems": ["Coupa"]
}
```

**Fields**: ✅ changePayload field created, associatedSystems field missing

---

## Implementation Progress

### ✅ Completed (2025-11-26)

1. **Value List Infrastructure**
   - All 8 value list entities created and populated with CSV data
   - ValueList annotations configured for dropdowns
   - Readonly entities exposed in service

2. **Enhanced Data Model**
   - Compliance status fields (aebStatus, viesStatus, duplicateCheckResults)
   - Integration status tracking (4-tier: Integration Suite → SAP → Satellite → ID Update)
   - Change tracking (changePayload JSON field)

3. **Auto-Population Logic**
   - Coupa-specific handler for sourceSystem and coupaInternalNo
   - Request number generation

4. **Service Layer**
   - Enhanced MDM Service with enterprise-grade handlers
   - Compliance check actions ready
   - Approval/Rejection workflows implemented
   - Duplicate detection ready

5. **UI Annotations**
   - ValueList annotations for all dropdowns
   - Readonly field annotations
   - Readonly field annotations
   - Basic List Report configuration

6. **Change Request UI**
   - ✅ Custom "Start Change Request" button
   - ✅ Search Partner Dialog
   - ✅ Import & Pre-population logic
   - ✅ Navigation flow (List -> Object Page -> List)

### ⚠️ In Progress

1. **Create Button Issue**
   - Button visible but not functioning
   - Draft table updated with new fields
   - Investigating Fiori Elements configuration

2. **Object Page Creation Form**
   - Backend ready
   - Backend ready
   - UI form not rendering

3. **Visual Diff View**
   - Change log UI component not yet implemented

### ❌ Not Started

1. **Full UI Forms** (All 6 applications)
2. **Change Log/Diff View** UI component
3. **Compliance Section** UI display
4. **Integration Status Timeline** UI
5. **Document Management** UI
6. **Salesforce application** completely
7. **PI application** completely
8. **Unified Request Creation** app
9. **Satellite Notification** app UI
10. **Callback API** implementation
11. **Event emission** to Integration Suite
12. **Real-time field validation** in UI

### Known Issues

1. **Create Button Not Working**
   - Symptom: Button appears but doesn't open creation form
   - Potential causes: Fiori Elements manifest configuration, draft mode issues
   - Workaround: Direct URL navigation to draft entity

2. **Database Deployment**
   - Fixed: Draft annotation conflict resolved
   - Status: Database schema up to date with all new fields

---

## System Setup & Replication

### Prerequisites
- Node.js: Version 18 or 20 (LTS recommended)
- SQLite: For local database development
- SAP CDS DK: Install globally via `npm install -g @sap/cds-dk`
- Git: For version control

### Installation
1. Clone the repository
2. Install dependencies: `npm install`

### Database Setup
1. Deploy to SQLite: `cds deploy --to sqlite`
   - Creates `db/mdm-debug.db` file
   - Loads all value list CSV data

### Running the Application
1. Start the server: `cds watch`
   - Server runs on `http://localhost:4004`
2. Access applications:
   - Index: `http://localhost:4004/`
   - Coupa Requests: `http://localhost:4004/coupa-requests/webapp/index.html`

### Project Structure
- `app/`: Frontend UI5 applications (Fiori Elements)
  - `coupa-requests/`: ✅ Coupa-specific request app
  - `mdm-approval/`: ⚠️ Main approval app (partial)
  - `salesforce-partners/`: ❌ Salesforce-specific app (not implemented)
- `srv/`: Backend CAP services
  - `mdm-service.cds`: Service definitions
  - `mdm-service.js`: Service handlers
  - `lib/`: Utility services (ErrorHandler, InputValidator, etc.)
- `db/`: Database schema
  - `data-model.cds`: Entity definitions
  - `data/`: CSV master data files

---

## Next Steps & Roadmap

### Phase 1: Fix Immediate Issues (Priority: HIGH)
1. ✅ Resolve Create button functionality
2. Implement Object Page creation form UI
3. Add field validation on creation form

### Phase 2: Complete Coupa App (Priority: HIGH)
1. Implement all form sections (Basic Info, Address, Tax, Payment, Bank, Email, Documents)
2. Add real-time field validation
3. Implement change request workflow with diff view
4. Add duplicate check UI

### Phase 3: MDM Approval View (Priority: HIGH)
1. Enhanced inbox with faceted filters
2. Detailed request page with tabs
3. Change log/diff view component
4. Compliance section UI
5. Integration status timeline
6. Document management UI

### Phase 4: Additional Applications (Priority: MEDIUM)
1. Salesforce Customer Requests app
2. PI Supplier Requests app
3. Satellite Notification app

### Phase 5: Integration & APIs (Priority: MEDIUM)
1. Inbound API for Coupa
2. Callback API for status updates
3. Event emission to Integration Suite
4. VIES/AEB/Duplicate API integrations (UI triggers)

### Phase 6: Unified Request Creation (Priority: LOW)
1. Dynamic UI adaptation logic
2. Creation wizard
3. Search before create
4. Change request support

---

## SAP Business Partner Integration Features

### Overview
The application includes comprehensive SAP Business Partner integration capabilities, enabling users to search, view, and import partners from the SAP S/4HANA system. These features prevent duplicate partner creation and enable seamless change request workflows.

### Feature 1: Check Duplicates

**Purpose**: Validate new partner requests against existing SAP Business Partners to prevent duplicates.

**Location**: Object Page header (available when editing a Business Partner Request)

**Button**: "Check Duplicates" (Emphasized, with duplicate icon)

**Workflow**:
1. User creates or edits a Business Partner Request
2. Clicks "Check Duplicates" button in Object Page header
3. System searches SAP using fuzzy matching on:
   - Partner Name
   - VAT ID
   - Address (Street, City)
   - Country
4. Displays results in a table dialog with match scores

**Results Dialog Columns**:
- BP Number (clickable link)
- Partner Name
- VAT ID
- Street
- City  
- Country
- Match % (color-coded: >80% Red, >60% Warning, ≤60% Success)

**Actions**:
- Click BP Number link → Opens detailed view dialog
- Close → Returns to Object Page

**Backend**:
- Service: `checkForDuplicates` (bound action on BusinessPartnerRequests)
- Mock Implementation: `srv/integration/sap-mock.js::findDuplicates()`
- Returns array of potential duplicates with match scores

### Feature 2: View SAP Business Partner Details

**Purpose**: Display comprehensive, read-only details of SAP Business Partners.

**Access Points**:
1. **From List Report**: "View SAP Partner" button (toolbar)
2. **From Duplicate Check**: Click BP Number link in duplicates dialog

**Workflow (List Report)**:
1. Click "View SAP Partner" button
2. Search dialog opens with criteria:
   - Partner Name
   - SAP BP Number
   - VAT ID
   - Satellite System ID
3. Click "Search" → Results displayed in table
4. Select partner → Click "View Details"
5. Details dialog opens (search dialog remains open)
6. Can view multiple partners without re-searching

**Details Dialog Structure**:

#### Section 1: Basic Information (SimpleForm)
- SAP BP Number
- Partner Name
- Partner Role (e.g., Supplier)
- Status (Active/Blocked with color coding)
- Satellite System ID (if exists)

#### Section 2: Addresses (Table)
Columns: Type | Street | City | Postal Code | Country

Shows **all** addresses for the Business Partner with count in header.

#### Section 3: Tax Information (Table)
Columns: Country | Tax Type | Tax Number

Shows **all** VAT IDs and tax numbers with count in header.

#### Section 4: Bank Details (Table)
Columns: Bank Name | Country | IBAN | Account | SWIFT

Shows **all** bank accounts with count in header.

#### Section 5: Contact Information (SimpleForm)
- Email
- Phone
- Fax

**Dialog Properties**:
- Size: 900px × 700px
- Resizable: Yes
- Draggable: Yes
- Vertical Scrolling: Enabled
- Only action: "Close" button

**Backend**:
- Service: `getSAPPartnerDetails(sapBpNumber: String)`
- Returns structured data:
  ```typescript
  {
    sapBpNumber: String,
    partnerName: String,
    partnerRole: String,
    status: String,
    satelliteSystemId: String,
    addresses: [{
      street, city, country, postalCode, addressType
    }],
    taxNumbers: [{
      country, taxType, taxNumber
    }],
    bankAccounts: [{
      bankName, bankCountry, iban, accountNumber, swiftCode
    }],
    contacts: {
      email, phone, fax
    }
  }
  ```

### Feature 3: Change Request from SAP Partner

**Purpose**: Create a change request for an existing SAP Business Partner.

**Location**: List Report toolbar

**Button**: "Change" (Emphasized)

**Workflow**:
1. Click "Change" button
2. Search dialog opens (same as View)
3. Search and select partner
4. Click "Start Change Request"
5. System:
   - Calls `importSAPPartner(sapBpNumber)` action
   - Creates draft BusinessPartnerRequest with SAP data
   - Navigates to Object Page in **edit mode**
6. User modifies fields as needed
7. Saves draft

**Backend**:
- Service: `importSAPPartner(sapBpNumber: String)`
- Returns: `{ success: Boolean, message: String, data: {...} }`
- Data populated from SAP into draft request

**Key Difference from View**:
- **Change**: Creates draft, navigates to Object Page (editable)
- **View**: Shows read-only dialog, no draft created

### Feature 4: SAP Partner Search

**Purpose**: Unified search interface for finding SAP Business Partners.

**Search Criteria**:
- Partner Name (fuzzy search)
- SAP BP Number (exact match)
- VAT ID (exact match)
- Satellite System ID (exact match)

**Results Table Columns**:
- SAP BP Number
- Partner Name
- Partner Role
- VAT ID
- City
- Country
- Status

**Backend**:
- Service: `searchSAPPartners(partnerName?, sapBpNumber?, vatId?, satelliteSystemId?)`
- Mock Implementation: `srv/integration/sap-mock.js::searchPartners()`
- Returns array of matching partners

### SAP Mock Service

**Location**: `srv/integration/sap-mock.js`

**Purpose**: Simulates SAP S/4HANA Business Partner API for development.

**Mock Data**: 10 predefined Business Partners including:
- Global Trade Inc (0000100003)
- Acme Corp (REQ001)  
- Globex Inc (REQ002)
- Tech Solutions GmbH
- European Distributors Ltd
- ...and 5 more

**Features**:
- Realistic SAP data structure
- Multiple addresses per partner
- Multiple tax numbers per partner
- Multiple bank accounts per partner
- Fuzzy search implementation
- Duplicate detection with scoring
- Authorization group handling (Blocked status)

**Future Integration**:
Replace with real SAP OData service:
- Service: `API_BUSINESS_PARTNER` (A2X OData)  
- Entities: `A_BusinessPartner`, `A_BusinessPartnerAddress`, `A_BusinessPartnerTaxNumber`, `A_BusinessPartnerBank`

---

## Admin Configuration App

### Purpose
Centralized configuration management for system-wide settings, mappings, and value lists used across all MDM Request Hub applications.

### Target Persona
System Administrators and MDM Team leads

### App Structure

#### List Report: Configuration Overview
Table showing all configuration categories:
- Request Types
- Source Systems
- Payment Terms
- Payment Methods
- Business Channels
- Workflow Steps
- User Roles

**Columns**:
- Configuration Type
- Total Entries
- Last Modified
- Status (Active/Inactive)

#### Object Page: Configuration Details

**Sections**:

##### 1. Request Types Management
Manage request type mappings (Create/Change/Delete/Block/Unblock).

**Fields**:
- Code (Key, 10 chars)
- Description (100 chars)
- Is Active (Boolean)
- Satellite System (Association to SourceSystems)
- Default Priority (High/Medium/Low)
- Requires Documentation (Boolean)

**Actions**:
- Activate/Deactivate
- Set as Default

##### 2. Source Systems Registry
Register and manage satellite systems integrated with MDM.

**Fields**:
- System ID (Key, 20 chars)
- System Name (e.g., "Coupa", "Salesforce", "SAP PI")
- System Type (Enum: Financial/CRM/BI/Other)
- API Endpoint URL
- Authentication Type (OAuth2/BasicAuth/Certificate)
- Is Active (Boolean)
- Owner Email
- Notification Email List

**Actions**:
- Test Connection
- View Audit Log
- Enable/Disable

##### 3. Payment Terms Catalog
Manage payment term codes and descriptions.

**Fields**:
- Payment Term Code (Key, 4 chars, SAP standard like "Z001")
- Description (e.g., "Net 30 Days")
- Days Count (Integer)
- Discount Percentage (Decimal)
- Is Active (Boolean)
- Valid From/To Dates

**Actions**:
- Mass Upload (Excel template)
- Export Current

##### 4. Payment Methods Registry
Configure accepted payment methods.

**Fields**:
- Payment Method Code (Key, 10 chars)
- Description (e.g., "Wire Transfer", "Check", "ACH")
- Requires Bank Details (Boolean)
- Is Active (Boolean)
- Country Restriction (Multi-select)

##### 5. Business Channels Configuration
Define business channels for partner requests.

**Fields**:
- Channel Code (Key, 10 chars)
- Channel Name (e.g., "Direct", "Distributor", "Online")
- Description (Text)
- Is Active (Boolean)
- Default Commission Percentage

##### 6. Workflow Steps Configuration
Configure workflow states and transitions.

**Fields**:
- Step ID (Key, UUID)
- Step Name (NEW/SUBMITTED/APPROVED/etc.)
- Display Order (Integer)
- Allowed Roles (Multi-select: BusinessUser/MDMApprover/SystemOwner)
- Next Possible Steps (Multi-select)
- Is Terminal State (Boolean)
- Notification Template ID

**Actions**:
- Preview Workflow Diagram
- Test Transitions

##### 7. User Role Assignments
Manage user-to-role mappings.

**Fields**:
- User ID (Email)
- Assigned Roles (Multi-select: BusinessUser/MDMApprover/SystemOwner)
- Satellite Systems (Multi-select, for BusinessUser/SystemOwner roles)
- Is Active (Boolean)
- Valid From/To Dates

**Actions**:
- Bulk Import Users
- Export Current Assignments
- Send Welcome Email

### Implementation Status

| Configuration Area | Status | Priority |
|-------------------|--------|----------|
| Request Types | ⚠️ Entity Defined, No UI | HIGH |
| Source Systems | ⚠️ Entity Defined, No UI | HIGH |
| Payment Terms | ⚠️ Entity Defined, No UI | MEDIUM |
| Payment Methods | ⚠️ Entity Defined, No UI | MEDIUM |
| Business Channels | ⚠️ Entity Defined, No UI | MEDIUM |
| Workflow Steps | ⚠️ Entity Defined, No UI | LOW |
| User Roles | ❌ Not Implemented | LOW |

### Technical Implementation

**Service**: `srv/mdm-service.cds` - ConfigurationService

**Entities**:
```cds
entity RequestTypes {
  key code: String(10);
  description: String(100);
  isActive: Boolean;
  satelliteSystem: Association to SourceSystems;
  defaultPriority: String(10);
  requiresDocumentation: Boolean;
}

entity SourceSystems {
  key systemId: String(20);
  systemName: String(100);
  systemType: String(20);
  apiEndpoint: String(500);
  authenticationType: String(20);
  isActive: Boolean;
  ownerEmail: String(100);
  notificationEmails: String(500);
}

// ... similar for PaymentTerms, PaymentMethods, BusinessChannels, WorkflowSteps
```

**UI Application**:
- App Folder: `app/admin-config/` (to be created)
- Type: Fiori Elements V4 List Report + Object Page
- Service: `ConfigurationService`

**Authorization**:
- Restrict to administrators only
- Audit all configuration changes
- Version control for critical settings

---


## Conclusion

This requirements document serves as the complete specification for the MDM Request Hub application. It combines:
- **Detailed functional requirements** from MDM app.pdf
- **Complete field specifications** with SAP tech names
- **Validation rules** with code examples
- **Implementation status tracking** showing what's built vs. planned

**Current Progress**: ~30% complete (foundation solid, UI layer incomplete)

**Next Milestone**: Complete Coupa application with full creation form and change request support

### Dropdown & Value List Specifications

| Field | Entity | Type | Allowed Values / Source |
|-------|--------|------|-------------------------|
| **Address Type** | PartnerAddresses | Enum | `Main`, `Shipping`, `Billing`, `Correspondence` |
| **Email Type** | PartnerEmails | Enum | `Work`, `Finance`, `Sales`, `Support`, `Personal` |
| **VAT Type** | PartnerVatIds | Enum | `Standard`, `Reduced`, `Zero`, `Exempt` |
| **Tax ID Type** | PartnerVatIds | Enum | `VAT` (Value Added Tax), `TIN` (Tax ID Number) |
| **Document Type** | RequestAttachments | Enum | `Invoice`, `Contract`, `TaxCert`, `BankLetter`, `Other` |
| **Country** | All | Value List | SAP Country Codes (I_Country) |
| **Currency** | All | Value List | SAP Currency Codes (I_Currency) |


**Questions or clarifications**: Contact MDM team or refer to MDM app.pdf source document
using MDMService as service from '../../srv/mdm-service';
using from './field-annotations';

// SAP Business Partner API Integration Annotations
annotate service.A_BusinessPartner with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: BusinessPartner, Label: 'Business Partner' },
        { $Type: 'UI.DataField', Value: BusinessPartnerFullName, Label: 'Full Name' },
        { $Type: 'UI.DataField', Value: BusinessPartnerCategory, Label: 'Category' },
        { $Type: 'UI.DataField', Value: Supplier, Label: 'Supplier Number' },
        { $Type: 'UI.DataField', Value: Customer, Label: 'Customer Number' },
        { $Type: 'UI.DataField', Value: SearchTerm1, Label: 'Search Term' },
        { $Type: 'UI.DataField', Value: BusinessPartnerIsBlocked, Label: 'Blocked' }
    ],
    UI.HeaderInfo: {
        $Type: 'UI.HeaderInfoType',
        TypeName: 'SAP Business Partner',
        TypeNamePlural: 'SAP Business Partners',
        Title: { $Type: 'UI.DataField', Value: BusinessPartnerFullName },
        Description: { $Type: 'UI.DataField', Value: BusinessPartner }
    },
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'GeneralInfoFacet',
            Label: 'General Information',
            Target: '@UI.FieldGroup#GeneralInfo'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'AddressesFacet',
            Label: 'Addresses',
            Target: 'addresses/@UI.LineItem'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'BanksFacet',
            Label: 'Bank Details',
            Target: 'banks/@UI.LineItem'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'TaxNumbersFacet',
            Label: 'Tax Numbers',
            Target: 'taxNumbers/@UI.LineItem'
        }
    ],
    UI.FieldGroup#GeneralInfo: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Value: BusinessPartner },
            { $Type: 'UI.DataField', Value: BusinessPartnerFullName },
            { $Type: 'UI.DataField', Value: BusinessPartnerCategory },
            { $Type: 'UI.DataField', Value: BusinessPartnerType },
            { $Type: 'UI.DataField', Value: SearchTerm1 },
            { $Type: 'UI.DataField', Value: SearchTerm2 },
            { $Type: 'UI.DataField', Value: CreationDate },
            { $Type: 'UI.DataField', Value: CreatedByUser },
            { $Type: 'UI.DataField', Value: BusinessPartnerIsBlocked }
        ]
    }
);

// SAP Business Partner Address Annotations
annotate service.A_BusinessPartnerAddress with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: AddressID, Label: 'Address ID' },
        { $Type: 'UI.DataField', Value: StreetName, Label: 'Street' },
        { $Type: 'UI.DataField', Value: HouseNumber, Label: 'House Number' },
        { $Type: 'UI.DataField', Value: CityName, Label: 'City' },
        { $Type: 'UI.DataField', Value: PostalCode, Label: 'Postal Code' },
        { $Type: 'UI.DataField', Value: Country, Label: 'Country' },
        { $Type: 'UI.DataField', Value: Region, Label: 'Region' }
    ]
);

// SAP Supplier Annotations
annotate service.A_Supplier with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: Supplier, Label: 'Supplier Number' },
        { $Type: 'UI.DataField', Value: SupplierFullName, Label: 'Supplier Name' },
        { $Type: 'UI.DataField', Value: SupplierAccountGroup, Label: 'Account Group' },
        { $Type: 'UI.DataField', Value: VATRegistration, Label: 'VAT Registration' },
        { $Type: 'UI.DataField', Value: PostingIsBlocked, Label: 'Posting Blocked' },
        { $Type: 'UI.DataField', Value: PurchasingIsBlocked, Label: 'Purchasing Blocked' }
    ]
);

// SAP Customer Annotations
annotate service.A_Customer with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: Customer, Label: 'Customer Number' },
        { $Type: 'UI.DataField', Value: CustomerFullName, Label: 'Customer Name' },
        { $Type: 'UI.DataField', Value: CustomerAccountGroup, Label: 'Account Group' },
        { $Type: 'UI.DataField', Value: VATRegistration, Label: 'VAT Registration' },
        { $Type: 'UI.DataField', Value: PostingIsBlocked, Label: 'Posting Blocked' }
    ]
);

// Enhanced Business Partner Requests with Actions
annotate service.BusinessPartnerRequests with @(
    UI.Identification: [
        { $Type: 'UI.DataField', Value: requestNumber },
        { $Type: 'UI.DataField', Value: partnerName },
        { $Type: 'UI.DataField', Value: status },
    ],
    UI.SelectionFields: [
        status,
        sourceSystem,
        entityType,
        createdAt
    ],
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: requestNumber, Label: 'Request Number' },
        { $Type: 'UI.DataField', Value: partnerName, Label: 'Partner Name' },
        { $Type: 'UI.DataField', Value: entityType, Label: 'Type' },
        { $Type: 'UI.DataField', Value: requestType, Label: 'Request Type' },
        { $Type: 'UI.DataField', Value: sourceSystem, Label: 'Source System' },
        { $Type: 'UI.DataField', Value: status, Label: 'Status' },
        { $Type: 'UI.DataField', Value: aebComplianceStatus, Label: 'AEB Status' },
        { $Type: 'UI.DataField', Value: viesValidationStatus, Label: 'VIES Status' },
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Created Date' },
        { $Type: 'UI.DataField', Value: requesterId, Label: 'Requester' },
        { $Type: 'UI.DataFieldForAction', Action: 'MDMService.checkEstablishedVatDuplicates', Label: 'Check Duplicates', IconUrl: 'sap-icon://duplicate' },
        { $Type: 'UI.DataFieldForAction', Action: 'MDMService.performComplianceCheck', Label: 'Compliance Check', IconUrl: 'sap-icon://validate' },
        { $Type: 'UI.DataFieldForAction', Action: 'MDMService.approveRequest', Label: 'Approve', IconUrl: 'sap-icon://accept' },
        { $Type: 'UI.DataFieldForAction', Action: 'MDMService.rejectRequest', Label: 'Reject', IconUrl: 'sap-icon://decline' }
    ],
    UI.HeaderInfo: {
        $Type: 'UI.HeaderInfoType',
        TypeName: 'Business Partner Request',
        TypeNamePlural: 'Business Partner Requests',
        Title: { $Type: 'UI.DataField', Value: partnerName },
        Description: { $Type: 'UI.DataField', Value: requestNumber }
    },
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'BasicInfoFacet',
            Label: 'Basic Information',
            Target: '@UI.FieldGroup#BasicInfo'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'AddressesFacet',
            Label: 'Addresses',
            Target: 'addresses/@UI.LineItem'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'EmailsFacet',
            Label: 'Email Addresses',
            Target: 'emails/@UI.LineItem'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'BanksFacet',
            Label: 'Bank Details',
            Target: 'banks/@UI.LineItem'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'VatIdsFacet',
            Label: 'VAT IDs',
            Target: 'vatIds/@UI.LineItem'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'ComplianceFacet',
            Label: 'Compliance Status',
            Target: '@UI.FieldGroup#Compliance'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'AttachmentsFacet',
            Label: 'Documents',
            Target: 'attachments/@UI.LineItem'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'ApprovalHistoryFacet',
            Label: 'Approval History',
            Target: 'approvalHistory/@UI.LineItem'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'DuplicateChecksFacet',
            Label: 'Duplicate Review',
            Target: 'duplicateChecks/@UI.LineItem'
        }
    ],
    UI.FieldGroup#BasicInfo: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Value: requestNumber },
            { $Type: 'UI.DataField', Value: partnerName },
            { $Type: 'UI.DataField', Value: entityType },
            { $Type: 'UI.DataField', Value: requestType },
            { $Type: 'UI.DataField', Value: sourceSystem },
            { $Type: 'UI.DataField', Value: partnerRole },
            { $Type: 'UI.DataField', Value: businessChannels },
            { $Type: 'UI.DataField', Value: coupaInternalNo },
            { $Type: 'UI.DataField', Value: salesforceId },
            { $Type: 'UI.DataField', Value: piId },
            { $Type: 'UI.DataField', Value: paymentTerms },
            { $Type: 'UI.DataField', Value: paymentMethod },
            { $Type: 'UI.DataField', Value: reconAccount },
            { $Type: 'UI.DataField', Value: requesterId },
            { $Type: 'UI.DataField', Value: requesterName },
            { $Type: 'UI.DataField', Value: comments }
        ]
    },
    UI.FieldGroup#Compliance: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Value: aebComplianceStatus },
            { $Type: 'UI.DataField', Value: aebComplianceDetails },
            { $Type: 'UI.DataField', Value: viesValidationStatus },
            { $Type: 'UI.DataField', Value: viesValidationDetails },
            { $Type: 'UI.DataField', Value: kycCompleted },
            { $Type: 'UI.DataField', Value: kycCompletedBy },
            { $Type: 'UI.DataField', Value: kycCompletedAt },
            { $Type: 'UI.DataField', Value: approvedBy },
            { $Type: 'UI.DataField', Value: approvedAt },
            { $Type: 'UI.DataField', Value: sapBpNumber }
        ]
    }
);

// Field Annotations for BusinessPartnerRequests
annotate service.BusinessPartnerRequests with {
    partnerName @(
        Common.Label: 'Partner Name',
        Common.FieldControl: #Mandatory
    );
    entityType @(
        Common.Label: 'Entity Type',
        Common.ValueListWithFixedValues: true,
        Common.ValueList: {
            $Type: 'Common.ValueListType',
            CollectionPath: 'BusinessPartnerRequests',
            Parameters: [
                {
                    $Type: 'Common.ValueListParameterInOut',
                    LocalDataProperty: entityType,
                    ValueListProperty: 'entityType'
                }
            ]
        }
    );
    requestType @(
        Common.Label: 'Request Type',
        Common.ValueListWithFixedValues: true
    );
    sourceSystem @(
        Common.Label: 'Source System',
        Common.ValueListWithFixedValues: true
    );
    status @(
        Common.Label: 'Status',
        Common.ValueListWithFixedValues: true
    );
    partnerRole @(
        Common.Label: 'Partner Role'
    );
    businessChannels @(
        Common.Label: 'Business Channels'
    );
    paymentTerms @(
        Common.Label: 'Payment Terms',
        Common.ValueListWithFixedValues: true
    );
    paymentMethod @(
        Common.Label: 'Payment Method',
        Common.ValueListWithFixedValues: true
    );
    currency_code @(
        Common.Label: 'Currency'
    );
    companyCode @(
        Common.Label: 'Company Code'
    );
    reconAccount @(
        Common.Label: 'Reconciliation Account'
    );
    communicationLanguage @(
        Common.Label: 'Communication Language'
    );
};

// Addresses annotations
annotate service.PartnerAddresses with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: addressType, Label: 'Type' },
        { $Type: 'UI.DataField', Value: name1, Label: 'Name 1' },
        { $Type: 'UI.DataField', Value: street, Label: 'Street' },
        { $Type: 'UI.DataField', Value: city, Label: 'City' },
        { $Type: 'UI.DataField', Value: postalCode, Label: 'Postal Code' },
        { $Type: 'UI.DataField', Value: country_code, Label: 'Country' },
        { $Type: 'UI.DataField', Value: isDefault, Label: 'Default' }
    ],
    UI.HeaderInfo: {
        $Type: 'UI.HeaderInfoType',
        TypeName: 'Address',
        TypeNamePlural: 'Addresses',
        Title: { $Type: 'UI.DataField', Value: addressType },
        Description: { $Type: 'UI.DataField', Value: name1 }
    }
);

// Emails annotations
annotate service.PartnerEmails with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: emailType, Label: 'Type' },
        { $Type: 'UI.DataField', Value: emailAddress, Label: 'Email Address' },
        { $Type: 'UI.DataField', Value: notes, Label: 'Notes' },
        { $Type: 'UI.DataField', Value: isDefault, Label: 'Default' }
    ],
    UI.HeaderInfo: {
        $Type: 'UI.HeaderInfoType',
        TypeName: 'Email',
        TypeNamePlural: 'Emails',
        Title: { $Type: 'UI.DataField', Value: emailAddress },
        Description: { $Type: 'UI.DataField', Value: emailType }
    }

annotate service.PartnerEmails with {
    emailType @Common.Label: 'Email Type';
    emailAddress @(
        Common.Label: 'Email Address',
        Common.FieldControl: #Mandatory
    );
    notes @Common.Label: 'Notes';
};

// Banks annotations
annotate service.PartnerBanks with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: bankName, Label: 'Bank Name' },
        { $Type: 'UI.DataField', Value: accountNumber, Label: 'Account Number' },
        { $Type: 'UI.DataField', Value: iban, Label: 'IBAN' },
        { $Type: 'UI.DataField', Value: swiftCode, Label: 'SWIFT Code' },
        { $Type: 'UI.DataField', Value: currency_code, Label: 'Currency' },
        { $Type: 'UI.DataField', Value: bankCountry_code, Label: 'Bank Country' },
        { $Type: 'UI.DataField', Value: isDefault, Label: 'Default' }
    ],
    UI.HeaderInfo: {
        $Type: 'UI.HeaderInfoType',
        TypeName: 'Bank Account',
        TypeNamePlural: 'Bank Accounts',
        Title: { $Type: 'UI.DataField', Value: bankName },
        Description: { $Type: 'UI.DataField', Value: accountNumber }
    }
);

// VAT IDs annotations
annotate service.PartnerVatIds with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: country_code, Label: 'Country' },
        { $Type: 'UI.DataField', Value: vatNumber, Label: 'VAT Number' },
        { $Type: 'UI.DataField', Value: vatType, Label: 'VAT Type' },
        { $Type: 'UI.DataField', Value: validationStatus, Label: 'Validation Status' },
        { $Type: 'UI.DataField', Value: validationDate, Label: 'Validated On' },
        { $Type: 'UI.DataField', Value: isDefault, Label: 'Default' }
    ],
    UI.HeaderInfo: {
        $Type: 'UI.HeaderInfoType',
        TypeName: 'VAT ID',
        TypeNamePlural: 'VAT IDs',
        Title: { $Type: 'UI.DataField', Value: vatNumber },
        Description: { $Type: 'UI.DataField', Value: country_code }
    }
);

// Attachments annotations
annotate service.RequestAttachments with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: fileName, Label: 'File Name' },
        { $Type: 'UI.DataField', Value: documentType, Label: 'Document Type' },
        { $Type: 'UI.DataField', Value: fileSize, Label: 'File Size' },
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Uploaded On' },
        { $Type: 'UI.DataField', Value: createdBy, Label: 'Uploaded By' }
    ]
);

// Approval History annotations
annotate service.ApprovalHistory with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Date/Time' },
        { $Type: 'UI.DataField', Value: approverName, Label: 'Approver' },
        { $Type: 'UI.DataField', Value: action, Label: 'Action' },
        { $Type: 'UI.DataField', Value: previousStatus, Label: 'From Status' },
        { $Type: 'UI.DataField', Value: newStatus, Label: 'To Status' },
        { $Type: 'UI.DataField', Value: comments, Label: 'Comments' }
    ]
);

// Duplicate Checks annotations
annotate service.DuplicateChecks with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: matchType, Label: 'Match Type' },
        { $Type: 'UI.DataField', Value: matchScore, Label: 'Match Score %' },
        { $Type: 'UI.DataField', Value: existingBpNumber, Label: 'Existing BP Number' },
        { $Type: 'UI.DataField', Value: existingBpName, Label: 'Existing BP Name' },
        { $Type: 'UI.DataField', Value: establishedVatId, Label: 'Established VAT ID' },
        { $Type: 'UI.DataField', Value: establishedCountry, Label: 'Country' },
        { $Type: 'UI.DataField', Value: partnerStatus, Label: 'Partner Status' },
        { $Type: 'UI.DataField', Value: mergeDecision, Label: 'Decision' },
        { $Type: 'UI.DataField', Value: reviewRequired, Label: 'Review Required' },
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Checked On' }
    ],
    UI.HeaderInfo: {
        $Type: 'UI.HeaderInfoType',
        TypeName: 'Duplicate Check',
        TypeNamePlural: 'Duplicate Checks',
        Title: { $Type: 'UI.DataField', Value: existingBpName },
        Description: { $Type: 'UI.DataField', Value: matchDetails }
    },
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'DuplicateDetailsFacet',
            Label: 'Duplicate Details',
            Target: '@UI.FieldGroup#DuplicateDetails'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'MergeDecisionFacet',
            Label: 'Merge Decision',
            Target: '@UI.FieldGroup#MergeDecision'
        }
    ],
    UI.FieldGroup#DuplicateDetails: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Value: matchType },
            { $Type: 'UI.DataField', Value: matchScore },
            { $Type: 'UI.DataField', Value: existingBpNumber },
            { $Type: 'UI.DataField', Value: existingBpName },
            { $Type: 'UI.DataField', Value: establishedVatId },
            { $Type: 'UI.DataField', Value: establishedCountry },
            { $Type: 'UI.DataField', Value: partnerStatus },
            { $Type: 'UI.DataField', Value: lastUpdated },
            { $Type: 'UI.DataField', Value: matchDetails }
        ]
    },
    UI.FieldGroup#MergeDecision: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Value: mergeDecision },
            { $Type: 'UI.DataField', Value: mergeDecisionBy },
            { $Type: 'UI.DataField', Value: mergeDecisionAt },
            { $Type: 'UI.DataField', Value: mergeComments }
        ]
    }
);

// Existing Partners annotations
annotate service.ExistingPartners with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: sapBpNumber, Label: 'SAP BP Number' },
        { $Type: 'UI.DataField', Value: partnerName, Label: 'Partner Name' },
        { $Type: 'UI.DataField', Value: partnerType, Label: 'Type' },
        { $Type: 'UI.DataField', Value: status, Label: 'Status' },
        { $Type: 'UI.DataField', Value: establishedVatId, Label: 'Established VAT ID' },
        { $Type: 'UI.DataField', Value: establishedCountry, Label: 'Country' },
        { $Type: 'UI.DataField', Value: sourceSystem, Label: 'Source System' },
        { $Type: 'UI.DataField', Value: businessChannels, Label: 'Business Channels' },
        { $Type: 'UI.DataField', Value: lastUpdated, Label: 'Last Updated' }
    ],
    UI.HeaderInfo: {
        $Type: 'UI.HeaderInfoType',
        TypeName: 'Existing Partner',
        TypeNamePlural: 'Existing Partners',
        Title: { $Type: 'UI.DataField', Value: partnerName },
        Description: { $Type: 'UI.DataField', Value: sapBpNumber }
    }
);
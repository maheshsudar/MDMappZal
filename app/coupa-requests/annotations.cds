using MDMService as service from '../../srv/mdm-service';

annotate service.CoupaRequests with @(
    UI.Identification: [
        { $Type: 'UI.DataField', Value: requestNumber },
        { $Type: 'UI.DataField', Value: partnerName },
        { $Type: 'UI.DataField', Value: status }
    ],
    UI.SelectionFields: [
        status,
        vendorClassification,
        createdAt
    ],
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: requestNumber, Label: 'Request Number' },
        { $Type: 'UI.DataField', Value: partnerName, Label: 'Supplier Name' },
        { $Type: 'UI.DataField', Value: entityType, Label: 'Type' },
        { $Type: 'UI.DataField', Value: requestType, Label: 'Request Type' },
        { $Type: 'UI.DataField', Value: status, Label: 'Status' },
        { $Type: 'UI.DataField', Value: vendorClassification, Label: 'Classification' },
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Created Date' },
        { $Type: 'UI.DataField', Value: requesterId, Label: 'Requester' }
    ],
    UI.HeaderInfo: {
        $Type: 'UI.HeaderInfoType',
        TypeName: 'Supplier Request',
        TypeNamePlural: 'Supplier Requests',
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
            ID: 'CoupaSpecificsFacet',
            Label: 'Procurement Details',
            Target: '@UI.FieldGroup#CoupaSpecifics'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'AddressesFacet',
            Label: 'Addresses',
            Target: 'addresses/@UI.LineItem'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'VatIdsFacet',
            Label: 'VAT IDs',
            Target: 'vatIds/@UI.LineItem'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'BanksFacet',
            Label: 'Bank Accounts',
            Target: 'banks/@UI.LineItem'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'EmailsFacet',
            Label: 'Email Addresses',
            Target: 'emails/@UI.LineItem'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'PaymentInfoFacet',
            Label: 'Payment Information',
            Target: '@UI.FieldGroup#PaymentInfo'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'DocumentsFacet',
            Label: 'Documents',
            Target: 'attachments/@UI.LineItem'
        }
    ],
    UI.FieldGroup#BasicInfo: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Value: requestNumber, Label: 'Request Number' },
            { $Type: 'UI.DataField', Value: sourceSystem, Label: 'System' },
            { $Type: 'UI.DataField', Value: coupaInternalNo, Label: 'Internal ID' },
            { $Type: 'UI.DataField', Value: partnerName, Label: 'Name' },
            { $Type: 'UI.DataField', Value: entityType, Label: 'Entity Type' },
            { $Type: 'UI.DataField', Value: requestType, Label: 'Request Type' },
            { $Type: 'UI.DataField', Value: searchTerm, Label: 'Search Term' },
            { $Type: 'UI.DataField', Value: requesterName, Label: 'Requester Name' },
            { $Type: 'UI.DataField', Value: requesterEmail, Label: 'Requester Email' },
            { $Type: 'UI.DataField', Value: comments, Label: 'Comments' }
        ]
    },
    UI.FieldGroup#CoupaSpecifics: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Value: vendorClassification, Label: 'Vendor Classification' },
            { $Type: 'UI.DataField', Value: purchaseCategories, Label: 'Purchase Categories' },
            { $Type: 'UI.DataField', Value: spendThreshold, Label: 'Spend Threshold' },
            { $Type: 'UI.DataField', Value: procurementContact, Label: 'Procurement Contact' },
            { $Type: 'UI.DataField', Value: businessChannels, Label: 'Business Channels' }
        ]
    },
    UI.FieldGroup#PaymentInfo: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Value: paymentTerms, Label: 'Payment Terms' },
            { $Type: 'UI.DataField', Value: paymentMethod, Label: 'Payment Method' },
            { $Type: 'UI.DataField', Value: currency_code, Label: 'Currency' },
            { $Type: 'UI.DataField', Value: companyCode, Label: 'Company Code' },
            { $Type: 'UI.DataField', Value: withholdingTax, Label: 'Withholding Tax' },
            { $Type: 'UI.DataField', Value: reconAccount, Label: 'Reconciliation Account' }
        ]
    }
);

// Address annotations for Coupa
annotate service.PartnerAddresses with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: addressType, Label: 'Type' },
        { $Type: 'UI.DataField', Value: isEstablished, Label: 'Established' },
        { $Type: 'UI.DataField', Value: name1, Label: 'Name 1' },
        { $Type: 'UI.DataField', Value: street, Label: 'Street' },
        { $Type: 'UI.DataField', Value: streetNumber, Label: 'Number' },
        { $Type: 'UI.DataField', Value: city, Label: 'City' },
        { $Type: 'UI.DataField', Value: postalCode, Label: 'Postal Code' },
        { $Type: 'UI.DataField', Value: region, Label: 'Region' },
        { $Type: 'UI.DataField', Value: country_code, Label: 'Country' },
        { $Type: 'UI.DataField', Value: isDefault, Label: 'Default' }
    ]
);

// Attachment annotations
annotate service.RequestAttachments with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: documentType, Label: 'Document Type' },
        { $Type: 'UI.DataField', Value: fileName, Label: 'File Name' },
        { $Type: 'UI.DataField', Value: fileSize, Label: 'Size (Bytes)' },
        { $Type: 'UI.DataField', Value: description, Label: 'Description' },
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Uploaded At' },
        { $Type: 'UI.DataField', Value: createdBy, Label: 'Uploaded By' }
    ]
);

// VAT ID annotations
annotate service.PartnerVatIds with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: isEstablished, Label: 'Established' },
        { $Type: 'UI.DataField', Value: country_code, Label: 'Country' },
        { $Type: 'UI.DataField', Value: vatNumber, Label: 'VAT Number' },
        { $Type: 'UI.DataField', Value: vatType, Label: 'VAT Type' },
        { $Type: 'UI.DataField', Value: validationStatus, Label: 'Validation Status' },
        { $Type: 'UI.DataField', Value: validationDate, Label: 'Validation Date' },
        { $Type: 'UI.DataField', Value: isDefault, Label: 'Default' }
    ]
);

// Bank annotations
annotate service.PartnerBanks with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: bankCountry_code, Label: 'Bank Country' },
        { $Type: 'UI.DataField', Value: bankName, Label: 'Bank Name' },
        { $Type: 'UI.DataField', Value: accountHolder, Label: 'Account Holder' },
        { $Type: 'UI.DataField', Value: accountNumber, Label: 'Account Number' },
        { $Type: 'UI.DataField', Value: iban, Label: 'IBAN' },
        { $Type: 'UI.DataField', Value: swiftCode, Label: 'SWIFT/BIC' },
        { $Type: 'UI.DataField', Value: currency_code, Label: 'Currency' },
        { $Type: 'UI.DataField', Value: isDefault, Label: 'Default' }
    ]
);

// Email annotations
annotate service.PartnerEmails with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: emailType, Label: 'Type' },
        { $Type: 'UI.DataField', Value: emailAddress, Label: 'Email Address' },
        { $Type: 'UI.DataField', Value: notes, Label: 'Notes' },
        { $Type: 'UI.DataField', Value: isDefault, Label: 'Default' }
    ]
);

using MDMService as service from '../../srv/mdm-service';

annotate service.SalesforceRequests with @(
    UI.Identification: [
        { $Type: 'UI.DataField', Value: requestNumber },
        { $Type: 'UI.DataField', Value: partnerName },
        { $Type: 'UI.DataField', Value: status }
    ],
    UI.SelectionFields: [
        status,
        accountType,
        industry,
        createdAt
    ],
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: requestNumber, Label: 'Request Number' },
        { $Type: 'UI.DataField', Value: partnerName, Label: 'Customer Name' },
        { $Type: 'UI.DataField', Value: entityType, Label: 'Type' },
        { $Type: 'UI.DataField', Value: requestType, Label: 'Request Type' },
        { $Type: 'UI.DataField', Value: status, Label: 'Status' },
        { $Type: 'UI.DataField', Value: accountType, Label: 'Account Type' },
        { $Type: 'UI.DataField', Value: industry, Label: 'Industry' },
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Created Date' },
        { $Type: 'UI.DataField', Value: requesterId, Label: 'Requester' }
    ],
    UI.HeaderInfo: {
        $Type: 'UI.HeaderInfoType',
        TypeName: 'Customer Request',
        TypeNamePlural: 'Customer Requests',
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
            ID: 'SalesforceSpecificsFacet',
            Label: 'CRM Details',
            Target: '@UI.FieldGroup#SalesforceSpecifics'
        },
        {
            $Type: 'UI.ReferenceFacet',
            ID: 'AddressesFacet',
            Label: 'Addresses',
            Target: 'addresses/@UI.LineItem'
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
            { $Type: 'UI.DataField', Value: requesterName },
            { $Type: 'UI.DataField', Value: requesterId },
            { $Type: 'UI.DataField', Value: comments }
        ]
    },
    UI.FieldGroup#SalesforceSpecifics: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Value: accountType },
            { $Type: 'UI.DataField', Value: industry },
            { $Type: 'UI.DataField', Value: territory },
            { $Type: 'UI.DataField', Value: parentAccount },
            { $Type: 'UI.DataField', Value: opportunityIds },
            { $Type: 'UI.DataField', Value: salesOwner },
            { $Type: 'UI.DataField', Value: revenueband }
        ]
    }
);

// Address annotations for Salesforce
annotate service.PartnerAddresses with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: addressType, Label: 'Type' },
        { $Type: 'UI.DataField', Value: name1, Label: 'Name 1' },
        { $Type: 'UI.DataField', Value: street, Label: 'Street' },
        { $Type: 'UI.DataField', Value: city, Label: 'City' },
        { $Type: 'UI.DataField', Value: postalCode, Label: 'Postal Code' },
        { $Type: 'UI.DataField', Value: country_code, Label: 'Country' },
        { $Type: 'UI.DataField', Value: isDefault, Label: 'Default' }
    ]
);

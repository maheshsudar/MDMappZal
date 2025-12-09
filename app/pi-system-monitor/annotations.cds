using MDMService as service from '../../srv/mdm-service';

annotate service.PIRequests with @(
    UI.Identification: [
        { $Type: 'UI.DataField', Value: requestNumber },
        { $Type: 'UI.DataField', Value: partnerName },
        { $Type: 'UI.DataField', Value: status }
    ],
    UI.SelectionFields: [
        status,
        systemMapping,
        messageFormat,
        createdAt
    ],
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: requestNumber, Label: 'Request Number' },
        { $Type: 'UI.DataField', Value: partnerName, Label: 'Partner Name' },
        { $Type: 'UI.DataField', Value: entityType, Label: 'Type' },
        { $Type: 'UI.DataField', Value: requestType, Label: 'Request Type' },
        { $Type: 'UI.DataField', Value: status, Label: 'Status' },
        { $Type: 'UI.DataField', Value: systemMapping, Label: 'System Mapping' },
        { $Type: 'UI.DataField', Value: messageFormat, Label: 'Message Format' },
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Created Date' },
        { $Type: 'UI.DataField', Value: requesterId, Label: 'Requester' }
    ],
    UI.HeaderInfo: {
        $Type: 'UI.HeaderInfoType',
        TypeName: 'PI Request',
        TypeNamePlural: 'PI Requests',
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
            ID: 'PISpecificsFacet',
            Label: 'Integration Details',
            Target: '@UI.FieldGroup#PISpecifics'
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
    UI.FieldGroup#PISpecifics: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Value: systemMapping },
            { $Type: 'UI.DataField', Value: messageFormat },
            { $Type: 'UI.DataField', Value: routingRules },
            { $Type: 'UI.DataField', Value: transformationRules },
            { $Type: 'UI.DataField', Value: systemOwner },
            { $Type: 'UI.DataField', Value: businessDomain }
        ]
    }
);

// Address annotations for PI
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

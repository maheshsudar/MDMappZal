using MDMService as service from '../../srv/mdm-service';

annotate service.ChangeNotifications with @(
    UI.SelectionFields: [
        changeType,
        changedBySystem,
        notificationSent,
        notificationSentAt
    ],
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: bpNumber, Label: 'BP Number' },
        { $Type: 'UI.DataField', Value: bpName, Label: 'BP Name' },
        { $Type: 'UI.DataField', Value: changeType, Label: 'Change Type' },
        { $Type: 'UI.DataField', Value: changedBySystem, Label: 'Source System' },
        { $Type: 'UI.DataField', Value: notificationSent, Label: 'Notification Sent' },
        { $Type: 'UI.DataField', Value: notificationSentAt, Label: 'Sent At' },
        { $Type: 'UI.DataFieldForAction', Action: 'MDMService.acknowledgeNotification', Label: 'Acknowledge' }
    ],
    UI.HeaderInfo: {
        $Type: 'UI.HeaderInfoType',
        TypeName: 'Change Notification',
        TypeNamePlural: 'Change Notifications',
        Title: { $Type: 'UI.DataField', Value: bpName },
        Description: { $Type: 'UI.DataField', Value: bpNumber }
    },
    UI.Facets: [
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Change Details',
            Target: '@UI.FieldGroup#Details'
        },
        {
            $Type: 'UI.ReferenceFacet',
            Label: 'Acknowledgments',
            Target: 'acknowledgments/@UI.LineItem'
        }
    ],
    UI.FieldGroup#Details: {
        $Type: 'UI.FieldGroupType',
        Data: [
            { $Type: 'UI.DataField', Value: changeType, Label: 'Change Type' },
            { $Type: 'UI.DataField', Value: changedBySystem, Label: 'Changed By' },
            { $Type: 'UI.DataField', Value: impactedSystems, Label: 'Impacted Systems' },
            { $Type: 'UI.DataField', Value: fieldsChanged, Label: 'Fields Changed' },
            { $Type: 'UI.DataField', Value: changeDetails, Label: 'Details' }
        ]
    }
);

annotate service.NotificationAcknowledgments with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: systemOwnerName, Label: 'Acknowledged By' },
        { $Type: 'UI.DataField', Value: targetSystem, Label: 'Target System' },
        { $Type: 'UI.DataField', Value: acknowledgedAt, Label: 'Acknowledged At' },
        { $Type: 'UI.DataField', Value: comments, Label: 'Comments' }
    ]
);

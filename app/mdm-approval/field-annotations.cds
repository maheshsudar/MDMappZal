// Additional field annotations for child entities

// Bank field annotations
annotate service.PartnerBanks with {
    bankName @Common.Label: 'Bank Name';
    accountNumber @(
        Common.Label: 'Account Number',
        Common.FieldControl: #Mandatory
    );
    iban @Common.Label: 'IBAN';
    swiftCode @Common.Label: 'SWIFT Code';
    bankCountry_code @Common.Label: 'Bank Country';
    currency_code @Common.Label: 'Currency';
};

// VAT ID field annotations
annotate service.PartnerVatIds with {
    country_code @(
        Common.Label: 'Country Code',
        Common.FieldControl: #Mandatory
    );
    vatNumber @(
        Common.Label: 'VAT Number',
        Common.FieldControl: #Mandatory
    );
    vatType @Common.Label: 'VAT Type';
    validationStatus @Common.Label: 'Validation Status';
    isEstablished @Common.Label: 'Established VAT ID';
};

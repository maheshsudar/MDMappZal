const axios = require('axios');
const soap = require('soap');

/**
 * VIES (VAT Information Exchange System) Integration Service
 * Provides VAT validation using the official EU VIES web service
 */
class VIESService {
    constructor() {
        this.VIES_WSDL_URL = 'http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl';
        this.VIES_ENDPOINT = 'http://ec.europa.eu/taxation_customs/vies/services/checkVatService';
        this.client = null;
    }

    /**
     * Initialize SOAP client for VIES service
     */
    async initialize() {
        try {
            if (!this.client) {
                this.client = await soap.createClientAsync(this.VIES_WSDL_URL);
                console.log('VIES SOAP client initialized successfully');
            }
            return this.client;
        } catch (error) {
            console.error('Failed to initialize VIES client:', error);
            throw new Error(`VIES service initialization failed: ${error.message}`);
        }
    }

    /**
     * Validate a single VAT number using VIES service
     * @param {string} countryCode - EU country code (e.g., 'DE', 'FR', 'NL')
     * @param {string} vatNumber - VAT number without country code
     * @returns {Promise<Object>} Validation result
     */
    async validateVATNumber(countryCode, vatNumber) {
        try {
            await this.initialize();

            // Clean the VAT number (remove spaces, dashes, etc.)
            const cleanVatNumber = this.cleanVATNumber(vatNumber);

            // Validate format first
            if (!this.isValidFormat(countryCode, cleanVatNumber)) {
                return {
                    valid: false,
                    countryCode,
                    vatNumber: cleanVatNumber,
                    requestDate: new Date().toISOString(),
                    errorMessage: 'Invalid VAT number format',
                    source: 'FORMAT_CHECK'
                };
            }

            // Call VIES service
            const result = await this.callVIESService(countryCode, cleanVatNumber);

            return {
                valid: result.valid,
                countryCode: result.countryCode,
                vatNumber: result.vatNumber,
                requestDate: result.requestDate,
                name: result.name || '',
                address: result.address || '',
                errorMessage: result.errorMessage || '',
                source: 'VIES_SERVICE',
                requestIdentifier: result.requestIdentifier || ''
            };

        } catch (error) {
            console.error('VIES validation error:', error);
            return {
                valid: false,
                countryCode,
                vatNumber,
                requestDate: new Date().toISOString(),
                errorMessage: `VIES service error: ${error.message}`,
                source: 'ERROR'
            };
        }
    }

    /**
     * Validate multiple VAT numbers in batch
     * @param {Array} vatNumbers - Array of {countryCode, vatNumber} objects
     * @returns {Promise<Array>} Array of validation results
     */
    async validateMultipleVATNumbers(vatNumbers) {
        const results = [];

        for (const vat of vatNumbers) {
            try {
                const result = await this.validateVATNumber(vat.countryCode, vat.vatNumber);
                results.push(result);

                // Add small delay to avoid overwhelming the VIES service
                await this.delay(200);
            } catch (error) {
                results.push({
                    valid: false,
                    countryCode: vat.countryCode,
                    vatNumber: vat.vatNumber,
                    errorMessage: error.message,
                    source: 'BATCH_ERROR'
                });
            }
        }

        return results;
    }

    /**
     * Call the actual VIES SOAP service
     * @private
     */
    async callVIESService(countryCode, vatNumber) {
        try {
            const args = {
                countryCode: countryCode.toUpperCase(),
                vatNumber: vatNumber
            };

            const [result] = await this.client.checkVatAsync(args);

            return {
                valid: result.valid || false,
                countryCode: result.countryCode || countryCode,
                vatNumber: result.vatNumber || vatNumber,
                requestDate: result.requestDate || new Date().toISOString(),
                name: result.name || '',
                address: result.address || '',
                requestIdentifier: result.requestIdentifier || ''
            };

        } catch (error) {
            // Handle VIES service specific errors
            if (error.message.includes('INVALID_INPUT')) {
                throw new Error('Invalid country code or VAT number format');
            } else if (error.message.includes('SERVICE_UNAVAILABLE')) {
                throw new Error('VIES service is currently unavailable');
            } else if (error.message.includes('MS_UNAVAILABLE')) {
                throw new Error('Member State service is unavailable');
            } else if (error.message.includes('TIMEOUT')) {
                throw new Error('Request timeout - please try again later');
            } else if (error.message.includes('SERVER_BUSY')) {
                throw new Error('VIES server is busy - please try again later');
            } else {
                throw new Error(`VIES service error: ${error.message}`);
            }
        }
    }

    /**
     * Clean VAT number by removing spaces, dashes, and other characters
     * @private
     */
    cleanVATNumber(vatNumber) {
        return vatNumber.replace(/[\s\-\.]/g, '').toUpperCase();
    }

    /**
     * Basic format validation for EU VAT numbers
     * @private
     */
    isValidFormat(countryCode, vatNumber) {
        const patterns = {
            'AT': /^U[0-9]{8}$/,                    // Austria
            'BE': /^[0-9]{10}$/,                    // Belgium
            'BG': /^[0-9]{9,10}$/,                  // Bulgaria
            'CY': /^[0-9]{8}[A-Z]$/,                // Cyprus
            'CZ': /^[0-9]{8,10}$/,                  // Czech Republic
            'DE': /^[0-9]{9}$/,                     // Germany
            'DK': /^[0-9]{8}$/,                     // Denmark
            'EE': /^[0-9]{9}$/,                     // Estonia
            'EL': /^[0-9]{9}$/,                     // Greece
            'ES': /^[0-9A-Z][0-9]{7}[0-9A-Z]$/,     // Spain
            'FI': /^[0-9]{8}$/,                     // Finland
            'FR': /^[0-9A-Z]{2}[0-9]{9}$/,          // France
            'HR': /^[0-9]{11}$/,                    // Croatia
            'HU': /^[0-9]{8}$/,                     // Hungary
            'IE': /^[0-9][A-Z0-9\+\*][0-9]{5}[A-Z]$/, // Ireland
            'IT': /^[0-9]{11}$/,                    // Italy
            'LT': /^([0-9]{9}|[0-9]{12})$/,         // Lithuania
            'LU': /^[0-9]{8}$/,                     // Luxembourg
            'LV': /^[0-9]{11}$/,                    // Latvia
            'MT': /^[0-9]{8}$/,                     // Malta
            'NL': /^[0-9]{9}B[0-9]{2}$/,            // Netherlands
            'PL': /^[0-9]{10}$/,                    // Poland
            'PT': /^[0-9]{9}$/,                     // Portugal
            'RO': /^[0-9]{2,10}$/,                  // Romania
            'SE': /^[0-9]{12}$/,                    // Sweden
            'SI': /^[0-9]{8}$/,                     // Slovenia
            'SK': /^[0-9]{10}$/                     // Slovakia
        };

        const pattern = patterns[countryCode.toUpperCase()];
        return pattern ? pattern.test(vatNumber) : false;
    }

    /**
     * Get supported EU country codes
     */
    getSupportedCountries() {
        return [
            { code: 'AT', name: 'Austria' },
            { code: 'BE', name: 'Belgium' },
            { code: 'BG', name: 'Bulgaria' },
            { code: 'CY', name: 'Cyprus' },
            { code: 'CZ', name: 'Czech Republic' },
            { code: 'DE', name: 'Germany' },
            { code: 'DK', name: 'Denmark' },
            { code: 'EE', name: 'Estonia' },
            { code: 'EL', name: 'Greece' },
            { code: 'ES', name: 'Spain' },
            { code: 'FI', name: 'Finland' },
            { code: 'FR', name: 'France' },
            { code: 'HR', name: 'Croatia' },
            { code: 'HU', name: 'Hungary' },
            { code: 'IE', name: 'Ireland' },
            { code: 'IT', name: 'Italy' },
            { code: 'LT', name: 'Lithuania' },
            { code: 'LU', name: 'Luxembourg' },
            { code: 'LV', name: 'Latvia' },
            { code: 'MT', name: 'Malta' },
            { code: 'NL', name: 'Netherlands' },
            { code: 'PL', name: 'Poland' },
            { code: 'PT', name: 'Portugal' },
            { code: 'RO', name: 'Romania' },
            { code: 'SE', name: 'Sweden' },
            { code: 'SI', name: 'Slovenia' },
            { code: 'SK', name: 'Slovakia' }
        ];
    }

    /**
     * Utility method to add delay
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if VIES service is available
     */
    async checkServiceStatus() {
        try {
            await this.initialize();
            return {
                available: true,
                message: 'VIES service is available',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                available: false,
                message: `VIES service unavailable: ${error.message}`,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = VIESService;
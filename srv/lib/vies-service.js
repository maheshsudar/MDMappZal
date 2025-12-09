const soap = require('soap');
const axios = require('axios');

/**
 * VIES (VAT Information Exchange System) Service Integration
 *
 * Implements EU VAT validation as per FR-004.2:
 * - Real-time VAT number validation for EU countries
 * - VAT format validation by country before VIES check
 * - Batch processing capability for multiple VAT IDs
 * - Service availability fallback handling
 * - Validation result caching to reduce API calls
 * - Support for non-EU VAT validation where applicable
 *
 * @class VIESService
 */
class VIESService {

  constructor() {
    this.viesWsdlUrl = 'http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl';
    this.viesServiceUrl = 'http://ec.europa.eu/taxation_customs/vies/services/checkVatService';
    this.timeout = 10000; // 10 seconds timeout
    this.retryAttempts = 2;
    this.cacheTTL = 24 * 60 * 60 * 1000; // 24 hours cache
    this.cache = new Map(); // Simple in-memory cache
    this.useMockService = process.env.NODE_ENV === 'development' || !process.env.VIES_ENABLED;

    // EU country codes supported by VIES
    this.euCountries = [
      'AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'ES',
      'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT',
      'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'
    ];

    // VAT number format validation patterns by country
    this.vatPatterns = {
      'AT': /^U[0-9]{8}$/,                    // Austria
      'BE': /^[0-9]{10}$/,                    // Belgium
      'BG': /^[0-9]{9,10}$/,                  // Bulgaria
      'CY': /^[0-9]{8}[A-Z]$/,                // Cyprus
      'CZ': /^[0-9]{8,10}$/,                  // Czech Republic
      'DE': /^[0-9]{9}$/,                     // Germany
      'DK': /^[0-9]{8}$/,                     // Denmark
      'EE': /^[0-9]{9}$/,                     // Estonia
      'EL': /^[0-9]{9}$/,                     // Greece
      'ES': /^[A-Z][0-9]{7}[A-Z0-9]$/,        // Spain
      'FI': /^[0-9]{8}$/,                     // Finland
      'FR': /^[A-Z0-9]{2}[0-9]{9}$/,          // France
      'HR': /^[0-9]{11}$/,                    // Croatia
      'HU': /^[0-9]{8}$/,                     // Hungary
      'IE': /^[0-9][A-Z0-9\\+\\*][0-9]{5}[A-Z]$/,  // Ireland
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
  }

  /**
   * Validate single VAT ID
   *
   * @param {string} countryCode - Two-letter country code
   * @param {string} vatNumber - VAT number without country prefix
   * @returns {Promise<Object>} Validation result
   */
  async validateVatId(countryCode, vatNumber) {
    console.log(`🔍 Starting VIES validation for: ${countryCode}${vatNumber}`);

    try {
      // Input validation
      if (!countryCode || !vatNumber) {
        throw new Error('Country code and VAT number are required');
      }

      countryCode = countryCode.toUpperCase();
      vatNumber = vatNumber.replace(/\s+/g, ''); // Remove spaces

      // Check cache first
      const cacheKey = `${countryCode}${vatNumber}`;
      const cachedResult = this.getCachedResult(cacheKey);
      if (cachedResult) {
        console.log('📋 Returning cached VIES result');
        return cachedResult;
      }

      // Format validation
      const formatValidation = this.validateVatFormat(countryCode, vatNumber);
      if (!formatValidation.isValid) {
        const result = {
          isValid: false,
          vatNumber: vatNumber,
          countryCode: countryCode,
          errorMessage: formatValidation.error,
          validationDate: new Date().toISOString(),
          source: 'format_validation',
          companyName: null,
          companyAddress: null
        };
        this.setCachedResult(cacheKey, result);
        return result;
      }

      // Perform VIES validation
      let result;
      if (this.useMockService) {
        result = await this.performMockViesValidation(countryCode, vatNumber);
      } else {
        result = await this.performRealViesValidation(countryCode, vatNumber);
      }

      // Cache the result
      this.setCachedResult(cacheKey, result);

      console.log(`✅ VIES validation completed for: ${countryCode}${vatNumber} - ${result.isValid ? 'Valid' : 'Invalid'}`);
      return result;

    } catch (error) {
      console.error('❌ VIES validation error:', error);
      return {
        isValid: false,
        vatNumber: vatNumber,
        countryCode: countryCode,
        errorMessage: `VIES validation failed: ${error.message}`,
        validationDate: new Date().toISOString(),
        source: 'error',
        companyName: null,
        companyAddress: null
      };
    }
  }

  /**
   * Validate multiple VAT IDs in batch
   *
   * @param {Array} vatIds - Array of {countryCode, vatNumber} objects
   * @returns {Promise<Array>} Array of validation results
   */
  async validateVatIdsBatch(vatIds) {
    console.log(`📦 Starting batch VIES validation for ${vatIds.length} VAT IDs`);

    if (!vatIds || vatIds.length === 0) {
      return [];
    }

    const results = [];
    const batchSize = 5; // Process in smaller batches to avoid overwhelming VIES

    for (let i = 0; i < vatIds.length; i += batchSize) {
      const batch = vatIds.slice(i, i + batchSize);
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vatIds.length / batchSize)}`);

      const batchPromises = batch.map(vatId =>
        this.validateVatId(vatId.countryCode, vatId.vatNumber)
      );

      try {
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches to be respectful to VIES service
        if (i + batchSize < vatIds.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error) {
        console.error(`❌ Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
        // Add error results for this batch
        batch.forEach(vatId => {
          results.push({
            isValid: false,
            vatNumber: vatId.vatNumber,
            countryCode: vatId.countryCode,
            errorMessage: `Batch validation failed: ${error.message}`,
            validationDate: new Date().toISOString(),
            source: 'batch_error',
            companyName: null,
            companyAddress: null
          });
        });
      }
    }

    console.log(`✅ Batch VIES validation completed. ${results.filter(r => r.isValid).length}/${results.length} valid`);
    return results;
  }

  /**
   * Validate VAT number format according to country-specific rules
   *
   * @param {string} countryCode - Two-letter country code
   * @param {string} vatNumber - VAT number without country prefix
   * @returns {Object} Format validation result
   */
  validateVatFormat(countryCode, vatNumber) {
    console.log(`📝 Validating VAT format for: ${countryCode}${vatNumber}`);

    if (!this.euCountries.includes(countryCode)) {
      // For non-EU countries, do basic validation
      if (vatNumber.length < 5 || vatNumber.length > 15) {
        return {
          isValid: false,
          error: `Invalid VAT number length for non-EU country ${countryCode}`
        };
      }
      return { isValid: true };
    }

    const pattern = this.vatPatterns[countryCode];
    if (!pattern) {
      return {
        isValid: false,
        error: `No validation pattern available for country code: ${countryCode}`
      };
    }

    const isValid = pattern.test(vatNumber);
    return {
      isValid: isValid,
      error: isValid ? null : `VAT number format invalid for ${countryCode}. Expected pattern: ${pattern.source}`
    };
  }

  /**
   * Perform real VIES API validation using SOAP
   *
   * @param {string} countryCode - Two-letter country code
   * @param {string} vatNumber - VAT number without country prefix
   * @returns {Promise<Object>} VIES validation result
   */
  async performRealViesValidation(countryCode, vatNumber) {
    console.log('🌐 Calling real VIES SOAP service...');

    // Only EU countries are supported by VIES
    if (!this.euCountries.includes(countryCode)) {
      return {
        isValid: false,
        vatNumber: vatNumber,
        countryCode: countryCode,
        errorMessage: `VIES validation not available for non-EU country: ${countryCode}`,
        validationDate: new Date().toISOString(),
        source: 'vies_non_eu',
        companyName: null,
        companyAddress: null
      };
    }

    let lastError;

    // Retry logic
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`🔄 VIES attempt ${attempt}/${this.retryAttempts}`);

        const client = await soap.createClientAsync(this.viesWsdlUrl, {
          timeout: this.timeout,
          endpoint: this.viesServiceUrl
        });

        const result = await client.checkVatAsync({
          countryCode: countryCode,
          vatNumber: vatNumber
        });

        const viesResult = result[0];

        return {
          isValid: viesResult.valid === true,
          vatNumber: vatNumber,
          countryCode: countryCode,
          companyName: viesResult.name || null,
          companyAddress: viesResult.address || null,
          requestDate: viesResult.requestDate || new Date().toISOString(),
          validationDate: new Date().toISOString(),
          source: 'vies_soap',
          errorMessage: viesResult.valid ? null : 'VAT number not found in VIES database'
        };

      } catch (error) {
        lastError = error;
        console.log(`⚠️ VIES attempt ${attempt} failed:`, error.message);

        if (attempt < this.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // If all attempts failed, check if VIES service is available
    const serviceStatus = await this.checkViesServiceAvailability();

    return {
      isValid: false,
      vatNumber: vatNumber,
      countryCode: countryCode,
      errorMessage: `VIES service unavailable: ${lastError.message}`,
      validationDate: new Date().toISOString(),
      source: 'vies_error',
      companyName: null,
      companyAddress: null,
      serviceAvailable: serviceStatus.available
    };
  }

  /**
   * Perform mock VIES validation for development/testing
   *
   * @param {string} countryCode - Two-letter country code
   * @param {string} vatNumber - VAT number without country prefix
   * @returns {Promise<Object>} Mock validation result
   */
  async performMockViesValidation(countryCode, vatNumber) {
    console.log('🎭 Performing mock VIES validation...');

    // Simulate processing time
    const processingTime = Math.random() * 1000 + 200; // 200-1200ms
    await new Promise(resolve => setTimeout(resolve, processingTime));

    // Mock validation logic
    let isValid = true;
    let companyName = null;
    let companyAddress = null;
    let errorMessage = null;

    // Invalid VAT patterns for testing
    if (vatNumber.includes('999') || vatNumber.includes('000')) {
      isValid = false;
      errorMessage = 'VAT number not found in VIES database (mock)';
    }
    // Test error scenarios
    else if (vatNumber.includes('ERROR')) {
      isValid = false;
      errorMessage = 'Mock VIES service error for testing';
    }
    // Valid VAT numbers
    else {
      companyName = `Mock Company for ${vatNumber}`;
      companyAddress = `Mock Address, ${countryCode}-12345 Mock City`;
    }

    // For non-EU countries, return appropriate message
    if (!this.euCountries.includes(countryCode)) {
      isValid = false;
      errorMessage = `VIES validation not available for non-EU country: ${countryCode}`;
      companyName = null;
      companyAddress = null;
    }

    return {
      isValid: isValid,
      vatNumber: vatNumber,
      countryCode: countryCode,
      companyName: companyName,
      companyAddress: companyAddress,
      requestDate: new Date().toISOString(),
      validationDate: new Date().toISOString(),
      source: 'vies_mock',
      errorMessage: errorMessage,
      processingTimeMs: Math.round(processingTime)
    };
  }

  /**
   * Check VIES service availability
   *
   * @returns {Promise<Object>} Service availability status
   */
  async checkViesServiceAvailability() {
    try {
      // Try a simple HTTP request to VIES first
      const response = await axios.get('http://ec.europa.eu/taxation_customs/vies/', {
        timeout: 5000
      });

      return {
        available: response.status === 200,
        httpStatus: response.status,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        available: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get cached validation result
   *
   * @param {string} cacheKey - Cache key
   * @returns {Object|null} Cached result or null
   */
  getCachedResult(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;

    const isExpired = (Date.now() - cached.timestamp) > this.cacheTTL;
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }

    return {
      ...cached.result,
      fromCache: true,
      cachedAt: new Date(cached.timestamp).toISOString()
    };
  }

  /**
   * Set cached validation result
   *
   * @param {string} cacheKey - Cache key
   * @param {Object} result - Validation result to cache
   */
  setCachedResult(cacheKey, result) {
    this.cache.set(cacheKey, {
      result: result,
      timestamp: Date.now()
    });

    // Clean up old cache entries periodically
    if (this.cache.size > 1000) {
      this.cleanupCache();
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) > this.cacheTTL) {
        this.cache.delete(key);
      }
    }
    console.log(`🧹 Cache cleanup completed. Size: ${this.cache.size}`);
  }

  /**
   * Get cache statistics
   *
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, value] of this.cache.entries()) {
      if ((now - value.timestamp) > this.cacheTTL) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries: validEntries,
      expiredEntries: expiredEntries,
      cacheHitRate: this.cacheHitRate || 0,
      cacheTTLHours: this.cacheTTL / (1000 * 60 * 60)
    };
  }

  /**
   * Clear all cached results
   */
  clearCache() {
    this.cache.clear();
    console.log('🗑️ VIES cache cleared');
  }

  /**
   * Get supported EU countries
   *
   * @returns {Array} Array of EU country codes
   */
  getSupportedCountries() {
    return [...this.euCountries];
  }

  /**
   * Get service configuration and status
   *
   * @returns {Promise<Object>} Service status information
   */
  async getServiceStatus() {
    const serviceAvailability = await this.checkViesServiceAvailability();
    const cacheStats = this.getCacheStats();

    return {
      serviceName: 'VIES VAT Validation Service',
      version: '1.0.0',
      mode: this.useMockService ? 'mock' : 'real',
      wsdlUrl: this.viesWsdlUrl,
      serviceUrl: this.viesServiceUrl,
      timeout: this.timeout,
      retryAttempts: this.retryAttempts,
      supportedCountries: this.euCountries.length,
      euCountries: this.euCountries,
      serviceAvailable: serviceAvailability.available,
      cacheStats: cacheStats,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = VIESService;
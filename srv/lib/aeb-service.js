const axios = require('axios');

/**
 * AEB Trade Compliance Service Integration
 *
 * Implements comprehensive trade compliance screening as per FR-004.1:
 * - Sanctions List Screening (OFAC, EU, UN, UK)
 * - PEPs (Politically Exposed Persons) Screening
 * - Export Control Screening
 * - Adverse Media Screening
 * - Country Risk Assessment
 * - Risk Scoring (0-100) with category classification
 *
 * @class AEBService
 */
class AEBService {

  constructor() {
    this.apiUrl = process.env.AEB_API_URL || 'https://api.aeb.com/compliance';
    this.apiKey = process.env.AEB_API_KEY || 'mock-api-key';
    this.clientId = process.env.AEB_CLIENT_ID || 'mock-client-id';
    this.timeout = 30000; // 30 seconds timeout
    this.retryAttempts = 3;
    this.useMockService = !process.env.AEB_API_URL; // Use mock if no real URL provided
  }

  /**
   * Perform comprehensive AEB trade compliance check
   *
   * @param {Object} partnerData - Business partner data for screening
   * @param {string} partnerData.name - Partner name
   * @param {string} partnerData.searchTerm - Additional search terms
   * @param {Array} partnerData.addresses - Partner addresses
   * @param {string} partnerData.country - Primary country code
   * @returns {Promise<Object>} Comprehensive compliance check result
   */
  async performComplianceCheck(partnerData) {
    console.log(`🛡️ Starting AEB compliance check for: ${partnerData.name}`);

    try {
      if (this.useMockService) {
        return await this.performMockComplianceCheck(partnerData);
      }

      const result = await this.performRealComplianceCheck(partnerData);
      console.log(`✅ AEB compliance check completed for: ${partnerData.name}`);
      return result;

    } catch (error) {
      console.error('❌ AEB compliance check failed:', error);
      return this.createErrorResult(error, partnerData.name);
    }
  }

  /**
   * Perform real AEB API compliance check
   *
   * @param {Object} partnerData - Business partner data
   * @returns {Promise<Object>} Real API compliance result
   */
  async performRealComplianceCheck(partnerData) {
    console.log('🌐 Calling real AEB Trade Compliance API...');

    const requestPayload = {
      client_id: this.clientId,
      partner_name: partnerData.name,
      search_terms: partnerData.searchTerm ? [partnerData.searchTerm] : [],
      addresses: partnerData.addresses || [],
      primary_country: partnerData.country,
      screening_types: [
        'sanctions',
        'peps',
        'export_control',
        'adverse_media',
        'country_risk'
      ]
    };

    const config = {
      method: 'POST',
      url: `${this.apiUrl}/screen`,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Client-ID': this.clientId
      },
      data: requestPayload,
      timeout: this.timeout
    };

    let lastError;

    // Retry logic
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`🔄 AEB API attempt ${attempt}/${this.retryAttempts}`);
        const response = await axios(config);
        return this.processAEBResponse(response.data, partnerData.name);

      } catch (error) {
        lastError = error;
        console.log(`⚠️ AEB API attempt ${attempt} failed:`, error.message);

        if (attempt < this.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Perform mock AEB compliance check for development/testing
   *
   * @param {Object} partnerData - Business partner data
   * @returns {Promise<Object>} Mock compliance result
   */
  async performMockComplianceCheck(partnerData) {
    console.log('🎭 Performing mock AEB compliance check...');

    // Simulate processing time
    const processingTime = Math.random() * 2000 + 500; // 500-2500ms
    await new Promise(resolve => setTimeout(resolve, processingTime));

    const name = partnerData.name.toLowerCase();
    const searchTerm = (partnerData.searchTerm || '').toLowerCase();

    // Mock risk scenarios based on partner name/search terms
    let riskLevel = 'Clean';
    let riskScore = Math.floor(Math.random() * 20); // Base score 0-19

    const highRiskKeywords = ['sanctions', 'embargo', 'blocked', 'restricted', 'prohibited'];
    const mediumRiskKeywords = ['political', 'government', 'official', 'minister', 'director'];
    const countryRiskKeywords = ['iran', 'north korea', 'syria', 'cuba', 'belarus'];

    // Check for high-risk indicators
    if (highRiskKeywords.some(keyword => name.includes(keyword) || searchTerm.includes(keyword))) {
      riskLevel = 'Sanctions Hit';
      riskScore = Math.floor(Math.random() * 20) + 80; // 80-99
    }
    // Check for medium-risk indicators
    else if (mediumRiskKeywords.some(keyword => name.includes(keyword) || searchTerm.includes(keyword))) {
      riskLevel = 'High Risk';
      riskScore = Math.floor(Math.random() * 30) + 50; // 50-79
    }
    // Check for country risk
    else if (countryRiskKeywords.some(keyword => name.includes(keyword) || searchTerm.includes(keyword))) {
      riskLevel = 'Country Risk';
      riskScore = Math.floor(Math.random() * 20) + 30; // 30-49
    }
    // Low risk scenario
    else if (Math.random() < 0.1) { // 10% chance of low risk findings
      riskLevel = 'Low Risk';
      riskScore = Math.floor(Math.random() * 10) + 20; // 20-29
    }

    const result = {
      status: riskLevel === 'Clean' ? 'Pass' : (riskLevel === 'Sanctions Hit' ? 'Fail' : 'Review'),
      riskLevel,
      riskScore,
      overallRisk: this.categorizeRiskScore(riskScore),
      screeningResults: {
        sanctionsScreening: this.generateMockSanctionsResult(riskLevel),
        pepsScreening: this.generateMockPEPsResult(riskLevel),
        exportControlScreening: this.generateMockExportControlResult(riskLevel),
        adverseMediaScreening: this.generateMockAdverseMediaResult(riskLevel),
        countryRiskAssessment: this.generateMockCountryRiskResult(partnerData.country || 'US')
      },
      metadata: {
        checkTimestamp: new Date().toISOString(),
        processingTimeMs: Math.round(processingTime),
        apiVersion: 'mock-v1.0',
        serviceProvider: 'AEB Trade Compliance (Mock)',
        requestId: this.generateRequestId()
      },
      summary: this.generateComplianceSummary(riskLevel, riskScore),
      recommendations: this.generateRecommendations(riskLevel, riskScore)
    };

    return result;
  }

  /**
   * Process real AEB API response
   *
   * @param {Object} responseData - AEB API response data
   * @param {string} partnerName - Partner name for context
   * @returns {Object} Processed compliance result
   */
  processAEBResponse(responseData, partnerName) {
    console.log('📊 Processing AEB API response...');

    const riskScore = responseData.risk_score || 0;
    const status = responseData.overall_status || 'Unknown';

    return {
      status: status,
      riskLevel: responseData.risk_level || 'Unknown',
      riskScore: riskScore,
      overallRisk: this.categorizeRiskScore(riskScore),
      screeningResults: {
        sanctionsScreening: responseData.sanctions_result || {},
        pepsScreening: responseData.peps_result || {},
        exportControlScreening: responseData.export_control_result || {},
        adverseMediaScreening: responseData.adverse_media_result || {},
        countryRiskAssessment: responseData.country_risk_result || {}
      },
      metadata: {
        checkTimestamp: new Date().toISOString(),
        processingTimeMs: responseData.processing_time || 0,
        apiVersion: responseData.api_version || 'unknown',
        serviceProvider: 'AEB Trade Compliance',
        requestId: responseData.request_id || this.generateRequestId()
      },
      summary: responseData.summary || this.generateComplianceSummary(status, riskScore),
      recommendations: responseData.recommendations || this.generateRecommendations(status, riskScore)
    };
  }

  /**
   * Generate mock sanctions screening result
   */
  generateMockSanctionsResult(riskLevel) {
    const hasHit = riskLevel === 'Sanctions Hit';
    return {
      status: hasHit ? 'HIT' : 'CLEAR',
      listsChecked: ['OFAC SDN', 'EU Sanctions', 'UN Sanctions', 'UK Sanctions'],
      totalListsChecked: 4,
      matches: hasHit ? [{
        list: 'OFAC SDN',
        matchScore: 0.95,
        matchType: 'Name',
        details: 'Potential match found - manual review required'
      }] : [],
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Generate mock PEPs screening result
   */
  generateMockPEPsResult(riskLevel) {
    const hasHit = riskLevel === 'High Risk';
    return {
      status: hasHit ? 'HIT' : 'CLEAR',
      categories: ['Senior Political Figures', 'Government Officials', 'Judicial Officials'],
      matches: hasHit ? [{
        category: 'Government Officials',
        matchScore: 0.87,
        position: 'Director of Trade',
        country: 'Unknown',
        details: 'Potential PEP match - enhanced due diligence required'
      }] : [],
      riskRating: hasHit ? 'High' : 'Low'
    };
  }

  /**
   * Generate mock export control screening result
   */
  generateMockExportControlResult(riskLevel) {
    return {
      status: 'CLEAR',
      listsChecked: ['Entity List', 'Denied Persons List', 'Unverified List'],
      restrictedItems: [],
      exportLicenseRequired: false,
      details: 'No export control restrictions identified'
    };
  }

  /**
   * Generate mock adverse media screening result
   */
  generateMockAdverseMediaResult(riskLevel) {
    const hasFindings = Math.random() < 0.05; // 5% chance of adverse media
    return {
      status: hasFindings ? 'FINDINGS' : 'CLEAR',
      articlesFound: hasFindings ? 2 : 0,
      categories: hasFindings ? ['Legal Issues'] : [],
      severity: hasFindings ? 'Medium' : 'None',
      summary: hasFindings ? 'Minor legal proceedings identified - low impact' : 'No adverse media found'
    };
  }

  /**
   * Generate mock country risk assessment
   */
  generateMockCountryRiskResult(countryCode) {
    const riskLevels = {
      'US': 'Low', 'GB': 'Low', 'DE': 'Low', 'FR': 'Low', 'JP': 'Low',
      'CN': 'Medium', 'RU': 'High', 'IR': 'Very High', 'KP': 'Very High'
    };

    const riskLevel = riskLevels[countryCode] || 'Medium';
    const riskScore = {
      'Low': Math.floor(Math.random() * 20),
      'Medium': Math.floor(Math.random() * 20) + 30,
      'High': Math.floor(Math.random() * 20) + 60,
      'Very High': Math.floor(Math.random() * 20) + 80
    }[riskLevel];

    return {
      country: countryCode,
      riskLevel: riskLevel,
      riskScore: riskScore,
      factors: ['Political Stability', 'Economic Environment', 'Regulatory Framework'],
      details: `Country risk assessment for ${countryCode}: ${riskLevel} risk`
    };
  }

  /**
   * Categorize risk score into risk level
   */
  categorizeRiskScore(score) {
    if (score >= 80) return 'Very High';
    if (score >= 60) return 'High';
    if (score >= 30) return 'Medium';
    if (score >= 10) return 'Low';
    return 'Very Low';
  }

  /**
   * Generate compliance summary
   */
  generateComplianceSummary(riskLevel, riskScore) {
    switch (riskLevel) {
      case 'Clean':
        return 'No compliance issues identified. Partner cleared for business.';
      case 'Low Risk':
        return 'Minor compliance considerations identified. Standard due diligence recommended.';
      case 'High Risk':
        return 'Compliance concerns identified. Enhanced due diligence required.';
      case 'Country Risk':
        return 'Country-related compliance risks identified. Review local regulations.';
      case 'Sanctions Hit':
        return 'Potential sanctions match identified. Business relationship prohibited until cleared.';
      default:
        return `Compliance risk level: ${riskLevel} (Score: ${riskScore}/100)`;
    }
  }

  /**
   * Generate recommendations based on risk level
   */
  generateRecommendations(riskLevel, riskScore) {
    const recommendations = [];

    switch (riskLevel) {
      case 'Clean':
        recommendations.push('Proceed with standard business processes');
        recommendations.push('Maintain periodic compliance monitoring');
        break;
      case 'Low Risk':
        recommendations.push('Conduct standard customer due diligence');
        recommendations.push('Document risk assessment rationale');
        break;
      case 'High Risk':
        recommendations.push('Perform enhanced due diligence');
        recommendations.push('Obtain senior management approval');
        recommendations.push('Implement enhanced monitoring');
        break;
      case 'Country Risk':
        recommendations.push('Review country-specific compliance requirements');
        recommendations.push('Consider additional licensing requirements');
        break;
      case 'Sanctions Hit':
        recommendations.push('DO NOT PROCEED with business relationship');
        recommendations.push('Escalate to compliance team immediately');
        recommendations.push('File suspicious activity report if required');
        break;
      default:
        recommendations.push('Manual review required');
        recommendations.push('Consult compliance team for guidance');
    }

    return recommendations;
  }

  /**
   * Create error result when API call fails
   */
  createErrorResult(error, partnerName) {
    return {
      status: 'Error',
      riskLevel: 'Unknown',
      riskScore: 0,
      overallRisk: 'Unknown',
      error: {
        message: error.message,
        code: error.code || 'UNKNOWN_ERROR',
        timestamp: new Date().toISOString()
      },
      metadata: {
        checkTimestamp: new Date().toISOString(),
        processingTimeMs: 0,
        apiVersion: 'error',
        serviceProvider: 'AEB Trade Compliance',
        requestId: this.generateRequestId()
      },
      summary: `Compliance check failed for ${partnerName}. Manual review required.`,
      recommendations: [
        'Manual compliance review required',
        'Verify partner information manually',
        'Consult compliance team before proceeding'
      ]
    };
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `AEB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service health status
   */
  async getServiceHealth() {
    try {
      if (this.useMockService) {
        return {
          status: 'healthy',
          service: 'mock',
          timestamp: new Date().toISOString()
        };
      }

      const response = await axios.get(`${this.apiUrl}/health`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
        timeout: 5000
      });

      return {
        status: 'healthy',
        service: 'real',
        apiStatus: response.data.status,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        service: this.useMockService ? 'mock' : 'real',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

module.exports = AEBService;
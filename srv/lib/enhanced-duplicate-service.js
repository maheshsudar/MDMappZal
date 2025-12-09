const cds = require('@sap/cds');
const fuzzy = require('fuzzy');

/**
 * Enhanced Duplicate Detection Service
 *
 * Implements sophisticated duplicate detection mechanisms as per FR-003.1:
 * - Established VAT ID checking for Create requests
 * - Fuzzy name matching with 95% similarity threshold
 * - Combined duplicate logic integrating both methods
 * - Merge decision management and tracking
 *
 * @class EnhancedDuplicateService
 */
class EnhancedDuplicateService {

  constructor() {
    this.FUZZY_THRESHOLD = 0.95; // 95% similarity threshold per requirements
    this.MIN_NAME_LENGTH = 3;    // Minimum name length for meaningful comparison
  }

  /**
   * Perform comprehensive duplicate detection for a business partner request
   * Combines established VAT ID checking with fuzzy name matching
   *
   * @param {string} requestId - UUID of the business partner request
   * @returns {Promise<Array>} Array of duplicate match results
   */
  async performComprehensiveDuplicateCheck(requestId) {
    console.log(`🔍 Starting comprehensive duplicate check for request: ${requestId}`);

    try {
      const request = await SELECT.from('mdm.db.BusinessPartnerRequests').where({ ID: requestId });
      if (!request) {
        throw new Error(`Request ${requestId} not found`);
      }

      const duplicates = [];

      // 1. Established VAT ID Check (for Create requests only)
      if (request.requestType === 'Create') {
        console.log('📋 Performing established VAT ID duplicate check...');
        const vatDuplicates = await this.checkEstablishedVatIdDuplicates(requestId);
        duplicates.push(...vatDuplicates);
      }

      // 2. Fuzzy Name Matching
      console.log('🔤 Performing fuzzy name matching...');
      const nameDuplicates = await this.performFuzzyNameMatching(request);
      duplicates.push(...nameDuplicates);

      // 3. Consolidate and rank results
      const consolidatedDuplicates = this.consolidateDuplicateResults(duplicates);

      // 4. Store duplicate check results
      await this.storeDuplicateCheckResults(requestId, consolidatedDuplicates);

      // 5. Update request status if duplicates found
      if (consolidatedDuplicates.length > 0) {
        await this.updateRequestStatusForDuplicates(requestId, consolidatedDuplicates);
      }

      console.log(`✅ Duplicate check completed. Found ${consolidatedDuplicates.length} potential duplicates`);
      return consolidatedDuplicates;

    } catch (error) {
      console.error('❌ Error in comprehensive duplicate check:', error);
      throw error;
    }
  }

  /**
   * Check for established VAT ID duplicates (FR-003.1 requirement)
   * For Create requests, extracts country from main address and checks if VAT ID exists
   *
   * @param {string} requestId - UUID of the business partner request
   * @returns {Promise<Array>} Array of established VAT ID duplicate results
   */
  async checkEstablishedVatIdDuplicates(requestId) {
    console.log(`🏛️ Checking established VAT ID duplicates for request: ${requestId}`);

    try {
      // Get the established address (main address) and its country
      const establishedAddress = await SELECT.from('mdm.db.PartnerAddresses')
        .where({ request_ID: requestId, addressType: 'Main' });

      if (!establishedAddress || establishedAddress.length === 0) {
        console.log('⚠️ No established address found - skipping established VAT ID check');
        return [];
      }

      const establishedCountry = establishedAddress[0].country_code;
      console.log(`🌍 Established country: ${establishedCountry}`);

      // Get the VAT ID that matches the established country
      const establishedVatIds = await SELECT.from('mdm.db.PartnerVatIds')
        .where({ request_ID: requestId, country_code: establishedCountry });

      if (!establishedVatIds || establishedVatIds.length === 0) {
        console.log(`💳 No VAT ID found for established country ${establishedCountry}`);
        return [];
      }

      const duplicates = [];

      // Check each VAT ID that matches the established country
      for (const vatId of establishedVatIds) {
        console.log(`🔍 Checking VAT ID: ${vatId.vatNumber} in country: ${establishedCountry}`);

        const existingPartners = await SELECT.from('mdm.db.ExistingPartners')
          .where({ establishedVatId: vatId.vatNumber, establishedCountry: establishedCountry });

        for (const existingPartner of existingPartners) {
          console.log(`🎯 Found established VAT ID match: ${existingPartner.sapBpNumber} - ${existingPartner.partnerName}`);

          // Get merge recommendation and compatibility
          const mergeAnalysis = await this.analyzeMergeCompatibility(requestId, existingPartner);

          const duplicateResult = {
            matchType: 'EstablishedVAT',
            matchScore: 1.0, // Exact VAT match = 100%
            confidence: 'High',
            existingBpNumber: existingPartner.sapBpNumber,
            existingBpName: existingPartner.partnerName,
            matchDetails: `Exact established VAT ID match: ${vatId.vatNumber} in ${establishedCountry}`,

            // Enhanced established VAT information
            establishedVatId: existingPartner.establishedVatId,
            establishedCountry: existingPartner.establishedCountry,
            partnerStatus: existingPartner.status,
            lastUpdated: existingPartner.lastUpdated,
            sourceSystem: existingPartner.sourceSystem,
            businessChannels: existingPartner.businessChannels,

            // Merge decision analysis
            canMerge: mergeAnalysis.canMerge,
            mergeRecommendation: mergeAnalysis.recommendation,
            mergeRisk: mergeAnalysis.risk,
            compatibilityScore: mergeAnalysis.compatibilityScore
          };

          duplicates.push(duplicateResult);
        }
      }

      console.log(`📊 Found ${duplicates.length} established VAT ID duplicates`);
      return duplicates;

    } catch (error) {
      console.error('❌ Error checking established VAT ID duplicates:', error);
      throw error;
    }
  }

  /**
   * Perform fuzzy name matching with 95% similarity threshold (FR-003.1)
   * Uses fuzzy string matching to identify potential duplicate partner names
   *
   * @param {Object} request - Business partner request object
   * @returns {Promise<Array>} Array of fuzzy name match results
   */
  async performFuzzyNameMatching(request) {
    console.log(`🔤 Performing fuzzy name matching for: "${request.partnerName}"`);

    if (!request.partnerName || request.partnerName.length < this.MIN_NAME_LENGTH) {
      console.log('⚠️ Partner name too short for meaningful fuzzy matching');
      return [];
    }

    try {
      // Get all existing partners for comparison
      const existingPartners = await SELECT.from('mdm.db.ExistingPartners')
        .where({ status: 'Active' }); // Only check against active partners

      if (!existingPartners || existingPartners.length === 0) {
        console.log('📭 No existing partners found for fuzzy matching');
        return [];
      }

      // Prepare names for fuzzy matching
      const targetName = this.normalizeName(request.partnerName);
      const candidates = existingPartners.map(partner => ({
        ...partner,
        normalizedName: this.normalizeName(partner.partnerName)
      }));

      console.log(`🎯 Comparing against ${candidates.length} existing partners`);

      // Perform fuzzy matching
      const fuzzyResults = fuzzy.filter(targetName, candidates, {
        extract: (partner) => partner.normalizedName
      });

      const duplicates = [];

      for (const result of fuzzyResults) {
        const similarity = result.score;

        // Only consider matches above the threshold
        if (similarity >= this.FUZZY_THRESHOLD) {
          const existingPartner = result.original;

          console.log(`🎯 Fuzzy match found: "${existingPartner.partnerName}" (${Math.round(similarity * 100)}%)`);

          // Get merge recommendation
          const mergeAnalysis = await this.analyzeMergeCompatibility(request.ID, existingPartner);

          const duplicateResult = {
            matchType: 'FuzzyName',
            matchScore: similarity,
            confidence: this.getConfidenceLevel(similarity),
            existingBpNumber: existingPartner.sapBpNumber,
            existingBpName: existingPartner.partnerName,
            matchDetails: `Fuzzy name match: "${request.partnerName}" → "${existingPartner.partnerName}" (${Math.round(similarity * 100)}%)`,

            // Partner information
            partnerStatus: existingPartner.status,
            lastUpdated: existingPartner.lastUpdated,
            sourceSystem: existingPartner.sourceSystem,
            businessChannels: existingPartner.businessChannels,

            // Merge decision analysis
            canMerge: mergeAnalysis.canMerge,
            mergeRecommendation: mergeAnalysis.recommendation,
            mergeRisk: mergeAnalysis.risk,
            compatibilityScore: mergeAnalysis.compatibilityScore
          };

          duplicates.push(duplicateResult);
        }
      }

      console.log(`📊 Found ${duplicates.length} fuzzy name matches above ${this.FUZZY_THRESHOLD * 100}% threshold`);
      return duplicates.sort((a, b) => b.matchScore - a.matchScore); // Sort by match score descending

    } catch (error) {
      console.error('❌ Error performing fuzzy name matching:', error);
      throw error;
    }
  }

  /**
   * Analyze merge compatibility between new request and existing partner
   * Provides intelligent merge recommendations based on business rules
   *
   * @param {string} requestId - UUID of the new request
   * @param {Object} existingPartner - Existing partner object
   * @returns {Promise<Object>} Merge analysis result
   */
  async analyzeMergeCompatibility(requestId, existingPartner) {
    try {
      const request = await SELECT.from('mdm.db.BusinessPartnerRequests').where({ ID: requestId });

      const analysis = {
        canMerge: false,
        recommendation: '',
        risk: 'Unknown',
        compatibilityScore: 0,
        factors: []
      };

      // Factor 1: Partner Status Check
      if (existingPartner.status !== 'Active') {
        analysis.canMerge = false;
        analysis.recommendation = `Cannot merge - existing partner is ${existingPartner.status}`;
        analysis.risk = 'High';
        analysis.factors.push(`Partner status: ${existingPartner.status}`);
        return analysis;
      }

      analysis.factors.push('Partner status: Active ✓');
      analysis.compatibilityScore += 25;

      // Factor 2: Partner Type Compatibility
      const typeCompatible = this.arePartnerTypesCompatible(request.partnerRole, existingPartner.partnerType);
      if (!typeCompatible) {
        analysis.canMerge = false;
        analysis.recommendation = 'Cannot merge - incompatible partner types';
        analysis.risk = 'High';
        analysis.factors.push(`Partner type mismatch: ${request.partnerRole} vs ${existingPartner.partnerType}`);
        return analysis;
      }

      analysis.factors.push(`Partner types compatible: ${request.partnerRole} ↔ ${existingPartner.partnerType} ✓`);
      analysis.compatibilityScore += 25;

      // Factor 3: Source System Alignment
      if (request.sourceSystem === existingPartner.sourceSystem) {
        analysis.recommendation = 'Strong merge candidate - same source system';
        analysis.risk = 'Low';
        analysis.compatibilityScore += 30;
        analysis.factors.push(`Same source system: ${request.sourceSystem} ✓`);
      } else {
        analysis.risk = 'Medium';
        analysis.compatibilityScore += 10;
        analysis.factors.push(`Different source systems: ${request.sourceSystem} vs ${existingPartner.sourceSystem}`);
      }

      // Factor 4: Business Channels Alignment
      if (request.businessChannels && existingPartner.businessChannels) {
        if (request.businessChannels === existingPartner.businessChannels) {
          analysis.compatibilityScore += 20;
          analysis.factors.push(`Same business channels: ${request.businessChannels} ✓`);
        } else {
          analysis.compatibilityScore += 5;
          analysis.factors.push(`Different business channels: ${request.businessChannels} vs ${existingPartner.businessChannels}`);
        }
      }

      // Final assessment
      analysis.canMerge = analysis.compatibilityScore >= 50;

      if (analysis.compatibilityScore >= 80) {
        analysis.recommendation = analysis.recommendation || 'Excellent merge candidate - high compatibility';
        analysis.risk = 'Low';
      } else if (analysis.compatibilityScore >= 60) {
        analysis.recommendation = analysis.recommendation || 'Good merge candidate - review business requirements';
        analysis.risk = 'Low';
      } else if (analysis.compatibilityScore >= 50) {
        analysis.recommendation = analysis.recommendation || 'Merge possible - careful review required';
        analysis.risk = 'Medium';
      } else {
        analysis.recommendation = analysis.recommendation || 'Merge not recommended - compatibility issues';
        analysis.risk = 'High';
      }

      return analysis;

    } catch (error) {
      console.error('❌ Error analyzing merge compatibility:', error);
      return {
        canMerge: false,
        recommendation: 'Analysis failed - manual review required',
        risk: 'High',
        compatibilityScore: 0,
        factors: ['Error in compatibility analysis']
      };
    }
  }

  /**
   * Check if partner types are compatible for merging
   *
   * @param {string} requestType - Partner type from request
   * @param {string} existingType - Partner type from existing partner
   * @returns {boolean} True if types are compatible
   */
  arePartnerTypesCompatible(requestType, existingType) {
    // Same type is always compatible
    if (requestType === existingType) {
      return true;
    }

    // 'Both' is compatible with any type
    if (requestType === 'Both' || existingType === 'Both') {
      return true;
    }

    // Different specific types are not compatible
    return false;
  }

  /**
   * Consolidate duplicate results and remove duplicates
   * Handles cases where same partner is found through multiple methods
   *
   * @param {Array} duplicates - Array of duplicate match results
   * @returns {Array} Consolidated and ranked duplicate results
   */
  consolidateDuplicateResults(duplicates) {
    if (!duplicates || duplicates.length === 0) {
      return [];
    }

    console.log(`🔄 Consolidating ${duplicates.length} duplicate results...`);

    // Group by existing BP number
    const grouped = {};

    for (const duplicate of duplicates) {
      const key = duplicate.existingBpNumber;

      if (!grouped[key]) {
        grouped[key] = duplicate;
      } else {
        // If same partner found through multiple methods, keep the higher match score
        if (duplicate.matchScore > grouped[key].matchScore) {
          // Combine match details
          grouped[key].matchDetails += ` | ${duplicate.matchDetails}`;
          grouped[key].matchScore = duplicate.matchScore;
          grouped[key].matchType = `${grouped[key].matchType}+${duplicate.matchType}`;
        } else {
          grouped[key].matchDetails += ` | ${duplicate.matchDetails}`;
          grouped[key].matchType = `${grouped[key].matchType}+${duplicate.matchType}`;
        }
      }
    }

    const consolidated = Object.values(grouped);

    // Sort by match score (highest first) and then by compatibility score
    consolidated.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return (b.compatibilityScore || 0) - (a.compatibilityScore || 0);
    });

    console.log(`✅ Consolidated to ${consolidated.length} unique potential duplicates`);
    return consolidated;
  }

  /**
   * Store duplicate check results in the database
   *
   * @param {string} requestId - UUID of the business partner request
   * @param {Array} duplicates - Array of duplicate match results
   */
  async storeDuplicateCheckResults(requestId, duplicates) {
    if (!duplicates || duplicates.length === 0) {
      console.log('📝 No duplicates to store');
      return;
    }

    console.log(`📝 Storing ${duplicates.length} duplicate check results...`);

    try {
      const { v4: uuidv4 } = require('uuid');

      for (const duplicate of duplicates) {
        await INSERT.into('mdm.db.DuplicateChecks').entries({
          ID: uuidv4(),
          request_ID: requestId,
          matchType: duplicate.matchType,
          matchScore: duplicate.matchScore,
          existingBpNumber: duplicate.existingBpNumber,
          existingBpName: duplicate.existingBpName,
          matchDetails: duplicate.matchDetails,
          reviewRequired: duplicate.matchScore > 0.8, // High matches require review

          // Enhanced fields for established VAT ID matching
          establishedVatId: duplicate.establishedVatId || null,
          establishedCountry: duplicate.establishedCountry || null,
          partnerStatus: duplicate.partnerStatus,
          lastUpdated: duplicate.lastUpdated,
          sourceSystem: duplicate.sourceSystem,
          businessChannels: duplicate.businessChannels,

          // Merge decision tracking
          mergeDecision: 'Pending',
          canMerge: duplicate.canMerge,
          mergeRecommendation: duplicate.mergeRecommendation
        });
      }

      console.log('✅ Duplicate check results stored successfully');

    } catch (error) {
      console.error('❌ Error storing duplicate check results:', error);
      throw error;
    }
  }

  /**
   * Update request status based on duplicate detection results
   *
   * @param {string} requestId - UUID of the business partner request
   * @param {Array} duplicates - Array of duplicate match results
   */
  async updateRequestStatusForDuplicates(requestId, duplicates) {
    if (!duplicates || duplicates.length === 0) {
      return;
    }

    // Check if any duplicates require review (high confidence matches)
    const requiresReview = duplicates.some(d =>
      d.matchScore >= 0.9 || d.matchType.includes('EstablishedVAT')
    );

    if (requiresReview) {
      console.log('🔄 Updating request status to DuplicateReview');

      await UPDATE('mdm.db.BusinessPartnerRequests')
        .set({ status: 'DuplicateReview' })
        .where({ ID: requestId });

      // Create approval history entry
      const { v4: uuidv4 } = require('uuid');
      await INSERT.into('mdm.db.ApprovalHistory').entries({
        ID: uuidv4(),
        request_ID: requestId,
        approverUserId: 'system',
        approverName: 'Enhanced Duplicate Service',
        action: 'DuplicateCheck',
        previousStatus: 'Submitted',
        newStatus: 'DuplicateReview',
        comments: `Found ${duplicates.length} potential duplicate(s) - manual review required`,
        systemGenerated: true
      });

      console.log('✅ Request status updated to DuplicateReview');
    }
  }

  /**
   * Normalize partner name for consistent comparison
   * Removes common business suffixes and standardizes format
   *
   * @param {string} name - Original partner name
   * @returns {string} Normalized name
   */
  normalizeName(name) {
    if (!name) return '';

    let normalized = name.trim().toLowerCase();

    // Remove common business entity suffixes
    const suffixes = [
      'ltd', 'limited', 'inc', 'incorporated', 'corp', 'corporation',
      'llc', 'llp', 'lp', 'gmbh', 'ag', 'sa', 'sas', 'bv', 'nv',
      'pty', 'pvt', 'private', 'public', 'co', 'company', '&', 'and'
    ];

    for (const suffix of suffixes) {
      const patterns = [
        new RegExp(`\\b${suffix}\\b\\.?$`, 'i'),  // End of string
        new RegExp(`\\b${suffix}\\b\\.?\\s+`, 'i') // Followed by space
      ];

      for (const pattern of patterns) {
        normalized = normalized.replace(pattern, ' ');
      }
    }

    // Remove extra whitespace and special characters
    normalized = normalized.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();

    return normalized;
  }

  /**
   * Get confidence level based on match score
   *
   * @param {number} score - Match score (0.0 to 1.0)
   * @returns {string} Confidence level
   */
  getConfidenceLevel(score) {
    if (score >= 0.98) return 'Very High';
    if (score >= 0.95) return 'High';
    if (score >= 0.90) return 'Medium';
    if (score >= 0.80) return 'Low';
    return 'Very Low';
  }

  /**
   * Get duplicate check statistics for a request
   *
   * @param {string} requestId - UUID of the business partner request
   * @returns {Promise<Object>} Duplicate check statistics
   */
  async getDuplicateCheckStatistics(requestId) {
    try {
      const duplicates = await SELECT.from('mdm.db.DuplicateChecks')
        .where({ request_ID: requestId });

      const stats = {
        totalDuplicates: duplicates.length,
        establishedVatMatches: duplicates.filter(d => d.matchType.includes('EstablishedVAT')).length,
        fuzzyNameMatches: duplicates.filter(d => d.matchType.includes('FuzzyName')).length,
        highConfidenceMatches: duplicates.filter(d => d.matchScore >= 0.95).length,
        mergeCandidates: duplicates.filter(d => d.canMerge).length,
        pendingDecisions: duplicates.filter(d => d.mergeDecision === 'Pending').length,
        averageMatchScore: duplicates.length > 0
          ? (duplicates.reduce((sum, d) => sum + d.matchScore, 0) / duplicates.length).toFixed(3)
          : 0
      };

      return stats;

    } catch (error) {
      console.error('❌ Error getting duplicate check statistics:', error);
      return {
        totalDuplicates: 0,
        error: error.message
      };
    }
  }
}

module.exports = EnhancedDuplicateService;
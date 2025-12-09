const axios = require('axios');

/**
 * AEB Trade Compliance Integration Service
 * Mock implementation for AEB compliance screening
 * In production, this would integrate with actual AEB Trade Compliance APIs
 */
class AEBComplianceService {
    constructor() {
        this.AEB_API_BASE_URL = process.env.AEB_API_URL || 'https://api.aeb.com/compliance';
        this.AEB_API_KEY = process.env.AEB_API_KEY || 'mock-api-key';
        this.AEB_CLIENT_ID = process.env.AEB_CLIENT_ID || 'mock-client-id';

        // Mock sanctions lists for demo purposes
        this.mockSanctionedEntities = [
            'SANCTIONED COMPANY LTD',
            'BLOCKED CORPORATION',
            'EMBARGO TRADING LLC',
            'RESTRICTED PARTNERS INC',
            'DENIED PERSONS COMPANY',
            'PROHIBITED ENTITY SA'
        ];

        this.mockHighRiskCountries = ['IR', 'KP', 'SY', 'CU'];
        this.mockHighRiskKeywords = [
            'NUCLEAR', 'WEAPONS', 'MILITARY', 'DEFENSE', 'SANCTIONS',
            'EMBARGO', 'RESTRICTED', 'PROHIBITED', 'DENIED', 'BLOCKED'
        ];
    }

    /**
     * Perform comprehensive compliance screening for a business partner
     * @param {Object} partnerData - Business partner information
     * @returns {Promise<Object>} Compliance screening result
     */
    async performComplianceScreening(partnerData) {
        try {
            console.log(`Performing AEB compliance screening for: ${partnerData.name}`);

            // In production, this would call actual AEB APIs
            // For now, we'll simulate the screening process

            const results = {
                overallStatus: 'PASS',
                screeningId: this.generateScreeningId(),
                screeningDate: new Date().toISOString(),
                partner: {
                    name: partnerData.name,
                    address: partnerData.address,
                    country: partnerData.country,
                    vatNumbers: partnerData.vatNumbers || []
                },
                checks: {
                    sanctionsList: await this.checkSanctionsList(partnerData),
                    exportControlList: await this.checkExportControlList(partnerData),
                    pepsCheck: await this.checkPEPs(partnerData),
                    adverseMedia: await this.checkAdverseMedia(partnerData),
                    countryRisk: await this.checkCountryRisk(partnerData)
                },
                recommendations: [],
                nextReviewDate: this.calculateNextReviewDate()
            };

            // Determine overall status based on individual checks
            results.overallStatus = this.determineOverallStatus(results.checks);
            results.recommendations = this.generateRecommendations(results.checks);

            return results;

        } catch (error) {
            console.error('AEB compliance screening error:', error);
            return {
                overallStatus: 'ERROR',
                errorMessage: `Compliance screening failed: ${error.message}`,
                screeningDate: new Date().toISOString()
            };
        }
    }

    /**
     * Check against various sanctions lists
     * @private
     */
    async checkSanctionsList(partnerData) {
        try {
            // Simulate API delay
            await this.delay(500);

            const checks = {
                ofac: await this.checkOFAC(partnerData),
                eu: await this.checkEUSanctions(partnerData),
                un: await this.checkUNSanctions(partnerData),
                uk: await this.checkUKSanctions(partnerData)
            };

            const hasMatch = Object.values(checks).some(check => check.hasMatch);

            return {
                status: hasMatch ? 'FAIL' : 'PASS',
                hasMatch,
                checks,
                details: hasMatch ? 'Potential sanctions match found' : 'No sanctions matches found'
            };

        } catch (error) {
            return {
                status: 'ERROR',
                errorMessage: `Sanctions list check failed: ${error.message}`
            };
        }
    }

    /**
     * Check OFAC (Office of Foreign Assets Control) list
     * @private
     */
    async checkOFAC(partnerData) {
        const isMatch = this.mockSanctionedEntities.some(entity =>
            partnerData.name.toUpperCase().includes(entity) ||
            entity.includes(partnerData.name.toUpperCase())
        );

        return {
            hasMatch: isMatch,
            confidence: isMatch ? 0.95 : 0,
            matchedEntity: isMatch ? this.mockSanctionedEntities.find(entity =>
                partnerData.name.toUpperCase().includes(entity)
            ) : null,
            listVersion: '2024-10-12',
            source: 'OFAC SDN List'
        };
    }

    /**
     * Check EU sanctions list
     * @private
     */
    async checkEUSanctions(partnerData) {
        const isMatch = this.mockHighRiskKeywords.some(keyword =>
            partnerData.name.toUpperCase().includes(keyword)
        );

        return {
            hasMatch: isMatch,
            confidence: isMatch ? 0.85 : 0,
            matchedEntity: isMatch ? partnerData.name : null,
            listVersion: '2024-10-12',
            source: 'EU Consolidated List'
        };
    }

    /**
     * Check UN sanctions list
     * @private
     */
    async checkUNSanctions(partnerData) {
        return {
            hasMatch: false,
            confidence: 0,
            matchedEntity: null,
            listVersion: '2024-10-12',
            source: 'UN Security Council Sanctions List'
        };
    }

    /**
     * Check UK sanctions list
     * @private
     */
    async checkUKSanctions(partnerData) {
        return {
            hasMatch: false,
            confidence: 0,
            matchedEntity: null,
            listVersion: '2024-10-12',
            source: 'UK HM Treasury Sanctions List'
        };
    }

    /**
     * Check export control lists (BIS, etc.)
     * @private
     */
    async checkExportControlList(partnerData) {
        await this.delay(300);

        const isHighRisk = this.mockHighRiskKeywords.some(keyword =>
            partnerData.name.toUpperCase().includes(keyword) ||
            (partnerData.businessDescription &&
             partnerData.businessDescription.toUpperCase().includes(keyword))
        );

        return {
            status: isHighRisk ? 'WARNING' : 'PASS',
            hasMatch: isHighRisk,
            details: isHighRisk ?
                'Entity may be involved in controlled technology sectors' :
                'No export control concerns identified',
            recommendations: isHighRisk ?
                ['Enhanced due diligence recommended', 'Review export license requirements'] :
                []
        };
    }

    /**
     * Check Politically Exposed Persons (PEPs)
     * @private
     */
    async checkPEPs(partnerData) {
        await this.delay(400);

        // Mock PEPs check - randomly flag some entities for demo
        const isPEP = Math.random() < 0.05; // 5% chance

        return {
            status: isPEP ? 'WARNING' : 'PASS',
            hasMatch: isPEP,
            details: isPEP ?
                'Potential connection to politically exposed person identified' :
                'No PEPs connections identified',
            confidence: isPEP ? 0.75 : 0
        };
    }

    /**
     * Check adverse media coverage
     * @private
     */
    async checkAdverseMedia(partnerData) {
        await this.delay(600);

        const hasAdverseMedia = this.mockHighRiskKeywords.some(keyword =>
            partnerData.name.toUpperCase().includes(keyword)
        );

        return {
            status: hasAdverseMedia ? 'WARNING' : 'PASS',
            hasMatch: hasAdverseMedia,
            details: hasAdverseMedia ?
                'Adverse media coverage found - manual review recommended' :
                'No adverse media identified',
            articles: hasAdverseMedia ? [
                {
                    title: `Investigation into ${partnerData.name}`,
                    source: 'Financial Times',
                    date: '2024-09-15',
                    severity: 'MEDIUM'
                }
            ] : []
        };
    }

    /**
     * Check country risk assessment
     * @private
     */
    async checkCountryRisk(partnerData) {
        const isHighRiskCountry = this.mockHighRiskCountries.includes(partnerData.country);

        return {
            status: isHighRiskCountry ? 'WARNING' : 'PASS',
            country: partnerData.country,
            riskLevel: isHighRiskCountry ? 'HIGH' : 'LOW',
            details: isHighRiskCountry ?
                'High-risk jurisdiction - enhanced due diligence required' :
                'Standard risk jurisdiction',
            sanctions: isHighRiskCountry,
            exportControls: isHighRiskCountry
        };
    }

    /**
     * Determine overall compliance status
     * @private
     */
    determineOverallStatus(checks) {
        // If any sanctions list check fails, overall status is FAIL
        if (checks.sanctionsList && checks.sanctionsList.status === 'FAIL') {
            return 'FAIL';
        }

        // If any check has ERROR status, overall status is ERROR
        const hasError = Object.values(checks).some(check => check.status === 'ERROR');
        if (hasError) {
            return 'ERROR';
        }

        // If any check has WARNING status, overall status is WARNING
        const hasWarning = Object.values(checks).some(check => check.status === 'WARNING');
        if (hasWarning) {
            return 'WARNING';
        }

        return 'PASS';
    }

    /**
     * Generate recommendations based on check results
     * @private
     */
    generateRecommendations(checks) {
        const recommendations = [];

        if (checks.sanctionsList && checks.sanctionsList.status === 'FAIL') {
            recommendations.push({
                type: 'CRITICAL',
                message: 'DO NOT PROCEED - Sanctions list match found',
                action: 'Contact compliance team immediately'
            });
        }

        if (checks.exportControlList && checks.exportControlList.status === 'WARNING') {
            recommendations.push({
                type: 'WARNING',
                message: 'Enhanced due diligence required',
                action: 'Review export control regulations'
            });
        }

        if (checks.pepsCheck && checks.pepsCheck.status === 'WARNING') {
            recommendations.push({
                type: 'WARNING',
                message: 'PEPs connection identified',
                action: 'Conduct enhanced KYC procedures'
            });
        }

        if (checks.adverseMedia && checks.adverseMedia.status === 'WARNING') {
            recommendations.push({
                type: 'INFO',
                message: 'Adverse media found',
                action: 'Review media articles and assess risk'
            });
        }

        if (checks.countryRisk && checks.countryRisk.status === 'WARNING') {
            recommendations.push({
                type: 'WARNING',
                message: 'High-risk jurisdiction',
                action: 'Apply enhanced monitoring procedures'
            });
        }

        return recommendations;
    }

    /**
     * Calculate next review date (typically 6 months for high-risk, 12 months for standard)
     * @private
     */
    calculateNextReviewDate() {
        const now = new Date();
        now.setMonth(now.getMonth() + 6); // Default to 6 months
        return now.toISOString();
    }

    /**
     * Generate unique screening ID
     * @private
     */
    generateScreeningId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `AEB-${timestamp}-${random}`;
    }

    /**
     * Utility method to simulate API delays
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get screening configuration and settings
     */
    getScreeningConfiguration() {
        return {
            enabledLists: [
                'OFAC SDN',
                'EU Consolidated List',
                'UN Security Council',
                'UK HM Treasury'
            ],
            enabledChecks: [
                'Sanctions Lists',
                'Export Control Lists',
                'PEPs Check',
                'Adverse Media',
                'Country Risk'
            ],
            reviewFrequency: '6 months',
            autoApprovalThreshold: 'PASS',
            manualReviewRequired: ['FAIL', 'WARNING'],
            lastUpdated: new Date().toISOString()
        };
    }

    /**
     * Perform periodic screening for existing business partners
     * @param {Array} partnerList - List of existing partners to screen
     * @returns {Promise<Array>} Screening results for all partners
     */
    async performPeriodicScreening(partnerList) {
        console.log(`Performing periodic screening for ${partnerList.length} partners`);

        const results = [];

        for (const partner of partnerList) {
            try {
                const result = await this.performComplianceScreening(partner);
                results.push({
                    partnerId: partner.id,
                    partnerName: partner.name,
                    screeningResult: result,
                    requiresAction: result.overallStatus !== 'PASS'
                });

                // Add delay between screenings to avoid overwhelming the service
                await this.delay(1000);
            } catch (error) {
                results.push({
                    partnerId: partner.id,
                    partnerName: partner.name,
                    error: error.message,
                    requiresAction: true
                });
            }
        }

        return {
            totalScreened: partnerList.length,
            passCount: results.filter(r => r.screeningResult?.overallStatus === 'PASS').length,
            warningCount: results.filter(r => r.screeningResult?.overallStatus === 'WARNING').length,
            failCount: results.filter(r => r.screeningResult?.overallStatus === 'FAIL').length,
            errorCount: results.filter(r => r.error).length,
            results,
            screeningDate: new Date().toISOString()
        };
    }

    /**
     * Check service status and connectivity
     */
    async checkServiceStatus() {
        try {
            // In production, this would ping actual AEB service endpoints
            await this.delay(100);

            return {
                available: true,
                message: 'AEB compliance service is available',
                version: '2.1.0',
                lastUpdated: new Date().toISOString(),
                listsStatus: {
                    ofac: 'ONLINE',
                    eu: 'ONLINE',
                    un: 'ONLINE',
                    uk: 'ONLINE'
                }
            };
        } catch (error) {
            return {
                available: false,
                message: `AEB service unavailable: ${error.message}`,
                timestamp: new Date().toISOString()
            };
        }
    }
}

module.exports = AEBComplianceService;
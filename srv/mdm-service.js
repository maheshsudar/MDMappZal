const cds = require('@sap/cds');
const { v4: uuidv4 } = require('uuid');
const fuzzy = require('fuzzy');

// Import enhanced services and utilities
const ErrorHandler = require('./lib/error-handler');
const InputValidator = require('./lib/input-validator');
const NotificationService = require('./lib/notification-service');
const CacheService = require('./lib/cache-service');

/**
 * Enhanced MDM Service Implementation
 * Implements the MDMService defined in mdm-service.cds
 * Following CAP Node.js patterns and best practices with enhanced security,
 * error handling, validation, caching, and notification capabilities
 */
module.exports = cds.service.impl(async function() {
  // Get references to entities
  const { BusinessPartnerRequests, CoupaRequests, PartnerAddresses, PartnerEmails, PartnerBanks,
          PartnerVatIds, RequestAttachments, ApprovalHistory, DuplicateChecks,
          ExistingPartners } = this.entities;

  // Import external services
  const AEBService = require('./lib/aeb-service');
  const VIESService = require('./lib/vies-service');
  const EnhancedDuplicateService = require('./lib/enhanced-duplicate-service');

  // Initialize service instances
  const aebService = new AEBService();
  const viesService = new VIESService();
  const duplicateService = new EnhancedDuplicateService();
  const notificationService = new NotificationService();

  // Valid status transitions
  const VALID_STATUS_TRANSITIONS = {
    'Draft': ['Submitted'],
    'Submitted': ['ComplianceCheck', 'Rejected'],
    'ComplianceCheck': ['DuplicateReview', 'Approved', 'Rejected'],
    'DuplicateReview': ['Approved', 'Rejected'],
    'Approved': [],
    'Rejected': ['Draft'] // Allow resubmission after rejection
  };

  // Service initialization
  console.log('🚀 Starting Enhanced MDM Service initialization...');

  // Warm up cache with commonly used data
  await CacheService.warmup();

  console.log('✅ Enhanced MDM Service initialized successfully');

  // ================================
  // BEFORE EVENT HANDLERS
  // ================================

  /**
   * Before NEW CoupaRequests (Draft Creation)
   * - Initialize system-controlled fields
   */
  this.before('NEW', CoupaRequests.drafts, async (req) => {
    req.data.sourceSystem = 'Coupa';
    req.data.requestType = 'Create';
    req.data.status = 'Draft';
    req.data.statusCriticality = 0;
    req.data.coupaInternalNo = uuidv4(); // Auto-generate UUID
  });

  /**
   * Before CREATE BusinessPartnerRequests
   * - Comprehensive input validation and sanitization
   * - Generate request number
   * - Set requester information
   * - Validate request type and business rules
   */
  this.before('CREATE', BusinessPartnerRequests, async (req) => {
    const { data } = req;

    try {
      // 1. Comprehensive input validation and sanitization
      console.log('🔍 Validating business partner request data...');
      const validation = InputValidator.validateBusinessPartnerRequest(data, data.requestType || 'Create');

      if (!validation.isValid) {
        throw ErrorHandler.createError(
          ErrorHandler.ERROR_CODES.VALIDATION_FAILED,
          `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          'validation',
          { errors: validation.errors, warnings: validation.warnings },
          400
        );
      }

      // Apply sanitized data
      Object.assign(data, validation.sanitizedData);

      // Log warnings if any
      if (validation.warnings.length > 0) {
        console.warn('⚠️ Validation warnings:', validation.warnings);
      }

      // 2. Generate request number
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const counter = await getNextCounter.call(this);
      data.requestNumber = `MDM-${timestamp}-${counter.toString().padStart(4, '0')}`;

      // 3. Set requester information from user context
      if (req.user) {
        data.requesterId = req.user.id;
        data.requesterName = req.user.displayName || req.user.id;
        data.requesterEmail = req.user.email;
      }

      // 4. Set initial status and criticality
      data.status = 'NEW';
      data.statusCriticality = 0; // None

      // 5. Business rule validation
      if (data.requestType === 'Update') {
        ErrorHandler.validateRequiredFields(data, ['existingBpNumber', 'changeDescription']);

        // Validate existing BP number format
        if (data.existingBpNumber && !data.existingBpNumber.match(/^BP[0-9]{6}$/)) {
          throw ErrorHandler.validationError(
            'existingBpNumber',
            'Invalid SAP BP number format (expected: BP######)',
            data.existingBpNumber
          );
        }
      }

      // 6. Cache frequently accessed data
      if (data.businessChannels) {
        await CacheService.cacheBusinessChannels(async () => {
          return await SELECT.from('mdm.db.BusinessChannels').where({ isActive: true });
        });
      }

      console.log(`✅ Creating new MDM request: ${data.requestNumber} (Type: ${data.requestType})`);

    } catch (error) {
      console.error('❌ Error during request creation validation:', error);
      ErrorHandler.handleRequestError(error, req);
    }
  });

  /**
   * Before UPDATE BusinessPartnerRequests
   * - Log update operations
   */
  this.before('UPDATE', BusinessPartnerRequests, async (req) => {
    console.log('Updating MDM request:', req.data.ID);
  });

  // ================================
  // AFTER EVENT HANDLERS
  // ================================

  /**
   * After CREATE BusinessPartnerRequests
   * - Create initial approval history entry
   * - Send creation notifications
   * - Cache new request data
   */
  this.after('CREATE', BusinessPartnerRequests, async (result, req) => {
    try {
      // 1. Create initial approval history entry
      await createApprovalHistoryEntry.call(this, result.ID, 'Create', null, 'Draft', 'Request created');

      // 2. Send creation notifications
      console.log('📬 Sending creation notifications...');
      await notificationService.sendStatusChangeNotification(result, 'created', {
        userId: req.user?.id,
        userDisplayName: req.user?.displayName
      });

      // 3. Cache the new request for quick access
      await CacheService.set(
        `request:${result.requestNumber}`,
        result,
        'partner_data',
        5 * 60 * 1000 // 5 minutes TTL for new requests
      );

      console.log(`✅ Request ${result.requestNumber} created successfully with notifications`);

    } catch (error) {
      console.error('❌ Error in after CREATE handler:', error);
      // Don't throw error to avoid rolling back the main creation
      // Log for monitoring and investigation
    }
  });

  // ================================
  // ACTION HANDLERS
  // ================================

  /**
   * Submit for Approval Action
   */
  this.on('submitForApproval', BusinessPartnerRequests, async (req) => {
    const { ID } = req.params[0];

    try {
      console.log(`🚀 Submitting request ${ID} for approval...`);

      // 1. Get request with caching
      const request = await CacheService.getOrSet(
        `request:${ID}`,
        async () => await SELECT.one.from(BusinessPartnerRequests).where({ ID }),
        'partner_data'
      );

      if (!request) {
        throw ErrorHandler.notFoundError('BusinessPartnerRequest', ID);
      }

      // 2. Validate status transition
      ErrorHandler.validateStatusTransition(request.status, 'Submitted', VALID_STATUS_TRANSITIONS);

      // 3. Authorization check
      if (!req.user.is('BusinessUser') && !req.user.is('MDMApprover')) {
        throw ErrorHandler.authorizationError('submit', 'BusinessPartnerRequest', ['BusinessUser', 'MDMApprover']);
      }

      // 4. Comprehensive validation with related data
      console.log('🔍 Performing comprehensive validation...');
      const addresses = await SELECT.from(PartnerAddresses).where({ request_ID: ID });
      const emails = await SELECT.from(PartnerEmails).where({ request_ID: ID });
      const vatIds = await SELECT.from(PartnerVatIds).where({ request_ID: ID });
      const banks = await SELECT.from(PartnerBanks).where({ request_ID: ID });

      const requestData = {
        ...request,
        addresses,
        emails,
        vatIds,
        banks
      };

      const validation = await InputValidator.validateCompleteRequest(requestData);
      if (!validation.isValid) {
        throw ErrorHandler.createError(
          ErrorHandler.ERROR_CODES.VALIDATION_FAILED,
          `Request validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          'validation',
          { errors: validation.errors, warnings: validation.warnings }
        );
      }

      // 5. Update status
      await UPDATE(BusinessPartnerRequests)
        .set({
          status: 'Submitted',
          statusCriticality: 2, // Warning (pending approval)
          modifiedBy: req.user.id,
          modifiedAt: new Date().toISOString()
        })
        .where({ ID });

      // 6. Create approval history entry
      await createApprovalHistoryEntry.call(
        this,
        ID,
        'Submit',
        request.status,
        'Submitted',
        'Request submitted for approval',
        req.user.id
      );

      // 7. Send notifications
      console.log('📬 Sending submission notifications...');
      const updatedRequest = { ...request, status: 'Submitted', statusCriticality: 2 };
      await notificationService.sendStatusChangeNotification(updatedRequest, 'submitted', {
        userId: req.user.id,
        userDisplayName: req.user.displayName
      });

      // 8. Update cache
      await CacheService.set(`request:${ID}`, updatedRequest, 'partner_data');
      await CacheService.delete(`request:${request.requestNumber}`, 'partner_data'); // Remove by request number cache

      console.log(`✅ Request ${request.requestNumber} submitted successfully`);
      return `Request ${request.requestNumber} submitted successfully. The MDM team will review and perform compliance checks.`;

    } catch (error) {
      console.error('❌ Error submitting request:', error);
      ErrorHandler.handleRequestError(error, req);
    }
  });

  /**
   * Perform Compliance Check Action
   */
  this.on('performComplianceCheck', BusinessPartnerRequests, async (req) => {
    const { ID } = req.params[0];

    try {
      console.log(`🛡️ Performing compliance check for request ${ID}...`);

      // 1. Get request with caching
      const request = await CacheService.getOrSet(
        `request:${ID}`,
        async () => await SELECT.one.from(BusinessPartnerRequests).where({ ID }),
        'partner_data'
      );

      if (!request) {
        throw ErrorHandler.notFoundError('BusinessPartnerRequest', ID);
      }

      // 2. Validate status transition and authorization
      ErrorHandler.validateStatusTransition(request.status, 'ComplianceCheck', VALID_STATUS_TRANSITIONS);

      if (!req.user.is('MDMApprover')) {
        throw ErrorHandler.authorizationError('perform compliance check', 'BusinessPartnerRequest', ['MDMApprover']);
      }

      // 3. Get VAT IDs for validation
      const vatIds = await SELECT.from(PartnerVatIds).where({ request_ID: ID });

      let aebStatus = 'Pass', aebDetails = 'No sanctions found';
      let viesStatus = 'Valid', viesDetails = 'VAT validation successful';
      let overallStatus = 'Pass';

      // 4. Perform AEB compliance check with caching
      try {
        console.log('🔍 Performing AEB trade compliance check...');
        const aebResult = await CacheService.cacheComplianceCheck(
          request.partnerName,
          request.searchTerm,
          async () => await aebService.performComplianceCheck({
            name: request.partnerName,
            searchTerm: request.searchTerm
          })
        );

        aebStatus = aebResult.status;
        aebDetails = aebResult.summary || aebResult.details || 'Compliance check completed';

        if (aebStatus !== 'Pass') {
          overallStatus = 'Review Required';
        }

      } catch (error) {
        console.error('AEB compliance check failed:', error);
        aebStatus = 'Fail';
        aebDetails = `AEB check failed: ${error.message}`;
        overallStatus = 'Fail';
      }

      // 5. Perform VIES VAT validation with caching
      console.log('💳 Performing VIES VAT validation...');
      const vatResults = [];

      for (const vatId of vatIds) {
        try {
          const viesResult = await CacheService.cacheVatValidation(
            vatId.country_code,
            vatId.vatNumber,
            async () => await viesService.validateVatId(vatId.country_code, vatId.vatNumber)
          );

          vatResults.push({
            country: vatId.country_code,
            vatNumber: vatId.vatNumber,
            isValid: viesResult.isValid,
            details: viesResult.errorMessage || 'Valid'
          });

          if (!viesResult.isValid) {
            viesStatus = 'Invalid';
            viesDetails = `VAT ${vatId.vatNumber} is invalid: ${viesResult.errorMessage}`;
            overallStatus = 'Review Required';
          }

          // Update individual VAT ID validation status
          await UPDATE(PartnerVatIds)
            .set({
              validationStatus: viesResult.isValid ? 'Valid' : 'Invalid',
              validationDate: new Date().toISOString(),
              validationDetails: viesResult.errorMessage || 'VIES validation completed'
            })
            .where({ ID: vatId.ID });

        } catch (error) {
          console.error(`VIES validation failed for ${vatId.vatNumber}:`, error);
          viesStatus = 'Unavailable';
          viesDetails = `VIES check failed: ${error.message}`;
          overallStatus = 'Review Required';

          vatResults.push({
            country: vatId.country_code,
            vatNumber: vatId.vatNumber,
            isValid: false,
            details: error.message
          });
        }
      }

      // 6. Determine next status based on compliance results
      let nextStatus = 'ComplianceCheck';
      let statusCriticality = 2; // Warning

      if (overallStatus === 'Pass') {
        // Move to duplicate check for Create requests, or ready for approval for Update requests
        nextStatus = request.requestType === 'Create' ? 'ComplianceCheck' : 'Approved';
        statusCriticality = 1; // Success
      } else if (overallStatus === 'Fail') {
        statusCriticality = 3; // Error
      }

      // 7. Update request with compliance results
      await UPDATE(BusinessPartnerRequests)
        .set({
          aebComplianceStatus: aebStatus,
          aebComplianceDetails: aebDetails,
          viesValidationStatus: viesStatus,
          viesValidationDetails: viesDetails,
          status: nextStatus,
          statusCriticality: statusCriticality,
          modifiedBy: req.user.id,
          modifiedAt: new Date().toISOString()
        })
        .where({ ID });

      // 8. Create approval history entry
      await createApprovalHistoryEntry.call(
        this,
        ID,
        'ComplianceCheck',
        request.status,
        nextStatus,
        `Compliance check completed - AEB: ${aebStatus}, VIES: ${viesStatus}. Overall: ${overallStatus}`,
        req.user.id
      );

      // 9. Send notifications
      console.log('📬 Sending compliance check notifications...');
      const updatedRequest = { ...request, status: nextStatus, statusCriticality };
      await notificationService.sendStatusChangeNotification(updatedRequest, 'compliance_check', {
        userId: req.user.id,
        userDisplayName: req.user.displayName,
        aebStatus,
        viesStatus,
        overallStatus
      });

      // 10. Update cache
      await CacheService.set(`request:${ID}`, updatedRequest, 'partner_data');

      const result = {
        aebStatus,
        aebDetails,
        viesStatus,
        viesDetails,
        vatResults,
        overallStatus,
        checkTimestamp: new Date().toISOString(),
        nextSteps: overallStatus === 'Pass'
          ? 'Compliance checks passed. Ready for duplicate detection (Create requests) or approval (Update requests).'
          : 'Manual review required due to compliance issues.'
      };

      console.log(`✅ Compliance check completed for request ${request.requestNumber}: ${overallStatus}`);
      return result;

    } catch (error) {
      console.error('❌ Error performing compliance check:', error);
      ErrorHandler.handleRequestError(error, req);
    }
  });

  /**
   * Check Established VAT ID Duplicates Action
   */
  this.on('checkEstablishedVatDuplicates', BusinessPartnerRequests, async (req) => {
    const { ID } = req.params[0];

    try {
      const duplicates = await duplicateService.checkEstablishedVatIdDuplicates(ID);

      // Update request status to DuplicateReview if duplicates found
      if (duplicates.length > 0) {
        await UPDATE(BusinessPartnerRequests)
          .set({ status: 'DuplicateReview', statusCriticality: 2 })
          .where({ ID });

        const request = await SELECT.one.from(BusinessPartnerRequests).where({ ID });
        await createApprovalHistoryEntry.call(this,
          ID,
          'DuplicateCheck',
          request.status || 'Submitted',
          'DuplicateReview',
          `Found ${duplicates.length} established VAT ID duplicate(s) - manual review required`
        );
      }

      return duplicates;

    } catch (error) {
      console.error('Error checking established VAT duplicates:', error);
      req.error(500, error.message);
    }
  });

  /**
   * Approve Request Action
   */
  this.on('approveRequest', BusinessPartnerRequests, async (req) => {
    const { ID } = req.params[0];
    const { comments } = req.data;

    try {
      // Generate SAP BP Number (mock)
      const sapBpNumber = generateSAPBPNumber();

      // Update request status
      await UPDATE(BusinessPartnerRequests)
        .set({
          status: 'Approved',
          statusCriticality: 1, // Success
          approvedBy: req.user?.id || 'system',
          approvedAt: new Date().toISOString(),
          sapBpNumber: sapBpNumber,
          comments: comments || ''
        })
        .where({ ID });

      // Create approval history entry
      await createApprovalHistoryEntry.call(this,
        ID,
        'Approve',
        'ComplianceCheck',
        'Approved',
        comments || 'Request approved'
      );

      return `Request approved successfully. SAP BP Number: ${sapBpNumber}`;
    } catch (error) {
      console.error('Error approving request:', error);
      req.error(500, error.message);
    }
  });

  /**
   * Reject Request Action
   */
  this.on('rejectRequest', BusinessPartnerRequests, async (req) => {
    const { ID } = req.params[0];
    const { reason } = req.data;

    try {
      await UPDATE(BusinessPartnerRequests)
        .set({
          status: 'Rejected',
          statusCriticality: 3, // Error
          rejectionReason: reason,
          approvedBy: req.user?.id || 'system',
          approvedAt: new Date().toISOString()
        })
        .where({ ID });

      // Create approval history entry
      await createApprovalHistoryEntry.call(this,
        ID,
        'Reject',
        'ComplianceCheck',
        'Rejected',
        reason || 'Request rejected'
      );

      return 'Request rejected successfully';
    } catch (error) {
      console.error('Error rejecting request:', error);
      req.error(500, error.message);
    }
  });

  /**
   * Merge with Existing Partner Action
   */
  this.on('mergeWithExistingPartner', BusinessPartnerRequests, async (req) => {
    const { ID } = req.params[0];
    const { existingBpNumber, mergeComments } = req.data;

    try {
      const request = await SELECT.one.from(BusinessPartnerRequests).where({ ID });
      if (!request) {
        req.error(404, 'Request not found');
      }

      // Verify the existing partner exists
      const existingPartner = await SELECT.one.from(ExistingPartners)
        .where({ sapBpNumber: existingBpNumber });

      if (!existingPartner) {
        req.error(404, `Existing partner ${existingBpNumber} not found`);
      }

      // Update duplicate check records with merge decision
      await UPDATE(DuplicateChecks)
        .set({
          mergeDecision: 'Merge',
          mergeDecisionBy: req.user?.id || 'system',
          mergeDecisionAt: new Date().toISOString(),
          mergeComments: mergeComments || ''
        })
        .where({ request_ID: ID, existingBpNumber });

      // Update request status to approved with merge information
      await UPDATE(BusinessPartnerRequests)
        .set({
          status: 'Approved',
          statusCriticality: 1, // Success
          approvedBy: req.user?.id || 'system',
          approvedAt: new Date().toISOString(),
          sapBpNumber: existingBpNumber, // Use existing BP number
          comments: `Merged with existing partner ${existingBpNumber}. ${mergeComments || ''}`
        })
        .where({ ID });

      // Create approval history entry
      await createApprovalHistoryEntry.call(this,
        ID,
        'Approve',
        'DuplicateReview',
        'Approved',
        `Merged with existing partner ${existingBpNumber}. ${mergeComments || ''}`
      );

      return `Request approved and merged with existing partner ${existingBpNumber}`;

    } catch (error) {
      console.error('Error merging with existing partner:', error);
      req.error(500, error.message);
    }
  });

  /**
   * Create New Partner Action
   */
  this.on('createNewPartner', BusinessPartnerRequests, async (req) => {
    const { ID } = req.params[0];
    const { comments } = req.data;

    try {
      const request = await SELECT.one.from(BusinessPartnerRequests).where({ ID });
      if (!request) {
        req.error(404, 'Request not found');
      }

      // Generate new SAP BP Number
      const sapBpNumber = generateSAPBPNumber();

      // Update duplicate check records with create new decision
      await UPDATE(DuplicateChecks)
        .set({
          mergeDecision: 'CreateNew',
          mergeDecisionBy: req.user?.id || 'system',
          mergeDecisionAt: new Date().toISOString(),
          mergeComments: comments || 'Approved to create new partner despite duplicates'
        })
        .where({ request_ID: ID });

      // Update request status to approved
      await UPDATE(BusinessPartnerRequests)
        .set({
          status: 'Approved',
          statusCriticality: 1, // Success
          approvedBy: req.user?.id || 'system',
          approvedAt: new Date().toISOString(),
          sapBpNumber: sapBpNumber,
          comments: comments || 'Approved to create new partner'
        })
        .where({ ID });

      // Create approval history entry
      await createApprovalHistoryEntry.call(this,
        ID,
        'Approve',
        'DuplicateReview',
        'Approved',
        `Approved to create new partner ${sapBpNumber}. ${comments || ''}`
      );

      return `Request approved. New partner ${sapBpNumber} will be created`;

    } catch (error) {
      console.error('Error creating new partner:', error);
      req.error(500, error.message);
    }
  });

  /**
   * Check Duplicates Action
   */
  this.on('checkDuplicates', BusinessPartnerRequests, async (req) => {
    const { ID } = req.params[0];

    try {
      const request = await SELECT.one.from(BusinessPartnerRequests).where({ ID });
      if (!request) {
        req.error(404, 'Request not found');
      }

      // Get VAT IDs
      const vatIds = await SELECT.from(PartnerVatIds).where({ request_ID: ID });
      const vatNumbers = vatIds.map(v => v.vatNumber);

      // Search for duplicates
      const duplicates = await searchDuplicates.call(this, {
        data: {
          partnerName: request.partnerName,
          vatIds: vatNumbers,
          threshold: 0.95
        }
      });

      // Store duplicate check results
      for (const duplicate of duplicates) {
        await INSERT.into(DuplicateChecks).entries({
          ID: uuidv4(),
          request_ID: ID,
          matchType: duplicate.matchType,
          matchScore: duplicate.matchScore,
          existingBpNumber: duplicate.bpNumber,
          existingBpName: duplicate.bpName,
          matchDetails: duplicate.matchDetails,
          reviewRequired: duplicate.matchScore > 0.8
        });
      }

      return duplicates;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      req.error(500, error.message);
    }
  });

  /**
   * Upload Document Action
   */
  this.on('uploadDocument', BusinessPartnerRequests, async (req) => {
    const { ID } = req.params[0];
    const { fileName, fileType, documentType, base64Content } = req.data;

    try {
      // In a real implementation, save file to storage (S3, BTP Object Store, etc.)
      const filePath = `/uploads/${ID}/${fileName}`;
      const fileSize = Buffer.byteLength(base64Content, 'base64');

      await INSERT.into(RequestAttachments).entries({
        ID: uuidv4(),
        request_ID: ID,
        fileName,
        fileType,
        fileSize,
        filePath,
        documentType,
        description: `Uploaded ${documentType} document`
      });

      return `Document ${fileName} uploaded successfully`;
    } catch (error) {
      console.error('Error uploading document:', error);
      req.error(500, error.message);
    }
  });

  /**
   * Validate VAT ID Action
   */
  this.on('validateVatId', PartnerVatIds, async (req) => {
    const { ID } = req.params[0];

    try {
      const vatId = await SELECT.one.from(PartnerVatIds).where({ ID });
      if (!vatId) {
        req.error(404, 'VAT ID not found');
      }

      const result = await viesService.validateVatId(vatId.country_code, vatId.vatNumber);

      // Update VAT ID with validation results
      await UPDATE(PartnerVatIds)
        .set({
          validationStatus: result.isValid ? 'Valid' : 'Invalid',
          validationDate: new Date().toISOString(),
          validationDetails: result.errorMessage || 'Validation completed'
        })
        .where({ ID });

      return {
        isValid: result.isValid,
        vatNumber: vatId.vatNumber,
        country: vatId.country_code,
        companyName: result.companyName || '',
        companyAddress: result.companyAddress || '',
        validationDate: result.validationDate || new Date().toISOString(),
        errorMessage: result.errorMessage || ''
      };
    } catch (error) {
      console.error('Error validating VAT ID:', error);
      req.error(500, error.message);
    }
  });

  // ================================
  // FUNCTION HANDLERS
  // ================================

  /**
   * Get Compliance Status Function
   */
  this.on('getComplianceStatus', async (req) => {
    const { requestId } = req.data;

    try {
      const request = await SELECT.one.from(BusinessPartnerRequests).where({ ID: requestId });
      if (!request) {
        req.error(404, 'Request not found');
      }

      return {
        aebStatus: request.aebComplianceStatus || 'NotChecked',
        aebDetails: request.aebComplianceDetails || '',
        viesStatus: request.viesValidationStatus || 'NotChecked',
        viesDetails: request.viesValidationDetails || '',
        overallStatus: calculateOverallComplianceStatus(request),
        checkTimestamp: request.modifiedAt || request.createdAt
      };
    } catch (error) {
      console.error('Error getting compliance status:', error);
      req.error(500, error.message);
    }
  });

  /**
   * Validate Business Partner Function
   */
  this.on('validateBusinessPartner', async (req) => {
    return await validateBusinessPartner.call(this, req);
  });

  /**
   * Search Duplicates Function
   */
  this.on('searchDuplicates', async (req) => {
    return await searchDuplicates.call(this, req);
  });

  // ================================
  // HELPER FUNCTIONS
  // ================================

  /**
   * Get next counter for request number generation
   */
  async function getNextCounter() {
    const count = await SELECT.from(BusinessPartnerRequests).columns('count(*) as count');
    return (count[0]?.count || 0) + 1;
  }

  /**
   * Create approval history entry
   */
  async function createApprovalHistoryEntry(requestId, action, previousStatus, newStatus, comments) {
    await INSERT.into(ApprovalHistory).entries({
      ID: uuidv4(),
      request_ID: requestId,
      approverUserId: this.context?.user?.id || 'system',
      approverName: this.context?.user?.displayName || 'System',
      action,
      previousStatus,
      newStatus,
      comments,
      systemGenerated: !this.context?.user
    });
  }

  /**
   * Generate SAP BP Number (mock implementation)
   */
  function generateSAPBPNumber() {
    const timestamp = Date.now().toString().slice(-6);
    return `BP${timestamp}`;
  }

  /**
   * Calculate overall compliance status
   */
  function calculateOverallComplianceStatus(request) {
    const aebPass = request.aebComplianceStatus === 'Pass';
    const viesValid = request.viesValidationStatus === 'Valid';

    if (aebPass && viesValid) return 'Pass';
    if (request.aebComplianceStatus === 'Fail') return 'Fail';
    if (request.viesValidationStatus === 'Invalid') return 'Fail';
    return 'Review Required';
  }

  /**
   * Validate business partner data
   */
  async function validateBusinessPartner(req) {
    const { requestId } = req.data;
    const errors = [];
    const warnings = [];

    try {
      // Get request and related data
      const request = await SELECT.one.from(BusinessPartnerRequests).where({ ID: requestId });
      if (!request) {
        errors.push({ field: 'request', message: 'Request not found', severity: 'Error' });
        return { isValid: false, errors, warnings };
      }

      // Validate basic fields
      if (!request.partnerName || request.partnerName.trim().length < 3) {
        errors.push({ field: 'partnerName', message: 'Partner name must be at least 3 characters', severity: 'Error' });
      }

      // Validate addresses
      const addresses = await SELECT.from(PartnerAddresses).where({ request_ID: requestId });
      if (addresses.length === 0) {
        errors.push({ field: 'addresses', message: 'At least one address is required', severity: 'Error' });
      }

      // Validate VAT IDs
      const vatIds = await SELECT.from(PartnerVatIds).where({ request_ID: requestId });
      if (vatIds.length === 0) {
        warnings.push({ field: 'vatIds', message: 'No VAT IDs provided', recommendation: 'Consider adding VAT ID if applicable' });
      }

      // Validate emails
      const emails = await SELECT.from(PartnerEmails).where({ request_ID: requestId });
      if (emails.length === 0) {
        warnings.push({ field: 'emails', message: 'No email addresses provided', recommendation: 'Add at least one email address' });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('Error validating business partner:', error);
      return {
        isValid: false,
        errors: [{ field: 'general', message: error.message, severity: 'Error' }],
        warnings
      };
    }
  }

  /**
   * Search for duplicates using fuzzy matching
   */
  async function searchDuplicates(req) {
    const { partnerName, vatIds, threshold } = req.data;
    const duplicates = [];

    try {
      // Search by VAT ID (exact match)
      if (vatIds && vatIds.length > 0) {
        for (const vatId of vatIds) {
          const existingVatIds = await SELECT.from(PartnerVatIds)
            .where({ vatNumber: vatId });

          for (const existing of existingVatIds) {
            const existingRequest = await SELECT.one.from(BusinessPartnerRequests)
              .where({ ID: existing.request_ID });

            if (existingRequest) {
              duplicates.push({
                bpNumber: existingRequest.sapBpNumber || existingRequest.requestNumber,
                bpName: existingRequest.partnerName,
                matchScore: 1.0,
                matchType: 'VAT',
                matchDetails: `Exact VAT ID match: ${vatId}`
              });
            }
          }
        }
      }

      // Search by name (fuzzy match)
      if (partnerName) {
        const allRequests = await SELECT.from(BusinessPartnerRequests)
          .where({ status: { '!=': 'Rejected' } });

        const fuzzyResults = fuzzy.filter(partnerName, allRequests, {
          extract: (req) => req.partnerName
        });

        for (const result of fuzzyResults) {
          if (result.score >= threshold && result.original.ID !== req.params?.[0]?.ID) {
            duplicates.push({
              bpNumber: result.original.sapBpNumber || result.original.requestNumber,
              bpName: result.original.partnerName,
              matchScore: result.score,
              matchType: 'Name',
              matchDetails: `Fuzzy name match (${Math.round(result.score * 100)}%)`
            });
          }
        }
      }

      // Remove duplicates and sort by match score
      const uniqueDuplicates = duplicates.filter((item, index, self) =>
        index === self.findIndex(t => t.bpNumber === item.bpNumber)
      ).sort((a, b) => b.matchScore - a.matchScore);

      return uniqueDuplicates;
    } catch (error) {
      console.error('Error searching duplicates:', error);
      return [];
    }
  }

  console.log('MDM Service initialized successfully');
});
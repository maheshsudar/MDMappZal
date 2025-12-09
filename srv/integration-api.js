const cds = require('@sap/cds');

/**
 * Integration API for External Systems
 * Provides REST endpoints for external systems (Coupa, Salesforce, PI) to create/update partner requests
 */
module.exports = class IntegrationAPI extends cds.ApplicationService {

  async init() {
    // Register HTTP endpoints for external system integration
    const express = require('express');
    const router = express.Router();

    // Middleware for JSON parsing
    router.use(express.json({ limit: '10mb' }));

    // Authentication middleware (simplified - use proper auth in production)
    router.use(this.authenticateExternalSystem.bind(this));

    // Partner request endpoints
    router.post('/partners/create', this.createPartnerRequest.bind(this));
    router.post('/partners/update', this.updatePartnerRequest.bind(this));
    router.get('/partners/:requestNumber/status', this.getRequestStatus.bind(this));
    router.get('/partners/requests', this.getPartnerRequests.bind(this));

    // Bulk operations
    router.post('/partners/bulk/create', this.bulkCreatePartnerRequests.bind(this));
    router.post('/partners/bulk/status', this.getBulkRequestStatus.bind(this));

    // Webhook endpoints for external systems to receive notifications
    router.post('/webhooks/partner-approved', this.handlePartnerApproved.bind(this));
    router.post('/webhooks/partner-rejected', this.handlePartnerRejected.bind(this));

    // Integration status and health check
    router.get('/health', this.healthCheck.bind(this));
    router.get('/endpoints', this.listEndpoints.bind(this));

    // Mount router
    this.on('*', '/**', (req, res, next) => {
      if (req.path.startsWith('/integration/')) {
        return router(req, res, next);
      }
      next();
    });

    return super.init();
  }

  // Authentication middleware for external systems
  async authenticateExternalSystem(req, res, next) {
    try {
      const apiKey = req.headers['x-api-key'];
      const sourceSystem = req.headers['x-source-system'];

      if (!apiKey || !sourceSystem) {
        return res.status(401).json({
          error: 'Missing authentication headers',
          required: ['x-api-key', 'x-source-system']
        });
      }

      // In production, validate API key against system configuration
      const validSystems = ['Coupa', 'Salesforce', 'PI'];
      if (!validSystems.includes(sourceSystem)) {
        return res.status(401).json({
          error: 'Invalid source system',
          validSystems
        });
      }

      req.sourceSystem = sourceSystem;
      req.authenticated = true;
      next();
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(500).json({ error: 'Authentication failed', details: error.message });
    }
  }

  // Create Partner Request - External System Endpoint
  async createPartnerRequest(req, res) {
    try {
      const { sourceSystem } = req;
      const partnerData = req.body;

      // Validate required fields
      const validation = this.validatePartnerData(partnerData, 'Create');
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: validation.errors
        });
      }

      // Generate request number
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const counter = await this.getNextCounter();
      const requestNumber = `MDM-${timestamp}-${counter.toString().padStart(4, '0')}`;

      // Create the business partner request
      const requestData = {
        requestNumber,
        entityType: partnerData.entityType || 'Supplier',
        requestType: 'Create',
        sourceSystem,
        status: 'Draft',
        requesterId: partnerData.requesterId || 'external-system',
        requesterName: partnerData.requesterName || `${sourceSystem} System`,
        requesterEmail: partnerData.requesterEmail || `${sourceSystem.toLowerCase()}@company.com`,
        partnerName: partnerData.partnerName,
        searchTerm: partnerData.searchTerm || partnerData.partnerName.substring(0, 20),
        partnerRole: partnerData.partnerRole || partnerData.entityType || 'Supplier',
        businessChannels: partnerData.businessChannels,
        coupaInternalNo: partnerData.coupaInternalNo,
        salesforceId: partnerData.salesforceId,
        piId: partnerData.piId,
        paymentTerms: partnerData.paymentTerms,
        paymentMethod: partnerData.paymentMethod || 'BankTransfer',
        reconAccount: partnerData.reconAccount,
        comments: partnerData.comments || `Created via ${sourceSystem} integration`
      };

      const result = await INSERT.into('mdm.db.BusinessPartnerRequests').entries(requestData);
      const requestId = result.req ? result.req.data.ID : result.ID;

      // Add addresses
      if (partnerData.addresses && partnerData.addresses.length > 0) {
        const addressData = partnerData.addresses.map(addr => ({
          ...addr,
          request_ID: requestId
        }));
        await INSERT.into('mdm.db.PartnerAddresses').entries(addressData);
      }

      // Add emails
      if (partnerData.emails && partnerData.emails.length > 0) {
        const emailData = partnerData.emails.map(email => ({
          ...email,
          request_ID: requestId
        }));
        await INSERT.into('mdm.db.PartnerEmails').entries(emailData);
      }

      // Add banks
      if (partnerData.banks && partnerData.banks.length > 0) {
        const bankData = partnerData.banks.map(bank => ({
          ...bank,
          request_ID: requestId
        }));
        await INSERT.into('mdm.db.PartnerBanks').entries(bankData);
      }

      // Add VAT IDs
      if (partnerData.vatIds && partnerData.vatIds.length > 0) {
        const vatData = partnerData.vatIds.map(vat => ({
          ...vat,
          request_ID: requestId
        }));
        await INSERT.into('mdm.db.PartnerVatIds').entries(vatData);
      }

      // Create approval history entry
      await INSERT.into('mdm.db.ApprovalHistory').entries({
        request_ID: requestId,
        approverUserId: 'system',
        approverName: `${sourceSystem} Integration`,
        action: 'Create',
        previousStatus: null,
        newStatus: 'Draft',
        comments: `Request created via ${sourceSystem} integration API`,
        systemGenerated: true
      });

      res.status(201).json({
        success: true,
        requestNumber,
        requestId,
        status: 'Draft',
        message: 'Partner request created successfully',
        nextSteps: [
          `Request ${requestNumber} has been created and is ready for MDM review`,
          'The MDM team will perform compliance checks and duplicate validation',
          'You will receive notifications via webhook when the request is approved/rejected'
        ],
        statusCheckUrl: `/integration/partners/${requestNumber}/status`
      });

    } catch (error) {
      console.error('Error creating partner request:', error);
      res.status(500).json({
        error: 'Failed to create partner request',
        details: error.message
      });
    }
  }

  // Update Partner Request - External System Endpoint
  async updatePartnerRequest(req, res) {
    try {
      const { sourceSystem } = req;
      const partnerData = req.body;

      // Validate required fields for update
      if (!partnerData.existingBpNumber) {
        return res.status(400).json({
          error: 'existingBpNumber is required for update requests'
        });
      }

      const validation = this.validatePartnerData(partnerData, 'Update');
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          errors: validation.errors
        });
      }

      // Generate request number
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const counter = await this.getNextCounter();
      const requestNumber = `MDM-${timestamp}-${counter.toString().padStart(4, '0')}`;

      // Create the update request
      const requestData = {
        requestNumber,
        entityType: partnerData.entityType || 'Supplier',
        requestType: 'Update',
        sourceSystem,
        status: 'Draft',
        existingBpNumber: partnerData.existingBpNumber,
        existingBpName: partnerData.existingBpName,
        changeDescription: partnerData.changeDescription || 'Update request via integration API',
        requesterId: partnerData.requesterId || 'external-system',
        requesterName: partnerData.requesterName || `${sourceSystem} System`,
        requesterEmail: partnerData.requesterEmail || `${sourceSystem.toLowerCase()}@company.com`,
        partnerName: partnerData.partnerName,
        searchTerm: partnerData.searchTerm || partnerData.partnerName.substring(0, 20),
        partnerRole: partnerData.partnerRole || partnerData.entityType || 'Supplier',
        businessChannels: partnerData.businessChannels,
        coupaInternalNo: partnerData.coupaInternalNo,
        salesforceId: partnerData.salesforceId,
        piId: partnerData.piId,
        paymentTerms: partnerData.paymentTerms,
        paymentMethod: partnerData.paymentMethod || 'BankTransfer',
        reconAccount: partnerData.reconAccount,
        comments: partnerData.comments || `Updated via ${sourceSystem} integration`
      };

      const result = await INSERT.into('mdm.db.BusinessPartnerRequests').entries(requestData);
      const requestId = result.req ? result.req.data.ID : result.ID;

      // Add updated data (addresses, emails, banks, VAT IDs) - same logic as create
      // ... (similar to create logic above)

      res.status(201).json({
        success: true,
        requestNumber,
        requestId,
        status: 'Draft',
        message: 'Partner update request created successfully',
        existingBpNumber: partnerData.existingBpNumber,
        statusCheckUrl: `/integration/partners/${requestNumber}/status`
      });

    } catch (error) {
      console.error('Error creating update request:', error);
      res.status(500).json({
        error: 'Failed to create update request',
        details: error.message
      });
    }
  }

  // Get Request Status - External System Endpoint
  async getRequestStatus(req, res) {
    try {
      const { requestNumber } = req.params;
      const { sourceSystem } = req;

      const request = await SELECT.one.from('mdm.db.BusinessPartnerRequests')
        .where({ requestNumber, sourceSystem });

      if (!request) {
        return res.status(404).json({
          error: 'Request not found',
          requestNumber
        });
      }

      // Get approval history
      const history = await SELECT.from('mdm.db.ApprovalHistory')
        .where({ request_ID: request.ID })
        .orderBy('createdAt desc')
        .limit(10);

      res.json({
        requestNumber,
        requestId: request.ID,
        status: request.status,
        requestType: request.requestType,
        partnerName: request.partnerName,
        sapBpNumber: request.sapBpNumber,
        createdAt: request.createdAt,
        updatedAt: request.modifiedAt,
        approvedBy: request.approvedBy,
        approvedAt: request.approvedAt,
        rejectionReason: request.rejectionReason,
        comments: request.comments,
        complianceStatus: {
          aeb: request.aebComplianceStatus,
          vies: request.viesValidationStatus
        },
        history: history.map(h => ({
          action: h.action,
          status: h.newStatus,
          approver: h.approverName,
          timestamp: h.createdAt,
          comments: h.comments
        }))
      });

    } catch (error) {
      console.error('Error getting request status:', error);
      res.status(500).json({
        error: 'Failed to get request status',
        details: error.message
      });
    }
  }

  // Get Partner Requests with filtering
  async getPartnerRequests(req, res) {
    try {
      const { sourceSystem } = req;
      const {
        status,
        requestType,
        limit = 100,
        offset = 0,
        fromDate,
        toDate
      } = req.query;

      let query = SELECT.from('mdm.db.BusinessPartnerRequests')
        .where({ sourceSystem });

      if (status) {
        query = query.and({ status });
      }

      if (requestType) {
        query = query.and({ requestType });
      }

      if (fromDate) {
        query = query.and({ createdAt: { '>=': fromDate } });
      }

      if (toDate) {
        query = query.and({ createdAt: { '<=': toDate } });
      }

      const requests = await query
        .orderBy('createdAt desc')
        .limit(parseInt(limit), parseInt(offset));

      const totalCount = await SELECT.from('mdm.db.BusinessPartnerRequests')
        .where({ sourceSystem })
        .columns('count(*) as count');

      res.json({
        success: true,
        data: requests.map(req => ({
          requestNumber: req.requestNumber,
          requestId: req.ID,
          status: req.status,
          requestType: req.requestType,
          partnerName: req.partnerName,
          sapBpNumber: req.sapBpNumber,
          createdAt: req.createdAt,
          updatedAt: req.modifiedAt
        })),
        pagination: {
          total: totalCount[0].count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasNext: (parseInt(offset) + parseInt(limit)) < totalCount[0].count
        }
      });

    } catch (error) {
      console.error('Error getting partner requests:', error);
      res.status(500).json({
        error: 'Failed to get partner requests',
        details: error.message
      });
    }
  }

  // Bulk Create Partner Requests
  async bulkCreatePartnerRequests(req, res) {
    try {
      const { sourceSystem } = req;
      const { partners } = req.body;

      if (!Array.isArray(partners) || partners.length === 0) {
        return res.status(400).json({
          error: 'partners array is required and cannot be empty'
        });
      }

      if (partners.length > 50) {
        return res.status(400).json({
          error: 'Maximum 50 partners can be processed in one bulk request'
        });
      }

      const results = [];
      let successCount = 0;
      let errorCount = 0;

      for (const partnerData of partners) {
        try {
          // Create individual request (reuse logic from createPartnerRequest)
          const result = await this.processSinglePartnerRequest(partnerData, sourceSystem);
          results.push({
            partnerName: partnerData.partnerName,
            requestNumber: result.requestNumber,
            status: 'Success',
            requestId: result.requestId
          });
          successCount++;
        } catch (error) {
          results.push({
            partnerName: partnerData.partnerName,
            status: 'Error',
            error: error.message
          });
          errorCount++;
        }
      }

      res.status(200).json({
        success: true,
        summary: {
          total: partners.length,
          successful: successCount,
          failed: errorCount
        },
        results
      });

    } catch (error) {
      console.error('Error in bulk create:', error);
      res.status(500).json({
        error: 'Bulk create failed',
        details: error.message
      });
    }
  }

  // Health Check Endpoint
  async healthCheck(req, res) {
    try {
      // Check database connectivity
      const dbCheck = await SELECT.from('mdm.db.SystemConfiguration').limit(1);

      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'MDM Integration API',
        version: '1.0.0',
        checks: {
          database: 'healthy',
          authentication: req.authenticated ? 'healthy' : 'not authenticated'
        },
        uptime: process.uptime()
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  }

  // List Available Endpoints
  async listEndpoints(req, res) {
    const endpoints = [
      {
        endpoint: '/integration/partners/create',
        method: 'POST',
        description: 'Create new partner request',
        samplePayload: JSON.stringify({
          partnerName: "ACME Corporation",
          entityType: "Supplier",
          partnerRole: "Supplier",
          businessChannels: "NONMERCH",
          coupaInternalNo: "COUPA-12345",
          paymentTerms: "NET30",
          paymentMethod: "BankTransfer",
          addresses: [
            {
              addressType: "Main",
              name1: "ACME Corporation",
              street: "Main Street",
              streetNumber: "123",
              city: "New York",
              postalCode: "10001",
              country_code: "US"
            }
          ],
          emails: [
            {
              emailType: "Primary",
              emailAddress: "contact@acme.com"
            }
          ],
          vatIds: [
            {
              country_code: "US",
              vatNumber: "123456789"
            }
          ]
        }, null, 2)
      },
      {
        endpoint: '/integration/partners/update',
        method: 'POST',
        description: 'Create partner update request',
        samplePayload: JSON.stringify({
          existingBpNumber: "BP123456",
          existingBpName: "ACME Corporation",
          changeDescription: "Update payment terms",
          partnerName: "ACME Corporation Ltd",
          paymentTerms: "NET15"
        }, null, 2)
      },
      {
        endpoint: '/integration/partners/{requestNumber}/status',
        method: 'GET',
        description: 'Get request status and history',
        samplePayload: 'No payload required'
      },
      {
        endpoint: '/integration/partners/requests',
        method: 'GET',
        description: 'Get list of partner requests with filters',
        samplePayload: 'Query parameters: status, requestType, limit, offset, fromDate, toDate'
      }
    ];

    res.json({
      success: true,
      endpoints,
      authentication: {
        required: true,
        headers: {
          'x-api-key': 'Your API key',
          'x-source-system': 'Coupa|Salesforce|PI'
        }
      }
    });
  }

  // Helper method to validate partner data
  validatePartnerData(data, requestType) {
    const errors = [];

    if (!data.partnerName || data.partnerName.trim().length < 3) {
      errors.push('partnerName is required and must be at least 3 characters');
    }

    if (requestType === 'Create') {
      if (!data.addresses || data.addresses.length === 0) {
        errors.push('At least one address is required for create requests');
      } else {
        const hasMainAddress = data.addresses.some(addr => addr.addressType === 'Main');
        if (!hasMainAddress) {
          errors.push('A Main address is required (established address)');
        }
      }
    }

    if (requestType === 'Update' && !data.existingBpNumber) {
      errors.push('existingBpNumber is required for update requests');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Helper method to process single partner request
  async processSinglePartnerRequest(partnerData, sourceSystem) {
    // Implementation similar to createPartnerRequest but returns result object
    // ... (simplified for brevity)

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const counter = await this.getNextCounter();
    const requestNumber = `MDM-${timestamp}-${counter.toString().padStart(4, '0')}`;

    // Create request and return result
    return {
      requestNumber,
      requestId: 'generated-id', // would be actual ID from database
      status: 'Success'
    };
  }

  // Helper method to get next counter
  async getNextCounter() {
    const count = await SELECT.from('mdm.db.BusinessPartnerRequests').columns('count(*) as count');
    return (count[0]?.count || 0) + 1;
  }

  // Webhook handlers (for external systems to implement)
  async handlePartnerApproved(req, res) {
    // External systems can register webhooks to be notified when partners are approved/rejected
    res.json({ message: 'Webhook received - partner approved' });
  }

  async handlePartnerRejected(req, res) {
    res.json({ message: 'Webhook received - partner rejected' });
  }
};
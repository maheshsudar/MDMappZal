const cds = require('@sap/cds');
const express = require('express');

/**
 * CAP Server Bootstrap Configuration
 * Registers REST API endpoints for external system integration
 */

// Bootstrap the Express server with custom middleware
cds.on('bootstrap', (app) => {
  console.log('🚀 Bootstrapping CAP server with integration APIs...');

  // Create integration API router
  const integrationRouter = express.Router();

  // JSON parsing middleware with larger limit for document uploads
  integrationRouter.use(express.json({ limit: '10mb' }));
  integrationRouter.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Authentication middleware for external systems
  integrationRouter.use(authenticateExternalSystem);

  // ================================
  // INTEGRATION API ENDPOINTS
  // ================================

  // Partner request endpoints
  integrationRouter.post('/partners/create', createPartnerRequest);
  integrationRouter.post('/partners/update', updatePartnerRequest);
  integrationRouter.get('/partners/:requestNumber/status', getRequestStatus);
  integrationRouter.get('/partners/requests', getPartnerRequests);

  // Bulk operations
  integrationRouter.post('/partners/bulk/create', bulkCreatePartnerRequests);
  integrationRouter.post('/partners/bulk/status', getBulkRequestStatus);

  // Webhook endpoints for external systems to receive notifications
  integrationRouter.post('/webhooks/partner-approved', handlePartnerApproved);
  integrationRouter.post('/webhooks/partner-rejected', handlePartnerRejected);

  // Integration status and health check
  integrationRouter.get('/health', healthCheck);
  integrationRouter.get('/endpoints', listEndpoints);

  // Mount the integration router at /integration path
  app.use('/integration', integrationRouter);

  console.log('✅ Integration API endpoints registered at /integration');
});

/**
 * Authentication middleware for external systems
 * Validates API key and source system headers
 */
async function authenticateExternalSystem(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'];
    const sourceSystem = req.headers['x-source-system'];

    // Skip authentication for health check and options requests
    if (req.path === '/health' || req.method === 'OPTIONS') {
      return next();
    }

    if (!apiKey) {
      return res.status(401).json({
        error: 'Missing API key',
        message: 'X-API-Key header is required'
      });
    }

    if (!sourceSystem) {
      return res.status(401).json({
        error: 'Missing source system',
        message: 'X-Source-System header is required (Coupa, Salesforce, or PI)'
      });
    }

    // Validate source system
    const validSources = ['Coupa', 'Salesforce', 'PI'];
    if (!validSources.includes(sourceSystem)) {
      return res.status(401).json({
        error: 'Invalid source system',
        message: `Source system must be one of: ${validSources.join(', ')}`
      });
    }

    // Mock API key validation (in production, validate against actual keys)
    const validApiKeys = {
      'Coupa': 'coupa-api-key-123',
      'Salesforce': 'sf-api-key-456',
      'PI': 'pi-api-key-789'
    };

    if (apiKey !== validApiKeys[sourceSystem] && apiKey !== 'mock-api-key') {
      return res.status(403).json({
        error: 'Invalid API key',
        message: 'The provided API key is not valid for the specified source system'
      });
    }

    // Add source system to request for later use
    req.sourceSystem = sourceSystem;
    req.authenticated = true;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
}

/**
 * Create a new partner request
 */
async function createPartnerRequest(req, res) {
  try {
    console.log(`📝 Creating partner request from ${req.sourceSystem}`);

    const requestData = {
      ...req.body,
      sourceSystem: req.sourceSystem,
      requestType: 'Create'
    };

    // Validate required fields
    if (!requestData.partnerName) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'partnerName is required'
      });
    }

    // Get database connection and create request
    const db = await cds.connect.to('db');
    const { BusinessPartnerRequests } = db.entities('mdm.db');

    // Generate request number
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const counter = await getNextCounter(db);
    requestData.requestNumber = `MDM-${timestamp}-${counter.toString().padStart(4, '0')}`;

    // Set initial status
    requestData.status = 'Draft';
    requestData.statusCriticality = 0;

    const result = await db.create(BusinessPartnerRequests).entries(requestData);

    res.status(201).json({
      success: true,
      message: 'Partner request created successfully',
      data: {
        requestId: result.ID,
        requestNumber: requestData.requestNumber,
        status: requestData.status
      }
    });

  } catch (error) {
    console.error('Error creating partner request:', error);
    res.status(500).json({
      error: 'Request creation failed',
      message: error.message
    });
  }
}

/**
 * Update an existing partner request
 */
async function updatePartnerRequest(req, res) {
  try {
    console.log(`📝 Updating partner request from ${req.sourceSystem}`);

    const requestData = {
      ...req.body,
      sourceSystem: req.sourceSystem,
      requestType: 'Update'
    };

    // Validate required fields for update
    if (!requestData.existingBpNumber) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'existingBpNumber is required for update requests'
      });
    }

    // Get database connection and create request
    const db = await cds.connect.to('db');
    const { BusinessPartnerRequests } = db.entities('mdm.db');

    // Generate request number
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const counter = await getNextCounter(db);
    requestData.requestNumber = `MDM-${timestamp}-${counter.toString().padStart(4, '0')}`;

    // Set initial status
    requestData.status = 'Draft';
    requestData.statusCriticality = 0;

    const result = await db.create(BusinessPartnerRequests).entries(requestData);

    res.status(201).json({
      success: true,
      message: 'Partner update request created successfully',
      data: {
        requestId: result.ID,
        requestNumber: requestData.requestNumber,
        status: requestData.status,
        existingBpNumber: requestData.existingBpNumber
      }
    });

  } catch (error) {
    console.error('Error creating update request:', error);
    res.status(500).json({
      error: 'Update request creation failed',
      message: error.message
    });
  }
}

/**
 * Get request status by request number
 */
async function getRequestStatus(req, res) {
  try {
    const { requestNumber } = req.params;
    console.log(`📊 Getting status for request: ${requestNumber}`);

    const db = await cds.connect.to('db');
    const { BusinessPartnerRequests } = db.entities('mdm.db');

    const request = await db.read(BusinessPartnerRequests)
      .where({ requestNumber })
      .columns(['requestNumber', 'status', 'statusCriticality', 'sapBpNumber', 'rejectionReason', 'createdAt', 'modifiedAt']);

    if (!request || request.length === 0) {
      return res.status(404).json({
        error: 'Request not found',
        message: `No request found with number: ${requestNumber}`
      });
    }

    res.json({
      success: true,
      data: request[0]
    });

  } catch (error) {
    console.error('Error getting request status:', error);
    res.status(500).json({
      error: 'Status retrieval failed',
      message: error.message
    });
  }
}

/**
 * Get partner requests with filtering
 */
async function getPartnerRequests(req, res) {
  try {
    const { status, sourceSystem, limit = 50, offset = 0 } = req.query;
    console.log(`📋 Getting partner requests - Status: ${status}, Source: ${sourceSystem || req.sourceSystem}`);

    const db = await cds.connect.to('db');
    const { BusinessPartnerRequests } = db.entities('mdm.db');

    let query = db.read(BusinessPartnerRequests)
      .columns(['requestNumber', 'partnerName', 'status', 'statusCriticality', 'sourceSystem', 'createdAt', 'modifiedAt'])
      .limit(parseInt(limit), parseInt(offset));

    // Filter by source system (only show requests from the authenticated system)
    query = query.where({ sourceSystem: sourceSystem || req.sourceSystem });

    // Filter by status if provided
    if (status) {
      query = query.and({ status });
    }

    const requests = await query;

    res.json({
      success: true,
      data: requests,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: requests.length
      }
    });

  } catch (error) {
    console.error('Error getting partner requests:', error);
    res.status(500).json({
      error: 'Request retrieval failed',
      message: error.message
    });
  }
}

/**
 * Bulk create partner requests (up to 50 per batch)
 */
async function bulkCreatePartnerRequests(req, res) {
  try {
    const requests = req.body.requests || [];
    console.log(`📦 Bulk creating ${requests.length} partner requests from ${req.sourceSystem}`);

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        error: 'Invalid request format',
        message: 'requests array is required and cannot be empty'
      });
    }

    if (requests.length > 50) {
      return res.status(400).json({
        error: 'Batch size exceeded',
        message: 'Maximum 50 requests allowed per batch'
      });
    }

    const db = await cds.connect.to('db');
    const { BusinessPartnerRequests } = db.entities('mdm.db');

    const results = [];
    const errors = [];

    // Process each request
    for (let i = 0; i < requests.length; i++) {
      try {
        const requestData = {
          ...requests[i],
          sourceSystem: req.sourceSystem,
          requestType: 'Create'
        };

        // Validate required fields
        if (!requestData.partnerName) {
          errors.push({
            index: i,
            error: 'Missing partnerName',
            data: requests[i]
          });
          continue;
        }

        // Generate request number
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const counter = await getNextCounter(db);
        requestData.requestNumber = `MDM-${timestamp}-${(counter + i).toString().padStart(4, '0')}`;

        // Set initial status
        requestData.status = 'Draft';
        requestData.statusCriticality = 0;

        const result = await db.create(BusinessPartnerRequests).entries(requestData);

        results.push({
          index: i,
          requestId: result.ID,
          requestNumber: requestData.requestNumber,
          status: 'success'
        });

      } catch (error) {
        errors.push({
          index: i,
          error: error.message,
          data: requests[i]
        });
      }
    }

    res.status(207).json({ // 207 Multi-Status
      success: errors.length === 0,
      message: `Processed ${requests.length} requests. ${results.length} successful, ${errors.length} failed.`,
      results,
      errors
    });

  } catch (error) {
    console.error('Error in bulk create:', error);
    res.status(500).json({
      error: 'Bulk creation failed',
      message: error.message
    });
  }
}

/**
 * Get bulk request status
 */
async function getBulkRequestStatus(req, res) {
  try {
    const { requestNumbers } = req.body;

    if (!Array.isArray(requestNumbers) || requestNumbers.length === 0) {
      return res.status(400).json({
        error: 'Invalid request format',
        message: 'requestNumbers array is required'
      });
    }

    const db = await cds.connect.to('db');
    const { BusinessPartnerRequests } = db.entities('mdm.db');

    const requests = await db.read(BusinessPartnerRequests)
      .where({ requestNumber: { in: requestNumbers } })
      .columns(['requestNumber', 'status', 'statusCriticality', 'sapBpNumber', 'rejectionReason']);

    res.json({
      success: true,
      data: requests
    });

  } catch (error) {
    console.error('Error getting bulk status:', error);
    res.status(500).json({
      error: 'Bulk status retrieval failed',
      message: error.message
    });
  }
}

/**
 * Handle partner approved webhook
 */
async function handlePartnerApproved(req, res) {
  console.log(`✅ Partner approved webhook from ${req.sourceSystem}:`, req.body);

  // In a real implementation, this would trigger notifications to external systems
  res.json({
    success: true,
    message: 'Partner approved notification received'
  });
}

/**
 * Handle partner rejected webhook
 */
async function handlePartnerRejected(req, res) {
  console.log(`❌ Partner rejected webhook from ${req.sourceSystem}:`, req.body);

  // In a real implementation, this would trigger notifications to external systems
  res.json({
    success: true,
    message: 'Partner rejected notification received'
  });
}

/**
 * Health check endpoint
 */
async function healthCheck(req, res) {
  try {
    // Check database connectivity
    const db = await cds.connect.to('db');
    await db.run('SELECT 1');

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        api: 'operational'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}

/**
 * List available endpoints
 */
async function listEndpoints(req, res) {
  const endpoints = [
    {
      method: 'POST',
      path: '/integration/partners/create',
      description: 'Create a new partner request',
      authentication: 'API Key + Source System header required'
    },
    {
      method: 'POST',
      path: '/integration/partners/update',
      description: 'Create an update request for existing partner',
      authentication: 'API Key + Source System header required'
    },
    {
      method: 'GET',
      path: '/integration/partners/:requestNumber/status',
      description: 'Get request status by request number',
      authentication: 'API Key + Source System header required'
    },
    {
      method: 'GET',
      path: '/integration/partners/requests',
      description: 'Get list of partner requests with filtering',
      authentication: 'API Key + Source System header required'
    },
    {
      method: 'POST',
      path: '/integration/partners/bulk/create',
      description: 'Bulk create partner requests (max 50)',
      authentication: 'API Key + Source System header required'
    },
    {
      method: 'POST',
      path: '/integration/partners/bulk/status',
      description: 'Get status for multiple requests',
      authentication: 'API Key + Source System header required'
    },
    {
      method: 'GET',
      path: '/integration/health',
      description: 'API health check',
      authentication: 'None'
    },
    {
      method: 'GET',
      path: '/integration/endpoints',
      description: 'List all available endpoints',
      authentication: 'None'
    }
  ];

  res.json({
    service: 'MDM Integration API',
    version: '1.0.0',
    endpoints
  });
}

/**
 * Helper function to get next counter for request number generation
 */
async function getNextCounter(db) {
  const { BusinessPartnerRequests } = db.entities('mdm.db');
  const count = await db.read(BusinessPartnerRequests).columns('count(*) as count');
  return (count[0]?.count || 0) + 1;
}

// Export the CDS server module
module.exports = cds.server;
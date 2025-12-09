const cds = require('@sap/cds');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');

/**
 * Enhanced Authentication Service
 * Supports both development mock authentication and production XSUAA integration
 */
class AuthenticationService {

  constructor() {
    this.isProductionAuth = process.env.NODE_ENV === 'production';
    this.jwtSecret = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';
    this.xsuaaConfig = this.loadXSUAAConfig();
    this.sessionStore = new Map(); // In-memory session store for development
    this.apiKeys = new Map(); // API key store
    this.rateLimitStore = new Map(); // Rate limiting store

    this.initializeApiKeys();
    console.log(`🔐 Authentication service initialized (${this.isProductionAuth ? 'Production' : 'Development'} mode)`);
  }

  /**
   * Load XSUAA configuration from environment or service bindings
   */
  loadXSUAAConfig() {
    if (!this.isProductionAuth) {
      return null;
    }

    // Check for VCAP_SERVICES (Cloud Foundry)
    if (process.env.VCAP_SERVICES) {
      try {
        const vcapServices = JSON.parse(process.env.VCAP_SERVICES);
        const xsuaaService = vcapServices.xsuaa?.[0];
        if (xsuaaService) {
          return xsuaaService.credentials;
        }
      } catch (error) {
        console.error('Error parsing VCAP_SERVICES:', error);
      }
    }

    // Manual configuration
    return {
      clientid: process.env.XSUAA_CLIENT_ID,
      clientsecret: process.env.XSUAA_CLIENT_SECRET,
      url: process.env.XSUAA_URL,
      uaadomain: process.env.XSUAA_UAA_DOMAIN,
      verificationkey: process.env.XSUAA_VERIFICATION_KEY
    };
  }

  /**
   * Initialize API keys for external systems
   */
  initializeApiKeys() {
    // Production API keys should be loaded from secure storage
    const defaultApiKeys = {
      'coupa-api-key-12345': {
        system: 'Coupa',
        scopes: ['create_partner', 'update_partner', 'view_status'],
        rateLimit: { requests: 1000, window: 3600000 }, // 1000 requests per hour
        active: true,
        createdAt: new Date().toISOString()
      },
      'salesforce-api-key-67890': {
        system: 'Salesforce',
        scopes: ['create_partner', 'update_partner', 'view_status'],
        rateLimit: { requests: 500, window: 3600000 }, // 500 requests per hour
        active: true,
        createdAt: new Date().toISOString()
      },
      'pi-api-key-54321': {
        system: 'PI',
        scopes: ['create_partner', 'update_partner', 'view_status', 'bulk_operations'],
        rateLimit: { requests: 2000, window: 3600000 }, // 2000 requests per hour
        active: true,
        createdAt: new Date().toISOString()
      }
    };

    for (const [key, config] of Object.entries(defaultApiKeys)) {
      this.apiKeys.set(key, config);
    }

    console.log(`✅ Initialized ${this.apiKeys.size} API keys`);
  }

  /**
   * Authenticate user with JWT token (production) or mock user (development)
   *
   * @param {Object} req - Express request object
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateUser(req) {
    try {
      if (!this.isProductionAuth) {
        return this.authenticateMockUser(req);
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Missing or invalid authorization header');
      }

      const token = authHeader.substring(7);
      const user = await this.validateJWTToken(token);

      // Check if user session is valid
      const sessionId = req.headers['x-session-id'];
      if (sessionId && !this.validateSession(sessionId, user.id)) {
        throw new Error('Invalid session');
      }

      return {
        success: true,
        user,
        sessionId: sessionId || this.createSession(user.id)
      };

    } catch (error) {
      console.error('Authentication failed:', error.message);
      return {
        success: false,
        error: error.message,
        code: 'AUTH_FAILED'
      };
    }
  }

  /**
   * Authenticate mock user for development
   *
   * @param {Object} req - Express request object
   * @returns {Object} Mock authentication result
   */
  authenticateMockUser(req) {
    const userId = req.headers['x-user-id'] || 'alice';
    const userRoles = this.getMockUserRoles(userId);

    const mockUsers = {
      alice: {
        id: 'alice',
        displayName: 'Alice Johnson',
        email: 'alice.johnson@company.com',
        roles: ['MDMApprover'],
        scopes: ['read', 'write', 'approve', 'manage_duplicates'],
        department: 'Master Data Management',
        lastLogin: new Date().toISOString()
      },
      bob: {
        id: 'bob',
        displayName: 'Bob Smith',
        email: 'bob.smith@company.com',
        roles: ['SystemOwner'],
        scopes: ['read', 'acknowledge_notifications', 'view_metrics'],
        department: 'IT Operations',
        lastLogin: new Date().toISOString()
      },
      carol: {
        id: 'carol',
        displayName: 'Carol Davis',
        email: 'carol.davis@company.com',
        roles: ['BusinessUser'],
        scopes: ['read', 'create', 'submit'],
        department: 'Procurement',
        lastLogin: new Date().toISOString()
      }
    };

    const user = mockUsers[userId] || mockUsers.alice;
    const sessionId = this.createSession(user.id);

    return {
      success: true,
      user,
      sessionId,
      mock: true
    };
  }

  /**
   * Get mock user roles for development
   *
   * @param {string} userId - User ID
   * @returns {Array} User roles
   */
  getMockUserRoles(userId) {
    const roleMap = {
      alice: ['MDMApprover'],
      bob: ['SystemOwner'],
      carol: ['BusinessUser'],
      admin: ['Administrator', 'MDMApprover', 'SystemOwner']
    };

    return roleMap[userId] || ['BusinessUser'];
  }

  /**
   * Validate JWT token (production)
   *
   * @param {string} token - JWT token
   * @returns {Promise<Object>} User information
   */
  async validateJWTToken(token) {
    if (!this.xsuaaConfig) {
      throw new Error('XSUAA configuration not available');
    }

    try {
      // First, verify the token signature
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) {
        throw new Error('Invalid token format');
      }

      // Get public key from XSUAA
      const publicKey = await this.getXSUAAPublicKey(decoded.header.kid);

      // Verify and decode the token
      const payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.xsuaaConfig.url,
        audience: this.xsuaaConfig.clientid
      });

      // Extract user information
      const user = {
        id: payload.user_id || payload.sub,
        displayName: payload.user_name || payload.given_name + ' ' + payload.family_name,
        email: payload.email,
        roles: this.extractRoles(payload),
        scopes: payload.scope ? payload.scope.split(' ') : [],
        department: payload.custom_attributes?.department,
        lastLogin: new Date().toISOString(),
        tokenExpiry: new Date(payload.exp * 1000)
      };

      return user;

    } catch (error) {
      throw new Error(`JWT validation failed: ${error.message}`);
    }
  }

  /**
   * Get XSUAA public key for token verification
   *
   * @param {string} keyId - Key ID from token header
   * @returns {Promise<string>} Public key
   */
  async getXSUAAPublicKey(keyId) {
    try {
      const tokenKeysUrl = `${this.xsuaaConfig.url}/token_keys`;
      const response = await axios.get(tokenKeysUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });

      const key = response.data.keys.find(k => k.kid === keyId);
      if (!key) {
        throw new Error(`Key with ID ${keyId} not found`);
      }

      // Convert JWK to PEM format
      return this.jwkToPem(key);

    } catch (error) {
      throw new Error(`Failed to get public key: ${error.message}`);
    }
  }

  /**
   * Convert JWK to PEM format
   *
   * @param {Object} jwk - JSON Web Key
   * @returns {string} PEM formatted key
   */
  jwkToPem(jwk) {
    // This is a simplified implementation
    // In production, use a proper JWK to PEM conversion library
    const n = Buffer.from(jwk.n, 'base64');
    const e = Buffer.from(jwk.e, 'base64');

    // Create PEM from modulus and exponent
    // This is a basic implementation - use node-rsa or similar library in production
    return `-----BEGIN PUBLIC KEY-----\n${Buffer.concat([n, e]).toString('base64')}\n-----END PUBLIC KEY-----`;
  }

  /**
   * Extract roles from JWT payload
   *
   * @param {Object} payload - JWT payload
   * @returns {Array} User roles
   */
  extractRoles(payload) {
    const roles = [];

    // Check xs.system.attributes for role templates
    if (payload['xs.system.attributes']) {
      const roleTemplates = payload['xs.system.attributes']['xs.rolecollections'] || [];
      roles.push(...roleTemplates);
    }

    // Check scope for application roles
    if (payload.scope) {
      const scopes = payload.scope.split(' ');
      scopes.forEach(scope => {
        if (scope.startsWith('mdm.')) {
          const roleName = scope.replace('mdm.', '');
          roles.push(roleName);
        }
      });
    }

    return [...new Set(roles)]; // Remove duplicates
  }

  /**
   * Authenticate API key for external systems
   *
   * @param {string} apiKey - API key
   * @param {string} sourceSystem - Source system name
   * @returns {Object} Authentication result
   */
  authenticateApiKey(apiKey, sourceSystem) {
    try {
      const keyConfig = this.apiKeys.get(apiKey);

      if (!keyConfig) {
        return {
          success: false,
          error: 'Invalid API key',
          code: 'INVALID_API_KEY'
        };
      }

      if (!keyConfig.active) {
        return {
          success: false,
          error: 'API key is inactive',
          code: 'INACTIVE_API_KEY'
        };
      }

      if (keyConfig.system !== sourceSystem) {
        return {
          success: false,
          error: 'API key not valid for this source system',
          code: 'SYSTEM_MISMATCH'
        };
      }

      // Check rate limiting
      const rateLimitResult = this.checkRateLimit(apiKey, keyConfig.rateLimit);
      if (!rateLimitResult.allowed) {
        return {
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: rateLimitResult.retryAfter
        };
      }

      return {
        success: true,
        system: keyConfig.system,
        scopes: keyConfig.scopes,
        rateLimit: {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime
        }
      };

    } catch (error) {
      console.error('API key authentication failed:', error);
      return {
        success: false,
        error: 'Authentication failed',
        code: 'AUTH_ERROR'
      };
    }
  }

  /**
   * Check rate limiting for API key
   *
   * @param {string} apiKey - API key
   * @param {Object} rateLimit - Rate limit configuration
   * @returns {Object} Rate limit result
   */
  checkRateLimit(apiKey, rateLimit) {
    if (!rateLimit) {
      return { allowed: true, remaining: Infinity };
    }

    const now = Date.now();
    const windowStart = now - rateLimit.window;

    // Get current usage
    let usage = this.rateLimitStore.get(apiKey) || [];

    // Remove old entries outside the window
    usage = usage.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (usage.length >= rateLimit.requests) {
      const oldestRequest = Math.min(...usage);
      const retryAfter = Math.ceil((oldestRequest + rateLimit.window - now) / 1000);

      return {
        allowed: false,
        remaining: 0,
        retryAfter,
        resetTime: new Date(oldestRequest + rateLimit.window)
      };
    }

    // Add current request
    usage.push(now);
    this.rateLimitStore.set(apiKey, usage);

    return {
      allowed: true,
      remaining: rateLimit.requests - usage.length,
      resetTime: new Date(now + rateLimit.window)
    };
  }

  /**
   * Create user session
   *
   * @param {string} userId - User ID
   * @returns {string} Session ID
   */
  createSession(userId) {
    const sessionId = crypto.randomBytes(32).toString('hex');
    const session = {
      userId,
      createdAt: new Date(),
      lastAccess: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };

    this.sessionStore.set(sessionId, session);

    // Clean up expired sessions
    this.cleanExpiredSessions();

    return sessionId;
  }

  /**
   * Validate user session
   *
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID
   * @returns {boolean} Session validity
   */
  validateSession(sessionId, userId) {
    const session = this.sessionStore.get(sessionId);

    if (!session) {
      return false;
    }

    if (session.userId !== userId) {
      return false;
    }

    if (session.expiresAt < new Date()) {
      this.sessionStore.delete(sessionId);
      return false;
    }

    // Update last access
    session.lastAccess = new Date();
    this.sessionStore.set(sessionId, session);

    return true;
  }

  /**
   * Clean up expired sessions
   */
  cleanExpiredSessions() {
    const now = new Date();
    for (const [sessionId, session] of this.sessionStore.entries()) {
      if (session.expiresAt < now) {
        this.sessionStore.delete(sessionId);
      }
    }
  }

  /**
   * Destroy user session
   *
   * @param {string} sessionId - Session ID
   * @returns {boolean} Success status
   */
  destroySession(sessionId) {
    return this.sessionStore.delete(sessionId);
  }

  /**
   * Generate new API key for system
   *
   * @param {string} system - System name
   * @param {Array} scopes - Allowed scopes
   * @param {Object} rateLimit - Rate limit configuration
   * @returns {Object} API key information
   */
  generateApiKey(system, scopes = [], rateLimit = null) {
    const apiKey = `${system.toLowerCase()}-${crypto.randomBytes(16).toString('hex')}`;

    const keyConfig = {
      system,
      scopes,
      rateLimit: rateLimit || { requests: 1000, window: 3600000 },
      active: true,
      createdAt: new Date().toISOString(),
      lastUsed: null
    };

    this.apiKeys.set(apiKey, keyConfig);

    return {
      apiKey,
      system,
      scopes,
      rateLimit: keyConfig.rateLimit,
      createdAt: keyConfig.createdAt
    };
  }

  /**
   * Revoke API key
   *
   * @param {string} apiKey - API key to revoke
   * @returns {boolean} Success status
   */
  revokeApiKey(apiKey) {
    const keyConfig = this.apiKeys.get(apiKey);
    if (keyConfig) {
      keyConfig.active = false;
      keyConfig.revokedAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  /**
   * Get authentication statistics
   *
   * @returns {Object} Authentication statistics
   */
  getAuthStats() {
    const activeApiKeys = Array.from(this.apiKeys.values()).filter(key => key.active).length;
    const activeSessions = this.sessionStore.size;

    const rateLimitStats = {};
    for (const [apiKey, usage] of this.rateLimitStore.entries()) {
      const keyConfig = this.apiKeys.get(apiKey);
      if (keyConfig) {
        rateLimitStats[keyConfig.system] = {
          requests: usage.length,
          lastRequest: usage.length > 0 ? new Date(Math.max(...usage)) : null
        };
      }
    }

    return {
      mode: this.isProductionAuth ? 'production' : 'development',
      activeApiKeys,
      activeSessions,
      rateLimitStats,
      lastCleanup: new Date().toISOString()
    };
  }

  /**
   * Middleware for Express.js route protection
   *
   * @param {Array} requiredRoles - Required roles for access
   * @returns {Function} Express middleware function
   */
  requireAuth(requiredRoles = []) {
    return async (req, res, next) => {
      try {
        const authResult = await this.authenticateUser(req);

        if (!authResult.success) {
          return res.status(401).json({
            error: 'Authentication required',
            code: authResult.code,
            message: authResult.error
          });
        }

        // Check role authorization
        if (requiredRoles.length > 0) {
          const hasRequiredRole = requiredRoles.some(role =>
            authResult.user.roles.includes(role)
          );

          if (!hasRequiredRole) {
            return res.status(403).json({
              error: 'Insufficient permissions',
              code: 'INSUFFICIENT_PERMISSIONS',
              required: requiredRoles,
              current: authResult.user.roles
            });
          }
        }

        req.user = authResult.user;
        req.sessionId = authResult.sessionId;
        next();

      } catch (error) {
        console.error('Authentication middleware error:', error);
        res.status(500).json({
          error: 'Authentication error',
          code: 'AUTH_ERROR'
        });
      }
    };
  }

  /**
   * Middleware for API key authentication
   *
   * @param {Array} requiredScopes - Required scopes for access
   * @returns {Function} Express middleware function
   */
  requireApiKey(requiredScopes = []) {
    return (req, res, next) => {
      try {
        const apiKey = req.headers['x-api-key'];
        const sourceSystem = req.headers['x-source-system'];

        if (!apiKey || !sourceSystem) {
          return res.status(401).json({
            error: 'API key and source system required',
            code: 'MISSING_API_CREDENTIALS'
          });
        }

        const authResult = this.authenticateApiKey(apiKey, sourceSystem);

        if (!authResult.success) {
          const status = authResult.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 401;
          const response = {
            error: authResult.error,
            code: authResult.code
          };

          if (authResult.retryAfter) {
            response.retryAfter = authResult.retryAfter;
            res.set('Retry-After', authResult.retryAfter.toString());
          }

          return res.status(status).json(response);
        }

        // Check scope authorization
        if (requiredScopes.length > 0) {
          const hasRequiredScope = requiredScopes.some(scope =>
            authResult.scopes.includes(scope)
          );

          if (!hasRequiredScope) {
            return res.status(403).json({
              error: 'Insufficient API permissions',
              code: 'INSUFFICIENT_API_PERMISSIONS',
              required: requiredScopes,
              current: authResult.scopes
            });
          }
        }

        req.apiAuth = authResult;
        req.sourceSystem = sourceSystem;
        next();

      } catch (error) {
        console.error('API key authentication error:', error);
        res.status(500).json({
          error: 'API authentication error',
          code: 'API_AUTH_ERROR'
        });
      }
    };
  }
}

module.exports = AuthenticationService;
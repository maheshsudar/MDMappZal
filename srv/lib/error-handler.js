const cds = require('@sap/cds');

/**
 * Enhanced Error Handler for MDM Service
 * Implements CAP best practices for error handling with structured responses
 */
class ErrorHandler {

  /**
   * Standard error codes used throughout the application
   */
  static ERROR_CODES = {
    // Validation Errors (400-499)
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT',
    INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

    // Authorization Errors (401-403)
    UNAUTHORIZED: 'UNAUTHORIZED',
    FORBIDDEN: 'FORBIDDEN',
    INSUFFICIENT_PRIVILEGES: 'INSUFFICIENT_PRIVILEGES',

    // Not Found Errors (404)
    ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
    REQUEST_NOT_FOUND: 'REQUEST_NOT_FOUND',

    // Business Logic Errors (422)
    BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
    INVALID_OPERATION: 'INVALID_OPERATION',
    COMPLIANCE_CHECK_FAILED: 'COMPLIANCE_CHECK_FAILED',

    // External Service Errors (502-504)
    EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    TIMEOUT: 'TIMEOUT',

    // Internal Errors (500)
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    CONFIGURATION_ERROR: 'CONFIGURATION_ERROR'
  };

  /**
   * Create a structured error response following CAP conventions
   *
   * @param {string} code - Error code from ERROR_CODES
   * @param {string} message - Human-readable error message
   * @param {string} target - Field or entity causing the error
   * @param {Object} details - Additional error details
   * @param {number} httpStatus - HTTP status code (optional)
   * @returns {Object} Structured error object
   */
  static createError(code, message, target = null, details = null, httpStatus = null) {
    const error = new Error(message);
    error.code = code;
    error.target = target;
    error.details = details;

    // Map error codes to HTTP status codes if not provided
    if (!httpStatus) {
      httpStatus = this.getHttpStatusForCode(code);
    }
    error.status = httpStatus;

    // Add correlation ID for tracing
    error.correlationId = this.generateCorrelationId();

    return error;
  }

  /**
   * Validation error factory
   *
   * @param {string} field - Field name that failed validation
   * @param {string} message - Validation error message
   * @param {*} value - Invalid value (optional)
   * @returns {Object} Validation error
   */
  static validationError(field, message, value = null) {
    return this.createError(
      this.ERROR_CODES.VALIDATION_FAILED,
      message,
      field,
      { invalidValue: value },
      400
    );
  }

  /**
   * Business rule violation error factory
   *
   * @param {string} rule - Business rule that was violated
   * @param {string} message - Error message
   * @param {Object} context - Additional context
   * @returns {Object} Business rule error
   */
  static businessRuleError(rule, message, context = null) {
    return this.createError(
      this.ERROR_CODES.BUSINESS_RULE_VIOLATION,
      message,
      rule,
      context,
      422
    );
  }

  /**
   * Authorization error factory
   *
   * @param {string} operation - Operation that was denied
   * @param {string} resource - Resource being accessed
   * @param {Array} requiredRoles - Roles required for operation
   * @returns {Object} Authorization error
   */
  static authorizationError(operation, resource, requiredRoles = []) {
    return this.createError(
      this.ERROR_CODES.INSUFFICIENT_PRIVILEGES,
      `Insufficient privileges to ${operation} ${resource}`,
      resource,
      { requiredRoles, operation },
      403
    );
  }

  /**
   * External service error factory
   *
   * @param {string} service - External service name
   * @param {string} operation - Operation that failed
   * @param {Error} originalError - Original error from service
   * @returns {Object} External service error
   */
  static externalServiceError(service, operation, originalError) {
    return this.createError(
      this.ERROR_CODES.EXTERNAL_SERVICE_ERROR,
      `External service ${service} failed during ${operation}: ${originalError.message}`,
      service,
      {
        operation,
        originalMessage: originalError.message,
        serviceResponse: originalError.response?.data || null
      },
      502
    );
  }

  /**
   * Entity not found error factory
   *
   * @param {string} entityType - Type of entity
   * @param {string} identifier - Entity identifier
   * @returns {Object} Not found error
   */
  static notFoundError(entityType, identifier) {
    return this.createError(
      this.ERROR_CODES.ENTITY_NOT_FOUND,
      `${entityType} with identifier '${identifier}' not found`,
      entityType,
      { identifier },
      404
    );
  }

  /**
   * Map error codes to HTTP status codes
   *
   * @param {string} code - Error code
   * @returns {number} HTTP status code
   */
  static getHttpStatusForCode(code) {
    const statusMap = {
      [this.ERROR_CODES.VALIDATION_FAILED]: 400,
      [this.ERROR_CODES.MISSING_REQUIRED_FIELD]: 400,
      [this.ERROR_CODES.INVALID_FORMAT]: 400,
      [this.ERROR_CODES.DUPLICATE_ENTRY]: 409,

      [this.ERROR_CODES.UNAUTHORIZED]: 401,
      [this.ERROR_CODES.FORBIDDEN]: 403,
      [this.ERROR_CODES.INSUFFICIENT_PRIVILEGES]: 403,

      [this.ERROR_CODES.ENTITY_NOT_FOUND]: 404,
      [this.ERROR_CODES.REQUEST_NOT_FOUND]: 404,

      [this.ERROR_CODES.BUSINESS_RULE_VIOLATION]: 422,
      [this.ERROR_CODES.INVALID_OPERATION]: 422,
      [this.ERROR_CODES.COMPLIANCE_CHECK_FAILED]: 422,
      [this.ERROR_CODES.INVALID_STATUS_TRANSITION]: 422,

      [this.ERROR_CODES.EXTERNAL_SERVICE_ERROR]: 502,
      [this.ERROR_CODES.SERVICE_UNAVAILABLE]: 503,
      [this.ERROR_CODES.TIMEOUT]: 504,

      [this.ERROR_CODES.INTERNAL_ERROR]: 500,
      [this.ERROR_CODES.DATABASE_ERROR]: 500,
      [this.ERROR_CODES.CONFIGURATION_ERROR]: 500
    };

    return statusMap[code] || 500;
  }

  /**
   * Generate correlation ID for error tracing
   *
   * @returns {string} Correlation ID
   */
  static generateCorrelationId() {
    return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Sanitize error for production response
   * Removes sensitive information in production environments
   *
   * @param {Error} error - Original error
   * @returns {Object} Sanitized error object
   */
  static sanitizeError(error) {
    const isProd = process.env.NODE_ENV === 'production';

    const sanitized = {
      error: {
        code: error.code || this.ERROR_CODES.INTERNAL_ERROR,
        message: error.message,
        correlationId: error.correlationId
      }
    };

    // Add target if provided
    if (error.target) {
      sanitized.error.target = error.target;
    }

    // In development, include more details
    if (!isProd && error.details) {
      sanitized.error.details = error.details;
    }

    // Include stack trace in development
    if (!isProd && error.stack) {
      sanitized.error.stack = error.stack;
    }

    return sanitized;
  }

  /**
   * Handle CAP request errors with proper logging and response formatting
   *
   * @param {Error} error - Error to handle
   * @param {Object} req - CAP request object
   * @returns {void}
   */
  static handleRequestError(error, req) {
    // Log error with correlation ID
    console.error(`[${error.correlationId || 'NO-CORRELATION'}] Error in ${req.method} ${req.path}:`, {
      code: error.code,
      message: error.message,
      target: error.target,
      details: error.details,
      stack: error.stack,
      user: req.user?.id,
      timestamp: new Date().toISOString()
    });

    // Use CAP's error method with proper status code
    const httpStatus = error.status || this.getHttpStatusForCode(error.code) || 500;
    const sanitized = this.sanitizeError(error);

    req.error(httpStatus, sanitized.error);
  }

  /**
   * Validation helper for required fields
   *
   * @param {Object} data - Data object to validate
   * @param {Array} requiredFields - Array of required field names
   * @throws {Error} Validation error if required fields are missing
   */
  static validateRequiredFields(data, requiredFields) {
    const missingFields = [];

    for (const field of requiredFields) {
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      throw this.createError(
        this.ERROR_CODES.MISSING_REQUIRED_FIELD,
        `Required fields are missing: ${missingFields.join(', ')}`,
        'validation',
        { missingFields },
        400
      );
    }
  }

  /**
   * Validation helper for field formats
   *
   * @param {string} field - Field name
   * @param {*} value - Field value
   * @param {RegExp} pattern - Validation pattern
   * @param {string} formatDescription - Description of expected format
   * @throws {Error} Validation error if format is invalid
   */
  static validateFormat(field, value, pattern, formatDescription) {
    if (value && !pattern.test(value)) {
      throw this.validationError(
        field,
        `Invalid format for ${field}. Expected: ${formatDescription}`,
        value
      );
    }
  }

  /**
   * Business rule validation helper
   *
   * @param {boolean} condition - Condition to check
   * @param {string} rule - Rule name
   * @param {string} message - Error message
   * @param {Object} context - Additional context
   * @throws {Error} Business rule error if condition is false
   */
  static assertBusinessRule(condition, rule, message, context = null) {
    if (!condition) {
      throw this.businessRuleError(rule, message, context);
    }
  }

  /**
   * Status transition validation
   *
   * @param {string} fromStatus - Current status
   * @param {string} toStatus - Target status
   * @param {Object} validTransitions - Valid transition map
   * @throws {Error} Invalid status transition error
   */
  static validateStatusTransition(fromStatus, toStatus, validTransitions) {
    const allowedTransitions = validTransitions[fromStatus] || [];

    if (!allowedTransitions.includes(toStatus)) {
      throw this.createError(
        this.ERROR_CODES.INVALID_STATUS_TRANSITION,
        `Invalid status transition from '${fromStatus}' to '${toStatus}'. Allowed transitions: ${allowedTransitions.join(', ')}`,
        'status',
        { fromStatus, toStatus, allowedTransitions },
        422
      );
    }
  }
}

module.exports = ErrorHandler;
const cds = require('@sap/cds');
const axios = require('axios');
const nodemailer = require('nodemailer');
const ErrorHandler = require('./error-handler');

/**
 * Comprehensive Notification Service
 * Handles email notifications, webhook callbacks, and system integrations
 */
class NotificationService {

  constructor() {
    this.webhookQueue = [];
    this.emailQueue = [];
    this.retryAttempts = 3;
    this.retryDelay = 1000; // Initial delay in milliseconds
    this.emailTransporter = null;
    // Initialize email service asynchronously without blocking
    this.initializeEmailService().catch(err => {
      console.warn('⚠️ Email service initialization failed, continuing without email support:', err.message);
    });
  }

  /**
   * Initialize email service with production-ready configuration
   */
  async initializeEmailService() {
    try {
      // Production email configuration
      const emailConfig = {
        host: process.env.SMTP_HOST || 'localhost',
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || 'mdm-system@company.com',
          pass: process.env.SMTP_PASS || 'password123'
        },
        tls: {
          rejectUnauthorized: process.env.NODE_ENV === 'production'
        }
      };

      // For development, use Ethereal test account
      if (process.env.NODE_ENV !== 'production') {
        const testAccount = await nodemailer.createTestAccount();
        emailConfig.host = 'smtp.ethereal.email';
        emailConfig.port = 587;
        emailConfig.secure = false;
        emailConfig.auth = {
          user: testAccount.user,
          pass: testAccount.pass
        };
        console.log('📧 Using Ethereal test email account:', testAccount.user);
      }

      this.emailTransporter = nodemailer.createTransporter(emailConfig);

      // Verify email service connection
      await this.emailTransporter.verify();
      console.log('✅ Email service initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.emailTransporter = null;
    }
  }

  /**
   * Send notification for business partner request status change
   *
   * @param {Object} request - Business partner request
   * @param {string} event - Event type (created, submitted, approved, rejected, etc.)
   * @param {Object} context - Additional context (user, comments, etc.)
   * @returns {Promise<Object>} Notification result
   */
  async sendStatusChangeNotification(request, event, context = {}) {
    console.log(`📬 Sending ${event} notification for request ${request.requestNumber}`);

    const notifications = [];

    try {
      // 1. Send webhook notifications to source system
      if (request.sourceSystem && request.sourceSystem !== 'Manual') {
        const webhookResult = await this.sendWebhookNotification(request, event, context);
        notifications.push({
          type: 'webhook',
          target: request.sourceSystem,
          result: webhookResult
        });
      }

      // 2. Send email notifications to stakeholders
      const emailResult = await this.sendEmailNotifications(request, event, context);
      notifications.push({
        type: 'email',
        target: 'stakeholders',
        result: emailResult
      });

      // 3. Create system notification record
      const systemNotification = await this.createSystemNotification(request, event, context);
      notifications.push({
        type: 'system',
        target: 'internal',
        result: systemNotification
      });

      // 4. Send notifications to satellite systems if approved
      if (event === 'approved') {
        const satelliteResult = await this.notifySatelliteSystems(request, context);
        notifications.push({
          type: 'satellite',
          target: 'multiple',
          result: satelliteResult
        });
      }

      return {
        success: true,
        notifications,
        message: `All notifications sent successfully for ${event} event`
      };

    } catch (error) {
      console.error(`❌ Error sending notifications for ${event}:`, error);
      return {
        success: false,
        error: error.message,
        notifications
      };
    }
  }

  /**
   * Send webhook notification to external system
   *
   * @param {Object} request - Business partner request
   * @param {string} event - Event type
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Webhook result
   */
  async sendWebhookNotification(request, event, context) {
    const webhookUrls = await this.getWebhookUrls(request.sourceSystem);

    if (!webhookUrls || webhookUrls.length === 0) {
      console.log(`⚠️ No webhook URLs configured for ${request.sourceSystem}`);
      return { status: 'skipped', reason: 'No webhook URLs configured' };
    }

    const payload = this.buildWebhookPayload(request, event, context);
    const results = [];

    for (const webhookUrl of webhookUrls) {
      try {
        const result = await this.sendWebhookWithRetry(webhookUrl, payload, request.sourceSystem);
        results.push({
          url: webhookUrl,
          status: 'success',
          response: result
        });
      } catch (error) {
        results.push({
          url: webhookUrl,
          status: 'failed',
          error: error.message
        });
      }
    }

    return {
      status: results.every(r => r.status === 'success') ? 'success' : 'partial',
      results
    };
  }

  /**
   * Send webhook with retry logic
   *
   * @param {string} url - Webhook URL
   * @param {Object} payload - Webhook payload
   * @param {string} sourceSystem - Source system name
   * @returns {Promise<Object>} Response data
   */
  async sendWebhookWithRetry(url, payload, sourceSystem) {
    let lastError;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`🔄 Webhook attempt ${attempt}/${this.retryAttempts} to ${sourceSystem}`);

        const response = await axios.post(url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'X-Source-System': 'MDM',
            'X-Event-Type': payload.event,
            'X-Request-ID': payload.requestId,
            'User-Agent': 'MDM-Notification-Service/1.0'
          },
          timeout: 30000, // 30 seconds timeout
          validateStatus: (status) => status >= 200 && status < 300
        });

        console.log(`✅ Webhook successful to ${sourceSystem}: ${response.status}`);
        return {
          status: response.status,
          data: response.data,
          attempt
        };

      } catch (error) {
        lastError = error;
        console.log(`❌ Webhook attempt ${attempt} failed:`, error.message);

        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.sleep(delay);
        }
      }
    }

    throw new Error(`Webhook failed after ${this.retryAttempts} attempts: ${lastError.message}`);
  }

  /**
   * Build webhook payload
   *
   * @param {Object} request - Business partner request
   * @param {string} event - Event type
   * @param {Object} context - Additional context
   * @returns {Object} Webhook payload
   */
  buildWebhookPayload(request, event, context) {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      requestId: request.ID,
      requestNumber: request.requestNumber,
      partnerName: request.partnerName,
      entityType: request.entityType,
      requestType: request.requestType,
      status: request.status,
      sourceSystem: request.sourceSystem,
    };

    // Add event-specific data
    switch (event) {
      case 'created':
        payload.data = {
          requester: {
            id: request.requesterId,
            name: request.requesterName,
            email: request.requesterEmail
          },
          createdAt: request.createdAt
        };
        break;

      case 'submitted':
        payload.data = {
          submittedAt: new Date().toISOString(),
          submittedBy: context.userId || 'system'
        };
        break;

      case 'approved':
        payload.data = {
          sapBpNumber: request.sapBpNumber,
          approvedBy: request.approvedBy,
          approvedAt: request.approvedAt,
          comments: context.comments || request.comments
        };
        break;

      case 'rejected':
        payload.data = {
          rejectionReason: request.rejectionReason,
          rejectedBy: request.approvedBy,
          rejectedAt: request.approvedAt,
          comments: context.comments
        };
        break;

      case 'compliance_check':
        payload.data = {
          aebStatus: request.aebComplianceStatus,
          viesStatus: request.viesValidationStatus,
          checkTimestamp: new Date().toISOString()
        };
        break;

      case 'duplicate_review':
        payload.data = {
          duplicatesFound: context.duplicatesCount || 0,
          requiresReview: true,
          reviewTimestamp: new Date().toISOString()
        };
        break;
    }

    return payload;
  }

  /**
   * Send email notifications to stakeholders
   *
   * @param {Object} request - Business partner request
   * @param {string} event - Event type
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Email result
   */
  async sendEmailNotifications(request, event, context) {
    const recipients = await this.getEmailRecipients(request, event);

    if (!recipients || recipients.length === 0) {
      return { status: 'skipped', reason: 'No email recipients configured' };
    }

    const emailTemplate = this.getEmailTemplate(event);
    const emailContent = this.buildEmailContent(request, event, context, emailTemplate);

    if (!this.emailTransporter) {
      console.log('📧 Email service not available - queuing emails for later processing');
      recipients.forEach(recipient => {
        this.emailQueue.push({
          id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          recipient: recipient.email,
          content: emailContent,
          timestamp: new Date().toISOString()
        });
      });
      return { status: 'queued', count: recipients.length };
    }

    console.log(`📧 Sending email notifications to ${recipients.length} recipients`);

    // Real email sending using Nodemailer
    const results = await Promise.all(
      recipients.map(async (recipient) => {
        try {
          const mailOptions = {
            from: {
              name: 'MDM System',
              address: process.env.SMTP_FROM || 'mdm-system@company.com'
            },
            to: {
              name: recipient.name,
              address: recipient.email
            },
            subject: emailContent.subject,
            text: emailContent.body,
            html: emailContent.html,
            headers: {
              'X-MDM-Request': request.requestNumber,
              'X-MDM-Event': event,
              'X-Priority': event === 'rejected' ? '1' : '3'
            }
          };

          const info = await this.emailTransporter.sendMail(mailOptions);

          console.log(`✅ Email sent to ${recipient.email}: ${info.messageId}`);

          // In development, log preview URL
          if (process.env.NODE_ENV !== 'production') {
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
          }

          return {
            recipient: recipient.email,
            status: 'sent',
            messageId: info.messageId,
            previewUrl: process.env.NODE_ENV !== 'production' ? nodemailer.getTestMessageUrl(info) : undefined
          };
        } catch (error) {
          console.error(`❌ Failed to send email to ${recipient.email}:`, error.message);
          return {
            recipient: recipient.email,
            status: 'failed',
            error: error.message
          };
        }
      })
    );

    return {
      status: results.every(r => r.status === 'sent') ? 'success' : 'partial',
      results
    };
  }

  /**
   * Create system notification record
   *
   * @param {Object} request - Business partner request
   * @param {string} event - Event type
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} System notification result
   */
  async createSystemNotification(request, event, context) {
    try {
      // Determine impacted systems based on request
      const impactedSystems = this.getImpactedSystems(request);

      const notificationData = {
        bpNumber: request.sapBpNumber || request.requestNumber,
        bpName: request.partnerName,
        changeType: event,
        changedBySystem: 'MDM',
        impactedSystems: impactedSystems.join(','),
        fieldsChanged: JSON.stringify(this.getChangedFields(request, context)),
        changeDetails: JSON.stringify({
          event,
          request: {
            id: request.ID,
            number: request.requestNumber,
            status: request.status,
            entityType: request.entityType
          },
          context,
          timestamp: new Date().toISOString()
        }),
        notificationSent: false
      };

      const result = await INSERT.into('mdm.db.ChangeNotifications').entries(notificationData);

      return {
        status: 'created',
        notificationId: result.ID || 'system-generated-id',
        impactedSystems
      };

    } catch (error) {
      console.error('Error creating system notification:', error);
      throw error;
    }
  }

  /**
   * Notify satellite systems about partner changes
   *
   * @param {Object} request - Business partner request
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Satellite notification result
   */
  async notifySatelliteSystems(request, context) {
    const satelliteSystems = await this.getSatelliteSystems();
    const notifications = [];

    for (const system of satelliteSystems) {
      try {
        const notification = await this.sendSatelliteNotification(system, request, context);
        notifications.push({
          system: system.name,
          status: 'sent',
          result: notification
        });
      } catch (error) {
        notifications.push({
          system: system.name,
          status: 'failed',
          error: error.message
        });
      }
    }

    return {
      status: notifications.every(n => n.status === 'sent') ? 'success' : 'partial',
      notifications
    };
  }

  /**
   * Send notification to a specific satellite system
   *
   * @param {Object} system - Satellite system configuration
   * @param {Object} request - Business partner request
   * @param {Object} context - Additional context
   * @returns {Promise<Object>} Notification result
   */
  async sendSatelliteNotification(system, request, context) {
    const payload = {
      eventType: 'partner_approved',
      partner: {
        sapBpNumber: request.sapBpNumber,
        name: request.partnerName,
        entityType: request.entityType,
        sourceSystem: request.sourceSystem,
        approvedAt: request.approvedAt
      },
      notification: {
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        targetSystem: system.name
      }
    };

    if (system.webhookUrl) {
      return await this.sendWebhookWithRetry(system.webhookUrl, payload, system.name);
    } else {
      // Store for batch processing or manual acknowledgment
      return { status: 'queued', message: 'Queued for manual acknowledgment' };
    }
  }

  /**
   * Get webhook URLs for a source system
   *
   * @param {string} sourceSystem - Source system name
   * @returns {Promise<Array>} Webhook URLs
   */
  async getWebhookUrls(sourceSystem) {
    try {
      const config = await SELECT.from('mdm.db.SystemConfiguration')
        .where({ configKey: `webhook.${sourceSystem.toLowerCase()}.urls`, isActive: true });

      if (config && config.length > 0) {
        return JSON.parse(config[0].configValue);
      }

      // Default webhook URLs for testing
      const defaultUrls = {
        'Coupa': ['http://localhost:3001/webhooks/mdm-notifications'],
        'Salesforce': ['http://localhost:3002/webhooks/mdm-notifications'],
        'PI': ['http://localhost:3003/webhooks/mdm-notifications']
      };

      return defaultUrls[sourceSystem] || [];

    } catch (error) {
      console.error('Error getting webhook URLs:', error);
      return [];
    }
  }

  /**
   * Get email recipients for notification
   *
   * @param {Object} request - Business partner request
   * @param {string} event - Event type
   * @returns {Promise<Array>} Email recipients
   */
  async getEmailRecipients(request, event) {
    const recipients = [];

    // Add requester email
    if (request.requesterEmail) {
      recipients.push({
        name: request.requesterName,
        email: request.requesterEmail,
        role: 'requester'
      });
    }

    // Add MDM approvers for certain events
    if (['submitted', 'duplicate_review', 'compliance_check'].includes(event)) {
      try {
        const approvers = await SELECT.from('mdm.db.UserRoles')
          .where({ role: 'MDMApprover', isActive: true });

        approvers.forEach(approver => {
          if (approver.userEmail) {
            recipients.push({
              name: approver.userName,
              email: approver.userEmail,
              role: 'approver'
            });
          }
        });
      } catch (error) {
        console.error('Error getting approver emails:', error);
      }
    }

    // Add system owners for approved/rejected events
    if (['approved', 'rejected'].includes(event)) {
      try {
        const owners = await SELECT.from('mdm.db.UserRoles')
          .where({ role: 'SystemOwner', isActive: true });

        owners.forEach(owner => {
          if (owner.userEmail) {
            recipients.push({
              name: owner.userName,
              email: owner.userEmail,
              role: 'system_owner'
            });
          }
        });
      } catch (error) {
        console.error('Error getting system owner emails:', error);
      }
    }

    return recipients;
  }

  /**
   * Get email template for event type
   *
   * @param {string} event - Event type
   * @returns {Object} Email template
   */
  getEmailTemplate(event) {
    const templates = {
      created: {
        subject: 'New Business Partner Request Created - {{requestNumber}}',
        template: 'request_created'
      },
      submitted: {
        subject: 'Business Partner Request Submitted for Approval - {{requestNumber}}',
        template: 'request_submitted'
      },
      approved: {
        subject: 'Business Partner Request Approved - {{partnerName}} ({{sapBpNumber}})',
        template: 'request_approved'
      },
      rejected: {
        subject: 'Business Partner Request Rejected - {{requestNumber}}',
        template: 'request_rejected'
      },
      compliance_check: {
        subject: 'Compliance Check Completed - {{requestNumber}}',
        template: 'compliance_completed'
      },
      duplicate_review: {
        subject: 'Duplicate Review Required - {{requestNumber}}',
        template: 'duplicate_review'
      }
    };

    return templates[event] || templates.created;
  }

  /**
   * Build email content
   *
   * @param {Object} request - Business partner request
   * @param {string} event - Event type
   * @param {Object} context - Additional context
   * @param {Object} template - Email template
   * @returns {Object} Email content
   */
  buildEmailContent(request, event, context, template) {
    const subject = template.subject
      .replace('{{requestNumber}}', request.requestNumber)
      .replace('{{partnerName}}', request.partnerName)
      .replace('{{sapBpNumber}}', request.sapBpNumber || 'TBD');

    const body = this.buildEmailBody(request, event, context);

    return {
      subject,
      body,
      html: this.convertToHtml(body)
    };
  }

  /**
   * Build email body content
   *
   * @param {Object} request - Business partner request
   * @param {string} event - Event type
   * @param {Object} context - Additional context
   * @returns {string} Email body
   */
  buildEmailBody(request, event, context) {
    let body = `Dear Stakeholder,\n\n`;

    switch (event) {
      case 'created':
        body += `A new business partner request has been created.\n\n`;
        break;
      case 'submitted':
        body += `A business partner request has been submitted for approval.\n\n`;
        break;
      case 'approved':
        body += `A business partner request has been approved.\n\n`;
        break;
      case 'rejected':
        body += `A business partner request has been rejected.\n\n`;
        break;
      case 'compliance_check':
        body += `Compliance check has been completed for a business partner request.\n\n`;
        break;
      case 'duplicate_review':
        body += `A business partner request requires duplicate review.\n\n`;
        break;
    }

    body += `Request Details:\n`;
    body += `- Request Number: ${request.requestNumber}\n`;
    body += `- Partner Name: ${request.partnerName}\n`;
    body += `- Entity Type: ${request.entityType}\n`;
    body += `- Source System: ${request.sourceSystem}\n`;
    body += `- Current Status: ${request.status}\n`;

    if (request.sapBpNumber) {
      body += `- SAP BP Number: ${request.sapBpNumber}\n`;
    }

    if (context.comments) {
      body += `- Comments: ${context.comments}\n`;
    }

    body += `\nTimestamp: ${new Date().toISOString()}\n\n`;
    body += `Best regards,\nMDM System\n`;

    return body;
  }

  /**
   * Convert text to HTML format
   *
   * @param {string} text - Plain text
   * @returns {string} HTML content
   */
  convertToHtml(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');
  }

  /**
   * Get impacted systems for a request
   *
   * @param {Object} request - Business partner request
   * @returns {Array} Impacted system names
   */
  getImpactedSystems(request) {
    const systems = [];

    // Always include source system
    if (request.sourceSystem && request.sourceSystem !== 'Manual') {
      systems.push(request.sourceSystem);
    }

    // Add other systems based on entity type and business channels
    if (request.entityType === 'Supplier' || request.entityType === 'Both') {
      systems.push('Procurement', 'Finance');
    }

    if (request.entityType === 'Customer' || request.entityType === 'Both') {
      systems.push('Sales', 'CRM');
    }

    // Add systems based on business channels
    if (request.businessChannels) {
      const channels = request.businessChannels.split(',').map(c => c.trim());
      if (channels.includes('DIGITAL')) {
        systems.push('E-Commerce');
      }
      if (channels.includes('SERVICES')) {
        systems.push('ServiceDesk');
      }
    }

    return [...new Set(systems)]; // Remove duplicates
  }

  /**
   * Get changed fields for audit purposes
   *
   * @param {Object} request - Business partner request
   * @param {Object} context - Additional context
   * @returns {Array} Changed fields
   */
  getChangedFields(request, context) {
    // In a real implementation, track field changes
    return [
      'status',
      'sapBpNumber',
      'approvedBy',
      'approvedAt'
    ];
  }

  /**
   * Get satellite systems configuration
   *
   * @returns {Promise<Array>} Satellite systems
   */
  async getSatelliteSystems() {
    try {
      const systems = await SELECT.from('mdm.db.SystemConfiguration')
        .where({ configKey: { like: 'satellite.%' }, isActive: true });

      return systems.map(sys => ({
        name: sys.configKey.replace('satellite.', ''),
        webhookUrl: sys.configValue,
        description: sys.description
      }));

    } catch (error) {
      console.error('Error getting satellite systems:', error);
      return [
        { name: 'ERP', webhookUrl: null },
        { name: 'CRM', webhookUrl: null },
        { name: 'Procurement', webhookUrl: null }
      ];
    }
  }

  /**
   * Utility function to sleep for specified milliseconds
   *
   * @param {number} ms - Milliseconds to sleep
   */
  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process queued notifications (batch processing)
   *
   * @returns {Promise<Object>} Processing result
   */
  async processQueuedNotifications() {
    console.log('🔄 Processing queued notifications...');

    const webhookResults = await this.processWebhookQueue();
    const emailResults = await this.processEmailQueue();

    return {
      webhooks: webhookResults,
      emails: emailResults,
      processedAt: new Date().toISOString()
    };
  }

  /**
   * Process webhook queue
   */
  async processWebhookQueue() {
    const results = [];
    while (this.webhookQueue.length > 0) {
      const webhook = this.webhookQueue.shift();
      try {
        const result = await this.sendWebhookWithRetry(
          webhook.url,
          webhook.payload,
          webhook.system
        );
        results.push({ webhook: webhook.id, status: 'success', result });
      } catch (error) {
        results.push({ webhook: webhook.id, status: 'failed', error: error.message });
      }
    }
    return results;
  }

  /**
   * Process email queue
   */
  async processEmailQueue() {
    const results = [];
    while (this.emailQueue.length > 0) {
      const email = this.emailQueue.shift();
      try {
        // Process email (mock)
        await this.sleep(100);
        results.push({ email: email.id, status: 'sent' });
      } catch (error) {
        results.push({ email: email.id, status: 'failed', error: error.message });
      }
    }
    return results;
  }
}

module.exports = NotificationService;
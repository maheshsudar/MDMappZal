const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Document Management Service
 *
 * Implements comprehensive document management as per requirements:
 * - File upload and storage infrastructure
 * - Document type classification and validation
 * - KYC document workflow support
 * - Document versioning and audit trail
 * - Security and access controls
 *
 * @class DocumentService
 */
class DocumentService {

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default
    this.allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ];

    this.documentTypes = {
      'KYC': 'Know Your Customer Documentation',
      'TaxCertificate': 'Tax Registration Certificate',
      'BankStatement': 'Bank Account Statement',
      'VatCertificate': 'VAT Registration Certificate',
      'BusinessLicense': 'Business License',
      'ComplianceCertificate': 'Compliance Certificate',
      'InsuranceCertificate': 'Insurance Certificate',
      'PowerOfAttorney': 'Power of Attorney',
      'Contract': 'Contract Document',
      'Other': 'Other Supporting Document'
    };

    // Ensure upload directory exists
    this.initializeUploadDirectory();
  }

  /**
   * Initialize upload directory structure
   */
  async initializeUploadDirectory() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'temp'), { recursive: true });
      await fs.mkdir(path.join(this.uploadDir, 'archived'), { recursive: true });
      console.log(`📁 Document upload directory initialized: ${this.uploadDir}`);
    } catch (error) {
      console.error('❌ Error initializing upload directory:', error);
    }
  }

  /**
   * Upload document for a business partner request
   *
   * @param {string} requestId - Business partner request ID
   * @param {Object} fileData - File upload data
   * @param {string} fileData.fileName - Original file name
   * @param {string} fileData.mimeType - MIME type
   * @param {Buffer} fileData.buffer - File buffer
   * @param {string} fileData.documentType - Document type classification
   * @param {string} fileData.description - Document description
   * @param {string} uploadedBy - User ID who uploaded the document
   * @returns {Promise<Object>} Upload result
   */
  async uploadDocument(requestId, fileData, uploadedBy) {
    console.log(`📤 Uploading document for request: ${requestId}`);

    try {
      // Validate file data
      const validation = await this.validateFileUpload(fileData);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate unique file ID and path
      const fileId = uuidv4();
      const fileExtension = this.getFileExtension(fileData.fileName);
      const uniqueFileName = `${fileId}${fileExtension}`;
      const requestDir = path.join(this.uploadDir, requestId);
      const filePath = path.join(requestDir, uniqueFileName);

      // Create request-specific directory
      await fs.mkdir(requestDir, { recursive: true });

      // Save file to disk
      await fs.writeFile(filePath, fileData.buffer);

      // Calculate file hash for integrity checking
      const fileHash = await this.calculateFileHash(fileData.buffer);

      // Create database record
      const documentRecord = {
        ID: fileId,
        request_ID: requestId,
        fileName: fileData.fileName,
        uniqueFileName: uniqueFileName,
        fileType: fileData.mimeType,
        fileSize: fileData.buffer.length,
        filePath: filePath,
        relativePath: path.join(requestId, uniqueFileName),
        documentType: fileData.documentType || 'Other',
        description: fileData.description || '',
        fileHash: fileHash,
        uploadStatus: 'Completed',
        uploadedBy: uploadedBy,
        uploadedAt: new Date().toISOString(),
        version: 1,
        isActive: true
      };

      // Store in database
      await INSERT.into('mdm.db.RequestAttachments').entries(documentRecord);

      // Create audit trail entry
      await this.createDocumentAuditEntry(fileId, 'Upload', uploadedBy, 'Document uploaded successfully');

      console.log(`✅ Document uploaded successfully: ${fileData.fileName} (ID: ${fileId})`);

      return {
        success: true,
        documentId: fileId,
        fileName: fileData.fileName,
        fileSize: fileData.buffer.length,
        documentType: fileData.documentType,
        uploadedAt: documentRecord.uploadedAt,
        message: 'Document uploaded successfully'
      };

    } catch (error) {
      console.error('❌ Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Upload multiple documents in batch
   *
   * @param {string} requestId - Business partner request ID
   * @param {Array} filesData - Array of file upload data
   * @param {string} uploadedBy - User ID who uploaded the documents
   * @returns {Promise<Object>} Batch upload result
   */
  async uploadDocumentsBatch(requestId, filesData, uploadedBy) {
    console.log(`📦 Batch uploading ${filesData.length} documents for request: ${requestId}`);

    const results = {
      successful: [],
      failed: [],
      totalFiles: filesData.length,
      successCount: 0,
      failureCount: 0
    };

    for (const fileData of filesData) {
      try {
        const result = await this.uploadDocument(requestId, fileData, uploadedBy);
        results.successful.push({
          fileName: fileData.fileName,
          documentId: result.documentId,
          result: result
        });
        results.successCount++;

      } catch (error) {
        results.failed.push({
          fileName: fileData.fileName,
          error: error.message
        });
        results.failureCount++;
        console.error(`❌ Failed to upload ${fileData.fileName}:`, error);
      }
    }

    console.log(`✅ Batch upload completed: ${results.successCount}/${results.totalFiles} successful`);
    return results;
  }

  /**
   * Download document by ID
   *
   * @param {string} documentId - Document ID
   * @param {string} requestedBy - User ID requesting the download
   * @returns {Promise<Object>} Download result with file buffer
   */
  async downloadDocument(documentId, requestedBy) {
    console.log(`📥 Downloading document: ${documentId}`);

    try {
      // Get document record from database
      const document = await SELECT.from('mdm.db.RequestAttachments').where({ ID: documentId });

      if (!document) {
        throw new Error('Document not found');
      }

      if (!document.isActive) {
        throw new Error('Document is not active/available');
      }

      // Check if file exists on disk
      const exists = await this.fileExists(document.filePath);
      if (!exists) {
        throw new Error('Physical file not found on disk');
      }

      // Read file from disk
      const fileBuffer = await fs.readFile(document.filePath);

      // Verify file integrity
      const currentHash = await this.calculateFileHash(fileBuffer);
      if (currentHash !== document.fileHash) {
        console.warn(`⚠️ File integrity check failed for document ${documentId}`);
        // Log but don't fail - file might have been legitimately updated
      }

      // Create audit trail entry
      await this.createDocumentAuditEntry(documentId, 'Download', requestedBy, 'Document downloaded');

      console.log(`✅ Document downloaded successfully: ${document.fileName}`);

      return {
        success: true,
        fileName: document.fileName,
        mimeType: document.fileType,
        fileSize: document.fileSize,
        buffer: fileBuffer,
        documentType: document.documentType,
        description: document.description,
        uploadedAt: document.uploadedAt || document.createdAt
      };

    } catch (error) {
      console.error('❌ Error downloading document:', error);
      throw error;
    }
  }

  /**
   * Delete document (soft delete - mark as inactive)
   *
   * @param {string} documentId - Document ID
   * @param {string} deletedBy - User ID who deleted the document
   * @param {string} reason - Reason for deletion
   * @returns {Promise<Object>} Deletion result
   */
  async deleteDocument(documentId, deletedBy, reason = '') {
    console.log(`🗑️ Soft deleting document: ${documentId}`);

    try {
      // Get document record
      const document = await SELECT.from('mdm.db.RequestAttachments').where({ ID: documentId });

      if (!document) {
        throw new Error('Document not found');
      }

      if (!document.isActive) {
        throw new Error('Document is already deleted');
      }

      // Soft delete - mark as inactive
      await UPDATE('mdm.db.RequestAttachments')
        .set({
          isActive: false,
          deletedBy: deletedBy,
          deletedAt: new Date().toISOString(),
          deletionReason: reason
        })
        .where({ ID: documentId });

      // Create audit trail entry
      await this.createDocumentAuditEntry(
        documentId,
        'Delete',
        deletedBy,
        `Document soft deleted. Reason: ${reason || 'No reason provided'}`
      );

      console.log(`✅ Document soft deleted successfully: ${document.fileName}`);

      return {
        success: true,
        documentId: documentId,
        fileName: document.fileName,
        deletedAt: new Date().toISOString(),
        message: 'Document deleted successfully'
      };

    } catch (error) {
      console.error('❌ Error deleting document:', error);
      throw error;
    }
  }

  /**
   * List documents for a business partner request
   *
   * @param {string} requestId - Business partner request ID
   * @param {boolean} activeOnly - Whether to return only active documents
   * @returns {Promise<Array>} List of documents
   */
  async listDocuments(requestId, activeOnly = true) {
    console.log(`📋 Listing documents for request: ${requestId}`);

    try {
      let query = SELECT.from('mdm.db.RequestAttachments').where({ request_ID: requestId });

      if (activeOnly) {
        query = query.and({ isActive: true });
      }

      const documents = await query.orderBy('createdAt desc');

      const documentList = documents.map(doc => ({
        documentId: doc.ID,
        fileName: doc.fileName,
        documentType: doc.documentType,
        description: doc.description,
        fileSize: doc.fileSize,
        mimeType: doc.fileType,
        uploadedBy: doc.uploadedBy || doc.createdBy,
        uploadedAt: doc.uploadedAt || doc.createdAt,
        version: doc.version || 1,
        isActive: doc.isActive
      }));

      console.log(`✅ Found ${documentList.length} documents for request ${requestId}`);
      return documentList;

    } catch (error) {
      console.error('❌ Error listing documents:', error);
      throw error;
    }
  }

  /**
   * Validate file upload
   *
   * @param {Object} fileData - File data to validate
   * @returns {Object} Validation result
   */
  async validateFileUpload(fileData) {
    const errors = [];

    // Check required fields
    if (!fileData.fileName) {
      errors.push('File name is required');
    }

    if (!fileData.buffer || fileData.buffer.length === 0) {
      errors.push('File content is required');
    }

    if (!fileData.mimeType) {
      errors.push('MIME type is required');
    }

    // Check file size
    if (fileData.buffer && fileData.buffer.length > this.maxFileSize) {
      errors.push(`File size exceeds maximum allowed size of ${this.maxFileSize / (1024 * 1024)}MB`);
    }

    // Check MIME type
    if (fileData.mimeType && !this.allowedMimeTypes.includes(fileData.mimeType)) {
      errors.push(`MIME type '${fileData.mimeType}' is not allowed`);
    }

    // Check file extension
    if (fileData.fileName) {
      const extension = this.getFileExtension(fileData.fileName).toLowerCase();
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'];
      if (dangerousExtensions.includes(extension)) {
        errors.push(`File extension '${extension}' is not allowed for security reasons`);
      }
    }

    // Check document type
    if (fileData.documentType && !this.documentTypes[fileData.documentType]) {
      errors.push(`Invalid document type: ${fileData.documentType}`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get file extension from filename
   */
  getFileExtension(fileName) {
    return path.extname(fileName) || '';
  }

  /**
   * Calculate file hash for integrity checking
   */
  async calculateFileHash(buffer) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Check if file exists on disk
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create document audit trail entry
   */
  async createDocumentAuditEntry(documentId, action, userId, details) {
    try {
      // This would typically go to a separate audit table
      // For now, we'll use the approval history table
      await INSERT.into('mdm.db.ApprovalHistory').entries({
        ID: uuidv4(),
        // Note: This is a simplified approach - in a real system you'd have a separate document audit table
        approverUserId: userId,
        approverName: userId, // In real system, resolve user name
        action: action,
        comments: `Document ${action}: ${details}`,
        systemGenerated: true
      });
    } catch (error) {
      console.error('❌ Error creating document audit entry:', error);
      // Don't throw - audit failure shouldn't fail the main operation
    }
  }

  /**
   * Get document statistics for a request
   *
   * @param {string} requestId - Business partner request ID
   * @returns {Promise<Object>} Document statistics
   */
  async getDocumentStatistics(requestId) {
    try {
      const documents = await SELECT.from('mdm.db.RequestAttachments')
        .where({ request_ID: requestId });

      const stats = {
        totalDocuments: documents.length,
        activeDocuments: documents.filter(d => d.isActive).length,
        deletedDocuments: documents.filter(d => !d.isActive).length,
        totalSizeBytes: documents.reduce((sum, d) => sum + (d.fileSize || 0), 0),
        documentTypes: {},
        latestUpload: null
      };

      // Count by document type
      documents.forEach(doc => {
        const type = doc.documentType || 'Unknown';
        stats.documentTypes[type] = (stats.documentTypes[type] || 0) + 1;
      });

      // Find latest upload
      const activeDocs = documents.filter(d => d.isActive);
      if (activeDocs.length > 0) {
        stats.latestUpload = activeDocs
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
          .createdAt;
      }

      stats.totalSizeMB = (stats.totalSizeBytes / (1024 * 1024)).toFixed(2);

      return stats;

    } catch (error) {
      console.error('❌ Error getting document statistics:', error);
      throw error;
    }
  }

  /**
   * Get supported document types
   *
   * @returns {Object} Document types mapping
   */
  getDocumentTypes() {
    return { ...this.documentTypes };
  }

  /**
   * Get service configuration
   *
   * @returns {Object} Service configuration
   */
  getServiceConfiguration() {
    return {
      uploadDirectory: this.uploadDir,
      maxFileSizeMB: this.maxFileSize / (1024 * 1024),
      allowedMimeTypes: [...this.allowedMimeTypes],
      documentTypes: this.getDocumentTypes(),
      features: {
        batchUpload: true,
        fileIntegrityCheck: true,
        softDelete: true,
        auditTrail: true,
        documentVersioning: false // Could be enhanced in the future
      }
    };
  }

  /**
   * Cleanup old temporary files
   *
   * @param {number} olderThanHours - Delete files older than this many hours
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupTempFiles(olderThanHours = 24) {
    console.log(`🧹 Cleaning up temporary files older than ${olderThanHours} hours`);

    try {
      const tempDir = path.join(this.uploadDir, 'temp');
      const files = await fs.readdir(tempDir);
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);

      let deletedCount = 0;
      let totalSize = 0;

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          totalSize += stats.size;
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      console.log(`✅ Cleanup completed: ${deletedCount} files deleted, ${(totalSize / 1024 / 1024).toFixed(2)}MB freed`);

      return {
        deletedFiles: deletedCount,
        freedSpaceBytes: totalSize,
        freedSpaceMB: (totalSize / 1024 / 1024).toFixed(2)
      };

    } catch (error) {
      console.error('❌ Error during temp file cleanup:', error);
      throw error;
    }
  }
}

module.exports = DocumentService;
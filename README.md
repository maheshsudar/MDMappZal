# Enhanced MDM Business Partner Approval Application

A comprehensive, enterprise-grade Master Data Management (MDM) Business Partner Approval Application built on **SAP Cloud Application Programming Model (CAP)** with advanced security, error handling, validation, caching, and notification capabilities.

## 🎯 Overview

This application implements a production-ready MDM approval workflow following CAP best practices, featuring:

### 🚀 **Latest Enterprise Enhancements** ✨

- **🔐 Enterprise Security**: Role-based access control with `@requires` and `@restrict` annotations across all entities and actions
- **🛡️ Advanced Error Handling**: Structured error responses with correlation IDs and production-safe sanitization
- **🔍 Comprehensive Input Validation**: XSS/SQL injection prevention with country-specific format validation
- **⚡ Performance Optimization**: Multi-tier caching with TTL and intelligent invalidation strategies
- **📬 Notification System**: Multi-channel notifications with webhook callbacks and retry logic

### Core Business Features

- **Multi-entity Support**: Handle suppliers, customers, and mixed business partners
- **Enhanced Compliance Integration**: Advanced AEB Trade Compliance and VIES VAT validation with comprehensive screening
- **Intelligent Approval Workflows**: Multi-level approval with role-based access and automated decision support
- **Advanced Duplicate Detection**: 95% fuzzy matching, established VAT ID checking, and merge compatibility analysis
- **Comprehensive Document Management**: Secure file upload, batch processing, and KYC workflow integration
- **Complete Audit Trail**: Enhanced approval history with system-generated insights and decision tracking

## 🏗️ Architecture

### Enhanced Service Layer ✨ **NEW**

#### Core Services
- **MDM Service** (`srv/mdm-service.cds`) - Main OData service with comprehensive role-based security
- **Integration API** (`srv/integration-api.js`) - REST endpoints for external systems with API key authentication

#### Enterprise Utility Services ✨ **NEW**
- **Error Handler** (`srv/lib/error-handler.js`) - Structured error management with correlation tracking
- **Input Validator** (`srv/lib/input-validator.js`) - Comprehensive validation & sanitization with security checks
- **Notification Service** (`srv/lib/notification-service.js`) - Multi-channel notifications with webhook callbacks
- **Cache Service** (`srv/lib/cache-service.js`) - Performance optimization with TTL and LRU eviction
- **Enhanced Duplicate Service** (`srv/lib/enhanced-duplicate-service.js`) - Advanced duplicate detection
- **AEB Service** (`srv/lib/aeb-service.js`) - Trade compliance integration with caching
- **VIES Service** (`srv/lib/vies-service.js`) - VAT validation service with 24-hour caching
- **Document Service** (`srv/lib/document-service.js`) - Secure document management

### Core Business Components

1. **Enhanced MDM Approval App** - Main Fiori application with advanced duplicate detection and compliance integration
2. **Enhanced Duplicate Detection Engine** - Sophisticated fuzzy matching and VAT ID analysis
3. **Advanced Compliance Services** - Comprehensive AEB Trade Compliance and VIES VAT validation
4. **Document Management System** - Secure file upload, validation, and KYC workflow support
5. **Satellite System Notification App** - Change notifications for system owners
6. **Request Creation Interface** - Business user request submission with enhanced validation

### Technology Stack

- **Backend**: SAP CAP with Node.js runtime
- **Database**: SQLite (development) / PostgreSQL/HANA (production)
- **Frontend**: SAP Fiori Elements with UI5 1.108.x
- **API**: OData v4 services with REST integration layer
- **Authentication**: Mock (development) / XSUAA (production)
- **External Services**: AEB Trade Compliance, EU VIES VAT validation

## 📋 Features

### Business Partner Management
- Create, update, and manage business partner requests
- Support for multiple addresses, emails, bank accounts, and VAT IDs
- Flexible partner roles (Supplier, Customer, Both)
- Business channel categorization

### Compliance & Validation
- **AEB Trade Compliance**: Sanctions screening and export control checks
- **VIES Integration**: Real-time VAT ID validation for EU countries
- **KYC Workflow**: Know Your Customer documentation and tracking
- **Periodic Reviews**: Automated compliance re-screening

### Workflow Management
- Draft → Submitted → Compliance Check → Approved/Rejected flow
- Role-based approvals with configurable workflows
- Parallel and sequential approval steps
- Escalation and timeout handling

### Enhanced Data Quality ✨ **UPGRADED**
- **Advanced Duplicate Detection**: 95% fuzzy matching with established VAT ID checking
- **Intelligent Merge Recommendations**: Multi-factor compatibility analysis
- **Comprehensive VAT Validation**: 27 EU countries with format validation and caching
- **Enhanced Address Validation**: Established address tracking for VAT ID correlation
- **Email Format Validation**: Enhanced with type classification and notes
- **Bank Account Verification**: IBAN/SWIFT validation with country-specific rules

### Integration Capabilities
- RESTful APIs for external system integration
- Support for Coupa, Salesforce, and PI system integration
- Asynchronous message processing
- Change notification system

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm 8+
- SQLite3
- @sap/cds-dk (installed globally)

### Installation

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd mdm-approval-app
   npm install
   ```

2. **Deploy using the deployment script**:
   ```bash
   chmod +x scripts/deploy.sh
   ./scripts/deploy.sh
   ```

3. **Or manual deployment**:
   ```bash
   # Build the application
   cds build

   # Deploy database
   cds deploy --to sqlite:db/mdm.db

   # Load initial data
   sqlite3 db/mdm.db < db/init.sql

   # Start the application
   npm start
   ```

### Accessing the Application

- **Health Check**: http://localhost:4004/health
- **Service Document**: http://localhost:4004/mdm/
- **Fiori Launchpad**: http://localhost:4004/webapp/index.html
- **OData Metadata**: http://localhost:4004/mdm/$metadata

### Default Users

The application comes with pre-configured mock users:

| Username | Password | Role | Access |
|----------|----------|------|--------|
| alice | secret | MDMApprover | Full approval rights |
| bob | secret | SystemOwner | Coupa system notifications |
| carol | secret | BusinessUser | Create requests |

## 📖 User Guide

### For MDM Approvers

1. **Access Pending Requests**:
   - Navigate to MDM Approval app
   - Review pending requests in the worklist
   - Filter by status, source system, or date

2. **Review Request Details**:
   - Click on a request to view full details
   - Review basic information, addresses, contacts, and bank details
   - Check compliance status and duplicate warnings

3. **Perform Compliance Checks**:
   - Click "Run Compliance Check" to validate against AEB and VIES
   - Review screening results and risk assessments
   - Document any manual KYC findings

4. **Make Approval Decisions**:
   - **Approve**: Creates SAP business partner and notifies source systems
   - **Approve with Merge**: Merges data with existing partner
   - **Reject**: Provides rejection reason and stops workflow

### For Business Users

1. **Create New Requests**:
   - Access request creation form
   - Fill in partner basic information
   - Add addresses, contacts, and bank details
   - Specify VAT IDs and payment terms
   - Submit for approval

2. **Track Request Status**:
   - Monitor request progress in "My Requests" view
   - Receive notifications for status changes
   - Provide additional information if requested

### For System Owners

1. **Receive Change Notifications**:
   - Get alerts when shared partners are modified
   - Review before/after comparison of changes
   - Acknowledge notifications to confirm awareness

## 🔧 Configuration

### Database Configuration

Edit `package.json` to configure database settings:

```json
{
  "cds": {
    "requires": {
      "db": {
        "kind": "sqlite",
        "credentials": {
          "url": "db/mdm.db"
        }
      }
    }
  }
}
```

### Authentication

For production, configure proper authentication:

```json
{
  "cds": {
    "requires": {
      "auth": {
        "kind": "xsuaa",
        "credentials": {
          "xsappname": "mdm-approval",
          "clientid": "your-client-id",
          "clientsecret": "your-client-secret"
        }
      }
    }
  }
}
```

### Enhanced Compliance Services ✨ **UPGRADED**

Set environment variables for external service integration:

```bash
# Enhanced VIES Configuration
VIES_API_ENDPOINT=http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl
VIES_ENABLED=true  # Set to false to use mock service

# Enhanced AEB Configuration
AEB_API_URL=https://api.aeb.com/compliance
AEB_API_KEY=your-aeb-api-key
AEB_CLIENT_ID=your-client-id

# Document Management Configuration
UPLOAD_DIR=./uploads  # Document storage directory
MAX_FILE_SIZE=10485760  # 10MB default file size limit

# Service Configuration
NODE_ENV=development  # Set to 'production' for real services
```

### Enhanced Service Features

#### Advanced Duplicate Detection
- **Fuzzy Matching**: 95% similarity threshold with name normalization
- **VAT ID Checking**: Established VAT ID duplicate detection
- **Merge Analysis**: Compatibility scoring based on multiple factors
- **Decision Tracking**: Complete audit trail with rationale

#### Comprehensive Compliance Integration
- **AEB Trade Compliance**: Full sanctions, PEPs, export control screening
- **VIES VAT Validation**: Real-time validation with 24-hour caching
- **Risk Assessment**: 0-100 scoring with actionable recommendations
- **Batch Processing**: Intelligent batching for optimal performance

#### Document Management System
- **Secure Upload**: File validation with integrity checking
- **Document Types**: 10 predefined types including KYC documents
- **Batch Upload**: Multiple file processing with success/failure tracking
- **Soft Delete**: Audit-compliant document lifecycle management

## 🔌 API Reference

### Key Endpoints

#### Business Partner Requests
- `GET /mdm/BusinessPartnerRequests` - List all requests
- `POST /mdm/BusinessPartnerRequests` - Create new request
- `GET /mdm/BusinessPartnerRequests/{id}` - Get specific request
- `PATCH /mdm/BusinessPartnerRequests/{id}` - Update request

#### Actions
- `POST /mdm/BusinessPartnerRequests/{id}/submitForApproval` - Submit for approval
- `POST /mdm/BusinessPartnerRequests/{id}/performComplianceCheck` - Run compliance checks
- `POST /mdm/BusinessPartnerRequests/{id}/approveRequest` - Approve request
- `POST /mdm/BusinessPartnerRequests/{id}/rejectRequest` - Reject request
- `POST /mdm/BusinessPartnerRequests/{id}/checkDuplicates` - Check for duplicates

#### Example Request Body
```json
{
  "partnerName": "ACME Corporation Ltd",
  "entityType": "Supplier",
  "sourceSystem": "Coupa",
  "partnerRole": "Supplier",
  "businessChannels": "NONMERCH",
  "coupaInternalNo": "COUPA-12345",
  "paymentTerms": "NET30",
  "paymentMethod": "BankTransfer",
  "reconAccount": "2000000",
  "addresses": [
    {
      "addressType": "Main",
      "name1": "ACME Corporation Ltd",
      "street": "Main Street",
      "streetNumber": "123",
      "city": "New York",
      "postalCode": "10001",
      "country_code": "US"
    }
  ],
  "emails": [
    {
      "emailType": "Primary",
      "emailAddress": "contact@acme.com"
    }
  ],
  "vatIds": [
    {
      "country_code": "US",
      "vatNumber": "123456789"
    }
  ]
}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --grep "Business Partner"
```

### Test Data

The application includes comprehensive test data covering:
- Sample business partner requests
- Mock compliance responses
- Test user accounts
- Various approval scenarios

## 🚀 Deployment

### Development Deployment

```bash
./scripts/deploy.sh
```

### Production Deployment

```bash
./scripts/deploy.sh --production --backup
```

This will:
- Create database backup
- Build production artifacts
- Create systemd service (Linux)
- Configure monitoring

### Docker Deployment

```bash
# Build Docker image
docker build -t mdm-approval-app .

# Run container
docker run -p 4004:4004 -v $(pwd)/db:/app/db mdm-approval-app
```

### SAP BTP Deployment

1. **Create `mta.yaml`** for multi-target application
2. **Build MTA archive**: `mbt build`
3. **Deploy to BTP**: `cf deploy mta_archives/mdm-approval-app_1.0.0.mtar`

## 📊 Monitoring & Observability

### Health Checks
- Application health: `GET /health`
- Service status: `GET /mdm/$health`
- Compliance service status: Check logs

### Logging
- Application logs: `logs/app.log`
- Audit logs: `logs/audit.log`
- Error logs: `logs/error.log`

### Metrics
- Request processing times
- Approval success/failure rates
- Compliance check performance
- User activity tracking

## 🔒 Security

### Authentication & Authorization
- Role-based access control (RBAC)
- JWT token validation
- SAP XSUAA integration support

### Data Protection
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- GDPR compliance features

### Audit & Compliance
- Complete audit trail
- Change history tracking
- Compliance screening logs
- Data retention policies

## 🤝 Contributing

### Development Setup

```bash
# Install development dependencies
npm install --include=dev

# Run in development mode
npm run watch

# Run linting
npm run lint

# Format code
npm run format
```

### Code Style
- ESLint configuration included
- Prettier for code formatting
- JSDoc for documentation
- Conventional commits

## 📚 Documentation

### Additional Resources
- [SAP CAP Documentation](https://cap.cloud.sap/docs/)
- [SAP Fiori Elements Guide](https://ui5.sap.com/topic/03265b0408e2432c9571d6b3feb6b1fd)
- [VIES API Documentation](https://ec.europa.eu/taxation_customs/vies/)
- [AEB Trade Compliance](https://www.aeb.com/solutions/trade-compliance/)

### Architecture Diagrams
- Entity Relationship Diagram: `docs/erd.md`
- API Flow Diagrams: `docs/api-flows.md`
- Deployment Architecture: `docs/deployment.md`

## 📞 Support

### Getting Help
- Check application logs: `logs/`
- Review health endpoint: `/health`
- Validate service metadata: `/mdm/$metadata`

### Common Issues
- **Database locked**: Stop application and restart
- **Port conflicts**: Change port in package.json
- **Authentication failures**: Check user configuration
- **Compliance service errors**: Verify external service connectivity

## 🧪 Testing

### Automated Testing
- **Run all tests**: See **[testcases.md](./testcases.md)** for comprehensive test cases
- **95 test scenarios**: Covering functional, API, performance, and security testing
- **Playwright Integration**: Automated testing via sub-agents
- **Continuous Validation**: All documented procedures tested for accuracy

### Manual Testing
- **Test Dashboard**: Available at http://localhost:4004/
- **API Testing**: Use the integrated test buttons for quick API validation
- **User Scenarios**: Test with different user roles (alice, bob, carol)

## 📄 License

This project is licensed under the terms specified in the license file.

---

**Note**: This application is designed as a comprehensive MDM solution following SAP best practices. For production deployment, ensure proper security configuration, backup procedures, and monitoring setup.
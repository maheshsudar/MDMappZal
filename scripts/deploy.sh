#!/bin/bash

# MDM Approval Application Deployment Script
# This script handles the deployment of the SAP CAP application

set -e  # Exit on any error

echo "🚀 Starting MDM Approval Application Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="mdm-approval-app"
NODE_VERSION="18"
CDS_VERSION="7"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check Node.js version
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js version $NODE_VERSION or higher."
        exit 1
    fi

    NODE_CURRENT=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_CURRENT" -lt "$NODE_VERSION" ]; then
        log_error "Node.js version $NODE_VERSION or higher is required. Current version: $(node -v)"
        exit 1
    fi

    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm."
        exit 1
    fi

    # Check if @sap/cds-dk is installed globally
    if ! npm list -g @sap/cds-dk &> /dev/null; then
        log_warning "@sap/cds-dk is not installed globally. Installing..."
        npm install -g @sap/cds-dk
    fi

    log_success "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing project dependencies..."

    npm install

    if [ $? -eq 0 ]; then
        log_success "Dependencies installed successfully"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
}

# Build the application
build_application() {
    log_info "Building the application..."

    # Clean previous builds
    rm -rf gen/

    # Build CDS models
    cds build --production

    if [ $? -eq 0 ]; then
        log_success "Application built successfully"
    else
        log_error "Build failed"
        exit 1
    fi
}

# Initialize database
initialize_database() {
    log_info "Initializing database..."

    # Deploy database schema
    cds deploy --to sqlite:db/mdm.db

    # Load initial data
    if [ -f "db/init.sql" ]; then
        log_info "Loading initial data..."
        sqlite3 db/mdm.db < db/init.sql
        log_success "Initial data loaded"
    fi

    log_success "Database initialized"
}

# Start services
start_services() {
    log_info "Starting MDM Approval Application..."

    # Check if port 4004 is available
    if lsof -Pi :4004 -sTCP:LISTEN -t >/dev/null ; then
        log_warning "Port 4004 is already in use. Stopping existing process..."
        pkill -f "cds serve"
        sleep 2
    fi

    # Start the application
    npm start &
    APP_PID=$!

    # Wait for application to start
    log_info "Waiting for application to start..."
    sleep 5

    # Check if application is running
    if curl -s http://localhost:4004/health > /dev/null; then
        log_success "MDM Approval Application is running!"
        log_info "Application URLs:"
        echo "  🌐 Health Check: http://localhost:4004/health"
        echo "  📊 Service Document: http://localhost:4004/mdm/"
        echo "  💼 Fiori App: http://localhost:4004/webapp/index.html"
        echo "  🔍 OData Metadata: http://localhost:4004/mdm/\$metadata"
    else
        log_error "Application failed to start properly"
        exit 1
    fi
}

# Run tests
run_tests() {
    log_info "Running tests..."

    # If test script exists in package.json
    if npm run test --dry-run 2>/dev/null; then
        npm test
        if [ $? -eq 0 ]; then
            log_success "All tests passed"
        else
            log_warning "Some tests failed"
        fi
    else
        log_info "No tests configured"
    fi
}

# Create systemd service (for Linux production deployment)
create_systemd_service() {
    if [ "$1" = "--production" ] && [ "$(uname)" = "Linux" ]; then
        log_info "Creating systemd service..."

        CURRENT_DIR=$(pwd)
        USERNAME=$(whoami)

        sudo tee /etc/systemd/system/mdm-approval.service > /dev/null <<EOF
[Unit]
Description=MDM Approval Application
After=network.target

[Service]
Type=simple
User=$USERNAME
WorkingDirectory=$CURRENT_DIR
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=4004

[Install]
WantedBy=multi-user.target
EOF

        sudo systemctl daemon-reload
        sudo systemctl enable mdm-approval.service

        log_success "Systemd service created and enabled"
        log_info "Use 'sudo systemctl start mdm-approval' to start the service"
        log_info "Use 'sudo systemctl status mdm-approval' to check service status"
    fi
}

# Backup database
backup_database() {
    if [ -f "db/mdm.db" ]; then
        BACKUP_DIR="backups"
        mkdir -p $BACKUP_DIR

        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        BACKUP_FILE="$BACKUP_DIR/mdm_backup_$TIMESTAMP.db"

        cp db/mdm.db $BACKUP_FILE
        log_success "Database backed up to $BACKUP_FILE"
    fi
}

# Show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --help              Show this help message"
    echo "  --production        Deploy for production (creates systemd service on Linux)"
    echo "  --skip-tests        Skip running tests"
    echo "  --skip-build        Skip build step (use existing build)"
    echo "  --backup            Create database backup before deployment"
    echo "  --port PORT         Specify port number (default: 4004)"
    echo ""
    echo "Examples:"
    echo "  $0                  # Standard deployment"
    echo "  $0 --production     # Production deployment with systemd service"
    echo "  $0 --skip-tests     # Deploy without running tests"
    echo "  $0 --backup         # Create backup before deployment"
}

# Parse command line arguments
PRODUCTION=false
SKIP_TESTS=false
SKIP_BUILD=false
CREATE_BACKUP=false
PORT=4004

while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_usage
            exit 0
            ;;
        --production)
            PRODUCTION=true
            shift
            ;;
        --skip-tests)
            SKIP_TESTS=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --backup)
            CREATE_BACKUP=true
            shift
            ;;
        --port)
            PORT="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Main deployment flow
main() {
    echo "============================================"
    echo "MDM Approval Application Deployment"
    echo "============================================"

    # Create backup if requested
    if [ "$CREATE_BACKUP" = true ]; then
        backup_database
    fi

    # Run deployment steps
    check_prerequisites
    install_dependencies

    if [ "$SKIP_BUILD" != true ]; then
        build_application
    fi

    initialize_database

    if [ "$SKIP_TESTS" != true ]; then
        run_tests
    fi

    # Create systemd service for production
    if [ "$PRODUCTION" = true ]; then
        create_systemd_service --production
    fi

    start_services

    echo ""
    log_success "🎉 MDM Approval Application deployed successfully!"
    echo ""
    echo "Next Steps:"
    echo "  📖 Check the logs: tail -f ~/.pm2/logs/mdm-approval-out.log"
    echo "  🔧 Configure users in package.json > cds.requires.auth.users"
    echo "  🔑 Set up proper authentication for production"
    echo "  📊 Monitor application health at /health endpoint"
    echo ""

    if [ "$PRODUCTION" != true ]; then
        echo "Application is running in foreground. Press Ctrl+C to stop."
        wait $APP_PID
    fi
}

# Run main function
main
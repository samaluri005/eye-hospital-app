#!/bin/bash

# ============================================================================
# Execute All Database Scripts
# Eye Hospital Management System
# ============================================================================

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Eye Hospital Database Setup - Version 1.0.0     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL environment variable is not set${NC}"
    echo -e "${YELLOW}Please set it with: export DATABASE_URL='your-connection-string'${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} Database URL found"
echo ""

# Function to execute SQL file
execute_sql() {
    local file=$1
    local description=$2
    
    echo -e "${BLUE}→${NC} Executing: ${YELLOW}$file${NC}"
    echo -e "  Description: $description"
    
    if psql "$DATABASE_URL" -f "$file" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ Success${NC}"
    else
        echo -e "  ${RED}✗ Failed${NC}"
        echo -e "  ${YELLOW}Retrying with error output...${NC}"
        psql "$DATABASE_URL" -f "$file"
        return 1
    fi
    echo ""
}

# Execute scripts in order
echo -e "${BLUE}Starting database setup...${NC}"
echo ""

execute_sql "database/01_create_tables.sql" "Creating all database tables and indexes"
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to create tables. Aborting.${NC}"
    exit 1
fi

execute_sql "database/02_consent_setup.sql" "Setting up consent management framework"
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Consent setup had issues but continuing...${NC}"
fi

execute_sql "database/03_mfa_security_setup.sql" "Configuring MFA and security features"
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: MFA setup had issues but continuing...${NC}"
fi

execute_sql "database/04_utilities_and_maintenance.sql" "Installing utility functions and views"
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Warning: Utilities setup had issues but continuing...${NC}"
fi

# Verify setup
echo -e "${BLUE}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              Verifying Installation                ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}→${NC} Checking tables..."
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ')
echo -e "  Tables created: ${GREEN}$TABLE_COUNT${NC}"

echo -e "${BLUE}→${NC} Checking functions..."
FUNCTION_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';" 2>/dev/null | tr -d ' ')
echo -e "  Functions created: ${GREEN}$FUNCTION_COUNT${NC}"

echo -e "${BLUE}→${NC} Checking indexes..."
INDEX_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" 2>/dev/null | tr -d ' ')
echo -e "  Indexes created: ${GREEN}$INDEX_COUNT${NC}"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Database Setup Complete! ✓                ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Run tests: ${YELLOW}npm test${NC}"
echo -e "  2. Start the app: ${YELLOW}npm run dev${NC}"
echo -e "  3. View stats: ${YELLOW}psql \$DATABASE_URL -c 'SELECT * FROM get_registration_stats()'${NC}"
echo ""

echo -e "${YELLOW}📚 For more information, see database/README.md${NC}"

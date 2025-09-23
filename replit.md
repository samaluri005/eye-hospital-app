# Eye Hospital Management System

## Overview
This is a comprehensive Eye Hospital Management System built as a monorepo with multiple applications including patient portals, HR management, mobile apps, and microservices.

## Project Architecture
- **Monorepo**: Uses pnpm workspaces and Turbo for dependency management
- **Frontend Apps**: 
  - Patient Portal Web (Next.js) - Primary frontend on port 5000
  - Hospital HR Portal Web (Next.js) - HR management on port 3001  
  - Patient Mobile App (React Native/Expo)
- **Backend**: .NET 8 microservices architecture
- **Database**: PostgreSQL with Drizzle ORM
- **Infrastructure**: Azure-ready with Bicep templates

## Current Setup
- Main frontend: Patient Portal Web (configured for Replit environment)
- Database: PostgreSQL with all environment variables configured
- Deployment: Configured for autoscale deployment target
- Dependencies: All installed and configured

## Development
- Primary workflow: Patient Portal running on port 5000
- Backend services available but not currently active
- Mobile development available via Expo

## Recent Changes (Sept 23, 2025)
- Imported from GitHub and configured for Replit environment
- Fixed Next.js configurations for proxy environment
- Set up PostgreSQL database with environment variables
- Configured main frontend workflow
- Added deployment configuration for production
- **Auth Architecture Cleanup**: Consolidated duplicate auth component folders from `app/(components)/auth/` and `app/auth/components/` into single organized directory structure
- **Code Organization**: Improved component structure following Next.js best practices with all auth components now in `app/auth/components/`

## User Preferences
- Prefers working with the Patient Portal as the primary application
- Uses modern tech stack (Next.js, TypeScript, Tailwind CSS)
- Azure cloud integration ready but not required for basic functionality

## Local Development Setup (Outside Replit)

### Required Environment Variables (Secrets)
To run this application locally outside of Replit, you must set up these environment variables:

#### Database Configuration
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/eye_hospital_db
PGHOST=localhost
PGPORT=5432
PGUSER=your_db_user
PGPASSWORD=your_db_password
PGDATABASE=eye_hospital_db
```

#### Authentication Secrets
```bash
# OTP verification - generate a secure random string
OTP_HMAC_SECRET=your_secure_otp_secret_key

# Account linking - generate a secure random string  
LINK_TOKEN_HMAC_SECRET=your_secure_link_token_secret

# Microsoft Azure AD configuration (public values, safe to expose)
NEXT_PUBLIC_AZURE_CLIENT_ID=your_azure_app_client_id
NEXT_PUBLIC_AZURE_TENANT_ID=your_azure_tenant_id
```

#### Twilio SMS Configuration
```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_FROM_NUMBER=+1234567890
```

### Local Development Prerequisites

#### 1. Node.js & Package Manager
```bash
# Install Node.js 20+ and pnpm
npm install -g pnpm

# Install dependencies
pnpm install
```

#### 2. PostgreSQL Database Setup
```bash
# Install PostgreSQL locally or use Docker
# Create database
createdb eye_hospital_db

# Push schema to database
pnpm db:push
```

#### 3. Azure AD App Registration
1. Create Azure AD app registration
2. Set redirect URI to `http://localhost:5000/auth`
3. Configure API permissions for Microsoft Graph
4. Copy Client ID and Tenant ID to environment variables

#### 4. Twilio SMS Service Setup
1. Create Twilio account
2. Get Account SID and Auth Token
3. Purchase phone number for SMS sending
4. Configure environment variables

### Running Locally

#### Start Patient Portal (Primary Frontend)
```bash
cd apps/patient-portal-web
pnpm dev
# Runs on http://localhost:3000 (configure to port 5000 if needed)
```

#### Start Authentication Service (Backend)
```bash
cd temp-auth-service
node server.js
# Runs on http://localhost:3001
```

#### Start HR Portal (Optional)
```bash
cd apps/hospital-hr-portal-web
pnpm dev
# Runs on http://localhost:3001
```

### Configuration Differences for Local Development

#### Next.js Configuration
For local development, modify `next.config.js` to remove Replit-specific configurations:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove Replit proxy headers for local development
  // async headers() { ... } // Comment out
  
  // Standard Next.js configuration
}
```

#### Host Binding
- **Replit**: Must bind to `0.0.0.0:5000`
- **Local**: Can bind to `localhost:3000` or any available port

### Security Notes
1. **Never commit secrets** to version control
2. Use `.env.local` files for local environment variables
3. **OTP and Link Token secrets** should be cryptographically secure random strings (32+ characters)
4. **Database** should use proper authentication and SSL in production
5. **Twilio credentials** should be kept secure and rotated regularly

### Azure Infrastructure (Optional)
For full Azure integration, use the provided setup script:
```bash
# Run Azure setup script (requires Azure CLI)
./infra/setup-dev-azure.sh --prefix ehmsdev --location eastus
```

This creates:
- Resource Group
- Key Vault for secret management
- Service Bus for messaging
- PostgreSQL Flexible Server
- Service Principal for authentication

### Database Schema
Reference `DATABASE_SCHEMA.md` for complete database structure and HIPAA-compliant table definitions.
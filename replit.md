# Eye Hospital Management System

## Project Overview
A comprehensive monorepo-based eye hospital management system built for the Replit environment. The system includes patient portals, hospital management interfaces, and supporting microservices.

## Project Architecture

### Current Applications
- **Patient Portal Web** (`apps/patient-portal-web/`) - Next.js 14 app running on port 5000
- **Hospital HR Portal Web** (`apps/hospital-hr-portal-web/`) - Next.js 14 admin interface
- **Patient Portal Mobile** (`apps/patient-portal-mobile/`) - React Native/Expo mobile app

### Shared Packages
- **@hospital/ui** (`packages/ui/`) - Shared React components (Button, Card, Modal, Input)
- **@hospital/types** (`packages/types/`) - TypeScript type definitions
- **@hospital/api-specs** (`packages/api-specs/`) - API specifications
- **@hospital/config** (`packages/config/`) - Shared configuration

### Microservices Structure
- `microservices/auth-netcore/` - .NET 8 authentication service
- `microservices/patient-functions/` - Patient management functions
- `microservices/hospital-functions/` - Hospital operations functions
- `microservices/whatsapp-integration-functions/` - WhatsApp integration
- `microservices/billing-functions/` - Billing and payments

## Technology Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS 3
- **Mobile**: React Native with Expo
- **Backend**: .NET 8, Azure Functions, Node.js
- **Build Tools**: Turbo, npm workspaces
- **Environment**: Node.js 20, Replit with autoscale deployment

## Current Setup Status
✅ **Completed**:
- Complete monorepo directory structure
- Patient portal running successfully on port 5000
- Proper Next.js configuration for Replit environment (0.0.0.0 binding)
- Shared packages with TypeScript support
- Deployment configuration for autoscale
- Environment with Node.js 20 and required dependencies

## Development Commands
```bash
# Start patient portal (main frontend)
npm run dev:patient-portal

# Start HR portal
npm run dev:hr-portal

# Build all applications
npm run build

# Run all development servers
npm run dev
```

## Replit Configuration
- **Main Workflow**: Patient Portal running on port 5000
- **Deployment**: Configured for autoscale with build and start commands
- **Environment**: Node.js 20 with npm package manager

## Recent Changes (Sept 17, 2025)
- Initial monorepo setup with complete directory structure
- Fixed dependency version conflicts and package manager consistency
- Created shared UI components and type definitions
- Configured Next.js applications for Replit proxy environment
- Set up deployment configuration for production

## User Preferences
- Primary focus on patient portal for development
- Use pnpm as package manager with turbo for monorepo management
- Maintain monorepo structure with proper shared packages
- Ensure all frontends work properly in Replit's proxy environment

## 🚨 IMPORTANT PRODUCTION DEPLOYMENT REMINDER
**User requested to be reminded:** When ready for production, need to transition from current monorepo setup to **independent production deployments** for each service:

### Production Deployment Strategy:
1. **Patient Portal Web** - Create separate Repl with `.replit` file:
   ```
   language = "nix"
   run = "pnpm --filter ./apps/patient-portal-web... --workspace-root run dev"
   ```

2. **Hospital HR Portal Web** - Create separate Repl with `.replit` file:
   ```
   language = "nix" 
   run = "pnpm --filter ./apps/hospital-hr-portal-web... --workspace-root run dev"
   ```

3. **Individual Microservices** - Each with separate Repl:
   ```
   language = "nix"
   run = "pnpm --filter ./microservices/<service-folder>... --workspace-root run dev"
   ```

**Benefits of Independent Deployments:**
- Separate secrets management per service
- Individual scaling and monitoring
- Independent deployment cycles
- Service isolation for security

⚠️ **REMINDER: Bring this up when user is ready for production deployment!**

### Mobile App Deployment (Expo):
For running the React Native mobile app on Replit:

1. **Create separate Expo Repl** with `.replit` file:
   ```
   language = "nix"
   run = "pnpm --filter ./apps/patient-portal-mobile... --workspace-root run start"
   ```

2. **Expo Features on Replit:**
   - Shows web interface with QR codes for device testing
   - Supports Expo web version in browser
   - Tunnel/proxy support for device development
   - Access to Expo dev tools

3. **Command for mobile development:**
   ```bash
   pnpm --filter ./apps/patient-portal-mobile... --workspace-root run start
   ```

## Azure Infrastructure Setup

### Automated Azure Environment Provisioning
The project includes a comprehensive Azure infrastructure setup script at `infra/setup-dev-azure.sh`.

**What it creates:**
- Resource Group with unique naming
- Key Vault for secrets management
- Service Bus with topics (appointments, notifications, billing)
- PostgreSQL Flexible Server with firewall rules
- Service Principal with appropriate permissions
- Automated secret storage in Key Vault

**Usage:**
```bash
# Make executable (already done)
chmod +x infra/setup-dev-azure.sh

# Run with custom parameters
./infra/setup-dev-azure.sh --prefix ehmsdev --location eastus

# Or run interactively (will prompt for inputs)
./infra/setup-dev-azure.sh
```

**Prerequisites:**
- Azure CLI logged in (`az login`)
- jq installed for JSON parsing
- Account with permissions to create Azure resources

**Secrets created in Key Vault:**
- `SERVICE_BUS_CONN` - Service Bus connection string
- `POSTGRES_CONN` - PostgreSQL connection string
- `AZURE_CLIENT_ID` - Service Principal App ID
- `AZURE_CLIENT_SECRET` - Service Principal Secret
- `AZURE_TENANT_ID` - Azure AD Tenant ID
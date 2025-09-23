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
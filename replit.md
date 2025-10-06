# Eye Hospital Management System

## Overview
This is a comprehensive Eye Hospital Management System designed as a monorepo. It integrates multiple applications, including a patient portal, an HR management system, mobile applications, and a microservices backend. The system aims to provide a robust, scalable, and secure platform for managing eye hospital operations, patient interactions, and HR functions, with a strong focus on compliance, particularly HIPAA.

## User Preferences
- Prefers working with the Patient Portal as the primary application
- Uses modern tech stack (Next.js, TypeScript, Tailwind CSS)
- Azure cloud integration ready but not required for basic functionality

## System Architecture
The project is structured as a monorepo utilizing pnpm workspaces and Turbo for efficient dependency management.

**Frontend:**
- **Patient Portal Web (Next.js)**: The primary patient-facing web application.
- **Hospital HR Portal Web (Next.js)**: For human resources management.
- **Patient Mobile App (React Native/Expo)**: A mobile application for patients.

**Backend:**
- A microservices architecture built with .NET 8.

**Database:**
- PostgreSQL, managed with Drizzle ORM. The database schema includes comprehensive tables for CDC de-duplication, government ID verification, session management, HIPAA audit logging, consent management, family/emergency access, and healthcare operations (doctors, appointments, medical records, billing). Patient table is enhanced with 20+ CDC-compliant fields, including standardized name/phone/address, Soundex indexing, blocking keys, trust levels, and Entra External ID integration fields.

**UI/UX Decisions:**
- Modern OTP input design with individual digit boxes, auto-advance, keyboard navigation, and paste support.
- Visual states for input fields (empty, filled, focus, hover) using Tailwind CSS.
- Gradient header icons and verify buttons for a modern aesthetic.
- Custom Tailwind animation for error messages (shake animation).
- Professional LoadingSpinner component with a healthcare theme.
- Improved spacing and card-like layouts for better readability.

**Technical Implementations:**
- **Phase 1A Identity Schema (COMPLETED)**: UPI-first approach with 9 new tables (users, credentials, external_identities, proxy_access, verification_evidence, staff_invites, empi_records, merge_tickets, attempt_counters). Argon2id password hashing with automatic bcrypt legacy migration. PostgreSQL extensions enabled (pgcrypto, pg_trgm).
- **Phase 1B Auth Service API (COMPLETED)**: 7 REST endpoints implemented in .NET 8:
  - POST /auth/validate-upi - Validates UPI and returns patient metadata
  - POST /auth/exchange - Exchanges Entra External ID token for internal session
  - POST /empi/match - EMPI matching with weighted scoring for duplicate detection
  - POST /auth/stepup/candidates - Returns available step-up authentication methods
  - POST /auth/stepup/verify - Verifies step-up credentials (DOB validation with security enforcement requiring at least one verification method, proper 401 on mismatch, audit logging)
  - POST /staff/create_patient - Staff endpoint to create patients with auto-generated UPIs
  - POST /staff/send_invite - Staff endpoint to send secure invites with signed tokens
  All endpoints include comprehensive HIPAA audit logging, proper error handling, and security controls.
- **Phase 1 PDF Schema Enhancements (COMPLETED - Oct 6, 2025)**:
  - **Patient Table CDC/EMPI Fields**: Added first_name, middle_name, last_name, gender, addresses (JSONB), identifiers (JSONB), empi_score (NUMERIC), empi_status (TEXT default 'unknown'), verified_method, verified_by (UUID), verification_at (TIMESTAMPTZ) for CDC-compliant identity management and EMPI duplicate detection.
  - **Trigram Fuzzy Matching Index**: Created idx_patients_name_trgm GIN trigram index on (first_name || ' ' || last_name) for efficient fuzzy name matching in EMPI de-duplication workflows.
  - **Flexible Audit Log Structure**: Enhanced audit_log with actor_type (TEXT), actor_id (UUID), resource_type (TEXT), resource_id (UUID), meta (JSONB) for auditing any resource type beyond patients. Created idx_audit_actor and idx_audit_resource compound indexes for efficient audit queries.
  - **Cross-Service Schema Alignment**: Updated Auth Service C# models (Patient.cs, AuditLog.cs) and Patient Portal Drizzle schema (schema.ts) to match Phase 1 database schema, ensuring consistent ORM/EF Core operations across services.
- **Two-Factor Authentication (2FA)**: Implemented using Date of Birth (DOB) and a 4-digit PIN with conditional flows for new/existing users and family members. Now uses Argon2id hashing with pepper for enhanced security, includes failed attempt tracking, 15-minute lockout after 5 failed attempts, and LinkToken validation to prevent brute-force attacks.
- **Session Management**: Secure HTTP-only cookie authentication with session revocation on new logins, PostgreSQL cross-checks for active sessions, and atomic invalidation.
- **CDC Data Standardization and Matching**: Algorithms for name/phone/address standardization (E.164, Soundex, Metaphone), string similarity (Levenshtein, Jaro, Jaro-Winkler), and multi-field matching with weighted scoring for duplicate detection and patient identity management.
- **Authentication Flow**: Consolidated and improved authentication components following Next.js best practices.
- **De-duplication**: CDC-compliant patient identity management with strategic indexes for performance.
- **Performance Optimizations**: 17 strategic indexes for fast de-duplication, HIPAA audit searches, and appointment lookups.
- **HIPAA Compliance**: All PHI stored in PostgreSQL; authentication-only data in Entra External ID.

**System Design Choices:**
- **Monorepo**: Facilitates shared code, consistent tooling, and simplified dependency management across multiple applications.
- **Microservices**: Enables independent development, deployment, and scaling of different functionalities.
- **Azure Integration**: Designed to be Azure-ready with Bicep templates for infrastructure deployment.
- **Security by Design**: Incorporates HIPAA audit logging, robust session management, and rate limiting.
- **Extensible Authentication**: Migration from Azure AD B2C custom policies to Microsoft Entra External ID with Custom Authentication Extensions for modern, API-driven authentication workflows.

## External Dependencies
- **Microsoft Entra External ID**: For identity and access management, replacing Azure AD B2C. Utilizes Custom Authentication Extensions for integrating with external services.
- **Microsoft Graph API**: For automatic Entra External ID user provisioning and management during signup, linking patients to Entra users via `entraObjectId`.
- **Twilio**: For SMS OTP (One-Time Password) delivery within the authentication flow.
- **Google reCAPTCHA v3**: Integrated for bot protection across authentication flows (signup, sign-in, OTP verification) with client-side hooks and server-side verification.
- **PostgreSQL**: The primary relational database.
- **Drizzle ORM**: Used for interacting with the PostgreSQL database.
- **libphonenumber-js**: For E.164 phone number formatting and validation.
- **Expo**: For React Native mobile application development.
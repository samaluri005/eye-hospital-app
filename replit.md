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
- **Registration Flow UX Enhancements (Oct 14, 2025)**:
  * Removed "Ways to Sign In" bullet list from UPI display step for cleaner design
  * Extended Profile step now pre-populates with initial profile data (no null values)
  * Reordered address fields: Postal/Zip Code → City/State → Country → Address Lines (UX improvement for common workflow)
  * Emergency Contact phone uses InternationalPhoneInput with country code selector
  * InfoTooltip component for hover tooltips with accessibility support
  * MFA Setup step includes tooltips: "Why Enable MFA?", "Authenticator App" (with app examples), "SMS OTP" (with description)
  * MFA SMS setup displays phone number as read-only for users with registered phones, editable input for users without phones

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
  - **Entra External ID Custom Attributes**: Configured extension attributes (extension_upi, extension_verified_method, extension_roles) in Entra tenant. Updated Graph API client (graphClient.ts) with functions to set UPI, verification method, and roles during user creation or via update operations. Extension attributes appear in JWT tokens for downstream authorization.
  - **Additional App Registrations**: Created Auth Service API (Client ID: 5ff90df4-b44f-40e7-81bd-6f13653fd0d2) with exposed scope api://5ff90df4-b44f-40e7-81bd-6f13653fd0d2/auth. Created Admin Portal (Client ID: c6750f66-2c78-40c5-bd5b-5e9102a1769a) with RBAC roles (Admin, Doctor, Nurse, Staff) for hospital staff authentication.
- **Two-Factor Authentication (2FA)**: Implemented using Date of Birth (DOB) and a 4-digit PIN with conditional flows for new/existing users and family members. Now uses Argon2id hashing with pepper for enhanced security, includes failed attempt tracking, 15-minute lockout after 5 failed attempts, and LinkToken validation to prevent brute-force attacks.
- **Session Management**: Secure HTTP-only cookie authentication with session revocation on new logins, PostgreSQL cross-checks for active sessions, and atomic invalidation.
- **CDC Data Standardization and Matching**: Algorithms for name/phone/address standardization (E.164, Soundex, Metaphone), string similarity (Levenshtein, Jaro, Jaro-Winkler), and multi-field matching with weighted scoring for duplicate detection and patient identity management.
- **Authentication Flow**: Consolidated and improved authentication components following Next.js best practices.
- **Hybrid Authentication System (COMPLETED - Oct 7, 2025)**: Implemented comprehensive multi-method authentication:
  - **UPI Sign-In**: Traditional password-based authentication for returning patients (UPI + Password → MFA if enabled → Dashboard)
  - **Phone Sign-In**: OTP-based authentication (Phone + OTP → Account Selection → DOB/PIN verification → Dashboard)
  - **Email Sign-In**: OTP-based authentication with email parity (Email + OTP → Account Selection → DOB/PIN verification → Dashboard, requires SMTP configuration)
  - **Social Sign-In**: OAuth integration with EMPI matching (Google/Microsoft/Apple → EMPI match → Account Selection if multiple → DOB/PIN verification → Dashboard)
  - **UPI Masking**: Last 4 characters visible (UPI123456 → ****3456) for account selection and verification screens
  - **Unified Auth Landing**: Homepage displays both "Sign In" and "Sign Up" buttons, AuthMethodSelector component with 4 sign-in options, EnhancedAuthFlow router managing all authentication paths
  - **Simplified Registration Flow with CDC-Compliant EMPI (Oct 14, 2025)**: Direct signup with weighted probabilistic duplicate detection:
    * Landing Page: Shows "Existing Patients" (UPI sign-in) and "New Patient Registration" (single button, no OTP options)
    * Step 1: Profile Step - Minimal mode with Title, First/Middle/Last Name, DOB (with age display), Gender, Guardian (for minors), Patient Type, Mobile Number
    * Step 2: CDC-Compliant EMPI Duplicate Detection with Weighted Scoring:
      - Government ID Match: 100 points (instant duplicate block if exact match)
      - Demographics: First Name (25pts) + Last Name (25pts) + DOB (30pts) + Gender (10pts) = 90pts max
      - Contact Info (Supporting Evidence): Phone (7pts) + Email (5pts) + Address (3pts) = 15pts max
      - Decision Thresholds: Score ≥80 = Block (high confidence duplicate), 50-79 = Flag for manual review (medium confidence), <50 = Allow (different person)
      - Security: No PHI exposure in responses; all match details logged server-side only for HIPAA compliance
      - Database Schema: Phone/email unique constraints removed (families share contacts); govt_id_type+govt_id_number have composite unique index
    * Step 3: Password Setup (PasswordSetupStep with strength meter, Argon2id hashing)
    * Step 4: UPI Display (YourIdStep shows generated Hospital ID)
    * Step 5: Extended Profile (Optional: Government ID (Aadhaar/Passport/Voter ID/Driving License/PAN), Blood Group, Source of Patient with referral, addresses, occupation, marital status)
    * Step 6: MFA Setup (Optional: TOTP Authenticator App or SMS OTP using MfaSetupStep, TOTP secret stored in credentials table)
    * Step 7: HIPAA Consent (Required: Privacy Notice, Electronic Communications; Optional: Research Participation - HipaaConsentStep with patient_consents table)
    * Step 8: Dashboard Redirect
    * Security: LinkToken (32-byte hex, HMAC SHA256, 15min expiry) generated during patient creation, required for all downstream steps; comprehensive EMPI audit logging with redacted govt ID numbers
  - **Backend API Endpoints (Auth Service)**:
    * POST /auth/upi-signin - UPI + password validation with Argon2id, MFA check
    * POST /auth/verify-mfa - PIN-based MFA verification using Argon2id
    * POST /signup/start-email - Email OTP generation (requires SMTP/SendGrid configuration)
    * POST /signup/verify-email - Email OTP verification with account selection
    * Enhanced /signup/verify - Now includes UPI field in account responses for masked display
  - **Frontend API Endpoints (Patient Portal)**:
    * POST /api/auth/create-patient-with-empi-check - Creates patient with EMPI duplicate detection; calls Auth Service /empi/match, hard blocks if score ≥80%, generates linkToken for successful creation
    * POST /api/auth/mfa/generate-totp - Generates TOTP secret using otplib, returns QR code URI
    * POST /api/auth/mfa/verify-totp - Verifies TOTP codes against secret
    * POST /api/auth/setup-mfa - Stores TOTP secret in credentials table, enables mfaEnabled flag in users table
    * POST /api/auth/save-consent - Saves consent records to patient_consents table with HIPAA audit logging
  - **Security Enhancements**:
    * Konscious.Security.Cryptography.Argon2 (v1.3.1) for password hashing
    * PasswordHelper service with Argon2id salt+pepper hashing
    * OtpAttempt model enhanced with Email field for email OTP support
    * TOTP secrets stored securely in credentials table (passwordHash field)
    * All endpoints include HIPAA audit logging and failed attempt tracking
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
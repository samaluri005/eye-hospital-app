# Eye Hospital Management System

## Overview
This project is a comprehensive Eye Hospital Management System structured as a monorepo. It aims to provide a robust, scalable, and secure platform for managing eye hospital operations, patient interactions, and HR functions. The system integrates various applications, including a patient portal, an HR management system, mobile applications, and a microservices backend, with a strong emphasis on compliance, particularly HIPAA.

## User Preferences
- Prefers working with the Patient Portal as the primary application
- Uses modern tech stack (Next.js, TypeScript, Tailwind CSS)
- Azure cloud integration ready but not required for basic functionality

## System Architecture
The project utilizes a monorepo structure with pnpm workspaces and Turbo for dependency management.

**Frontend:**
- **Patient Portal Web**: Primary patient-facing web application built with Next.js.
- **Hospital HR Portal Web**: Human resources management application built with Next.js.
- **Patient Mobile App**: Mobile application for patients developed with React Native/Expo.

**Backend:**
- A microservices architecture implemented with .NET 8.

**Database:**
- PostgreSQL, managed with Drizzle ORM. The schema includes tables for CDC de-duplication, government ID verification, session management, HIPAA audit logging, consent management, family/emergency access, and healthcare operations (doctors, appointments, medical records, billing). The patient table is enhanced with CDC-compliant fields for identity management and EMPI.

**UI/UX Decisions:**
- **World-Class Login Screen (Oct 15, 2025)**: Split-screen design inspired by Mayo Clinic/Cleveland Clinic simplicity and Stripe/Linear modern aesthetics:
  * LEFT: Animated carousel with 5 professional doctor images, auto-rotating every 5 seconds with smooth fade transitions
  * Each image has floating animation (3s ease infinite), gradient background, decorative circles
  * Carousel indicators at bottom for manual navigation (clickable dots)
  * RIGHT: Clean login form with Hospital ID + Password fields, show/hide toggle, right-aligned Forgot ID/Password links
  * Framer Motion animations: input focus (scale 1.01), button hover/tap, smooth carousel transitions (0.7s)
  * Integrated MFA flow: 4-digit PIN entry appears inline when required, with back navigation
  * Dual New Patient options: "Create New Account" button + "Register Now" text link
  * Copyright footer positioned on white side only
  * Responsive: stacked mobile, side-by-side desktop (50/50)
  * Accessibility: prefers-reduced-motion support, ARIA labels
  * Branding: "Eye Care" (clean, spaced logo without "Hospital")
- **Modern Registration Form (Oct 15, 2025)**: Clean, essential signup experience with dual-mode support (minimal vs extended):
  * Minimal Mode (Signup): Clean header without branding, 3-step progress indicator (Profile → Verification → Complete)
  * Compact title dropdown matching input field sizes
  * Modern date picker with calendar icon overlay (DD/MM/YYYY format)
  * Essential auth fields: Email (validated), Password (5-level strength indicator + show/hide), Confirm Password
  * Real-time validation: green checkmarks on valid fields, animated error messages on invalid
  * Terms & Privacy checkbox with clickable links to Terms of Service and Privacy Policy
  * Guardian fields auto-shown for minors (under 18) with relationship dropdown
  * Improved spacing: compact inputs (py-2.5), better typography, clear visual hierarchy
  * Framer Motion animations: error messages slide in, button hover/tap interactions
  * Extended Mode (Profile Completion): Full patient data collection with government ID, address, emergency contacts, medical info
- Modern OTP input design with individual digit boxes, auto-advance, and keyboard navigation.
- Visual states for input fields using Tailwind CSS.
- Gradient header icons and verify buttons.
- Custom Tailwind animation for error messages.
- Professional LoadingSpinner component with a healthcare theme.
- Improved spacing and card-like layouts.
- Enhanced registration flow with pre-populated fields, reordered address fields, and InternationalPhoneInput for emergency contacts.
- InfoTooltip component for accessibility.
- MFA Setup step includes informative tooltips.

**Recent Updates (Oct 15, 2025 - Patient Registration Enhancement):**
- **Health ID Terminology**: Renamed "Hospital ID/UPI" to "Health ID" across all frontend components (YourIdStep, UpiSignInStep, AuthMethodSelector) for clearer patient communication
- **Enhanced Registration with Consents (ProfileStep)**:
  * Added 4 required consent checkboxes in Step 2: Terms of Service, Privacy Policy, HIPAA Notice, Health Information Authorization
  * Created ConsentModal component for full consent text display
  * Guardian name + relationship dropdown for minors (age < 18) with GUARDIAN_RELATIONSHIPS options (Father, Mother, Caregiver, etc.)
  * Made mobile number optional (removed asterisk, updated validation)
  * Professional InfoTooltip components explain Health ID, phone benefits, email benefits, and MFA protection
  * Consent data flows through ProfileData type to registration API
- **EMPI Duplicate Detection**:
  * Added EMPI check after Step 1 (Personal Info) before allowing progression to Step 2
  * Created /api/auth/empi-check endpoint for early duplicate detection with firstName, lastName, DOB, gender, title
  * If duplicate found, shows error message and blocks progression with clear user guidance
  * Prevents duplicate patient records while maintaining PHI security
- **MFA Enhancement (MfaSetupStep)**:
  * Added Email OTP as third MFA option alongside Authenticator App (TOTP) and SMS OTP
  * Updated MfaMethod type to include "email" with email address capture
  * Progressive setup flows: select method → configure → verify for all three options
  * Professional UI with method-specific colors (purple=TOTP, blue=SMS, green=Email)
  * Skip option available for optional MFA setup
- **MFA Sign-In Update (AuthMethodSelector)**:
  * Removed 4-digit PIN MFA (deprecated)
  * Updated to 6-digit verification codes compatible with TOTP/SMS/Email
  * Dynamic UI labels based on mfaMethod (shows "from authenticator app", "sent to phone", or "sent to email")
  * Frontend sends {code, method} to /api/auth/verify-mfa (requires backend update - see Pending Work)
- **WelcomeStep Component (Oct 15, 2025)**:
  * Professional post-registration welcome screen with animated success icon
  * Displays patient name and Health ID in gradient card
  * Shows "What's Next?" onboarding information
  * Security assurance message and dashboard navigation
  * Integrated into EnhancedAuthFlow with proper routing for direct signup vs OTP flows
  * Direct signup users (with consents in Step 2) see WelcomeStep instead of redundant HIPAA consent
- **Bug Fixes (Oct 15, 2025)**:
  * Fixed ProfileStep runtime error: Added missing `loading` state and `axios` import
  * Removed extraneous "Required for patients under 18 years" text from guardian relationship field
  * Fixed flow routing: Direct signup now skips redundant PasswordSetupStep since password is collected in ProfileStep Step 2
  * Cleaned up UI for better user experience
- **Registration Flow Fix (Oct 15, 2025 - Critical)**:
  * **CORRECTED**: Patient creation now happens ONLY after Step 2 (Contact & Security with password + consents)
  * Step 1: Personal Info → EMPI check via /api/auth/empi-check (duplicate detection ONLY, NO database record)
  * Step 2: Contact & Security → Create patient via /api/auth/create-patient-with-empi-check → Display Health ID
  * Removed redundant EMPI check from create-patient endpoint (already done in Step 1)
  * Added "Back to Sign-In" button in Step 1, "Back" button in Step 2 for proper navigation
  * Form data persists when navigating between steps until page refresh
  * "Skip" buttons remain only for optional steps (Extended Profile, MFA Setup)
  * Complete flow: Step 1 (EMPI check, no DB) → Step 2 (create patient) → YourIdStep (show Health ID) → Extended Profile (optional) → MFA (optional) → Welcome → Dashboard

**Pending Work (Backend API Updates Required):**
1. **Recovery Flows**: Forgot Health ID and Forgot Password flows (deferred - requires backend APIs)
2. **Backend API Updates**:
   - Update /api/auth/verify-mfa to accept {code, method} instead of {pin}
   - Update /api/auth/upi-signin to return mfaMethod in response
   - Create forgot-health-id and forgot-password endpoints
   - Add consent storage in registration flow
   - Update TOTP setup/verification endpoints
3. **Cleanup**: Remove deprecated Phone/Email/Social sign-in methods from routing
4. **End-to-End Testing**: Test complete flow with all scenarios (minor, adult, MFA options)

**Technical Implementations:**
- **Identity Schema**: UPI-first approach with dedicated tables for users, credentials, external identities, proxy access, and verification evidence. Argon2id password hashing is used.
- **Auth Service API**: A set of REST endpoints for UPI validation, token exchange, EMPI matching, step-up authentication, and staff operations (patient creation, invite sending). All endpoints include HIPAA audit logging and security controls.
- **PDF Schema Enhancements**: Patient table includes CDC/EMPI fields, trigram fuzzy matching index for names, and a flexible audit log structure.
- **Cross-Service Schema Alignment**: Consistent C# models and Drizzle schema across services.
- **Entra External ID Integration**: Custom attributes (extension_upi, extension_verified_method, extension_roles) configured in Entra, and Graph API client functions for user provisioning and attribute management.
- **Two-Factor Authentication (2FA)**: Implemented using Date of Birth (DOB) and a 4-digit PIN with Argon2id hashing, failed attempt tracking, and link token validation.
- **Session Management**: Secure HTTP-only cookie authentication with session revocation and PostgreSQL cross-checks.
- **CDC Data Standardization and Matching**: Algorithms for name/phone/address standardization, string similarity, and multi-field matching with weighted scoring for duplicate detection.
- **Hybrid Authentication System**: Supports UPI, Phone (OTP), Email (OTP), and Social Sign-In (OAuth) with EMPI matching.
- **Simplified Registration Flow with CDC-Compliant EMPI**: Direct signup with weighted probabilistic duplicate detection based on government ID, demographics, and contact info, security checks to prevent PHI exposure, and a secure linkToken for step progression.
- **JWT Authentication System (Oct 14, 2025)**: Centralized `JwtService` for token generation and validation (access and refresh tokens) with user ID, UPI, email, and roles as claims. Refresh tokens are stored as SHA256 hashes. Middleware ensures authentication and authorization.
  - **Sign-In Endpoints**:
    * POST /auth/signin/upi - UPI + password authentication with MFA check, returns JWT tokens
    * POST /auth/verify-mfa - Verifies 4-digit PIN and returns JWT tokens after successful MFA
    * POST /auth/signin/phone/request-otp - Sends OTP to phone via Twilio for phone-based sign-in
    * POST /auth/signin/phone/verify-otp - Verifies phone OTP and returns JWT tokens
    * POST /auth/signin/email/request-otp - Sends OTP to email (requires SMTP/SendGrid configuration)
    * POST /auth/signin/email/verify-otp - Verifies email OTP and returns JWT tokens
    * POST /auth/token/refresh - Refreshes access token using refresh token
  - **Registration Endpoint**:
    * POST /auth/register - Complete registration with EMPI duplicate detection and JWT token issuance
  - **Token Security**: 2-hour access token expiration, 7-day refresh token expiration, SHA256 hashed storage, account lockout enforcement
  - **Response Format**: Standardized JWT payload with user data (id, upi, name, email), accessToken, and refreshToken
- **De-duplication**: CDC-compliant patient identity management with strategic indexes.
- **Performance Optimizations**: 17 strategic indexes for fast de-duplication, HIPAA audit searches, and appointment lookups.
- **HIPAA Compliance**: PHI stored in PostgreSQL; authentication-only data in Entra External ID.

**System Design Choices:**
- **Monorepo**: For shared code, consistent tooling, and simplified dependency management.
- **Microservices**: For independent development, deployment, and scaling.
- **Azure Integration**: Azure-ready with Bicep templates.
- **Security by Design**: Incorporates HIPAA audit logging, robust session management, and rate limiting.
- **Extensible Authentication**: Migration to Microsoft Entra External ID with Custom Authentication Extensions for modern, API-driven workflows.

## External Dependencies
- **Microsoft Entra External ID**: For identity and access management, including Custom Authentication Extensions.
- **Microsoft Graph API**: For automatic Entra External ID user provisioning and management.
- **Twilio**: For SMS OTP delivery.
- **Google reCAPTCHA v3**: For bot protection across authentication flows.
- **PostgreSQL**: The primary relational database.
- **Drizzle ORM**: For interacting with PostgreSQL.
- **libphonenumber-js**: For E.164 phone number formatting and validation.
- **Expo**: For React Native mobile application development.
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
- Modern OTP input design with individual digit boxes, auto-advance, and keyboard navigation.
- Visual states for input fields using Tailwind CSS.
- Gradient header icons and verify buttons.
- Custom Tailwind animation for error messages.
- Professional LoadingSpinner component with a healthcare theme.
- Improved spacing and card-like layouts.
- Enhanced registration flow with pre-populated fields, reordered address fields, and InternationalPhoneInput for emergency contacts.
- InfoTooltip component for accessibility.
- MFA Setup step includes informative tooltips.

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
# Eye Hospital Management System

## Overview
This project is a comprehensive Eye Hospital Management System structured as a monorepo. It aims to provide a robust, scalable, and secure platform for managing eye hospital operations, patient interactions, and HR functions. The system integrates various applications, including a patient portal, an HR management system, and mobile applications, with a microservices backend, and a strong emphasis on HIPAA compliance. The business vision is to provide a world-class digital experience for patients and staff, leveraging modern technology to streamline healthcare operations.

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
- **World-Class Login Screen**: Features a split-screen design with an animated carousel on the left (doctor images, auto-rotating, floating animation) and a clean login form on the right (Hospital ID + Password, MFA flow, "Create New Account" option).
- **Modern Registration Form**: Offers a clean, essential signup experience with a 3-step progress indicator (Profile → Verification → Complete). Includes modern date pickers, real-time validation, consent checkboxes, guardian fields for minors, and professional tooltips.
- **Extended Profile (Optional)**: Comprehensive patient data collection including Blood Group, Government ID (Type + Number), Occupation, Marital Status (with conditional Spouse Name), Present/Permanent Addresses (with "Same as Present" checkbox), Emergency Contact (Name + Phone with international format), and Source of Patient (with conditional Referral fields for Name + Phone).
- **MFA Setup**: Supports Authenticator App (TOTP), SMS OTP, and Email OTP, with progressive setup flows and method-specific UI.
- **Welcome Screen**: A professional post-registration welcome screen displaying patient name and Health ID, along with onboarding information and security assurance.
- **UI Simplification**: Sequential top-to-bottom field layout (Title → First Name → Last Name → DOB → Gender), compact spacing, fixed double calendar icon issue, and "Back to Sign-In" link for easy navigation.
- **Performance Optimized**: All authentication flows use fast client-side navigation (router.push) instead of slow full-page reloads, providing instant page transitions with useTransition for non-blocking UI updates.

**Technical Implementations:**
- **Identity Schema**: UPI-first approach with dedicated tables for users, credentials, and verification evidence, using Argon2id for password hashing.
- **Auth Service API**: REST endpoints for UPI validation, token exchange, EMPI matching, and staff operations, all with HIPAA audit logging.
- **JWT Authentication System**: Centralized `JwtService` for access and refresh token generation and validation, with secure storage and account lockout enforcement.
- **De-duplication**: CDC-compliant patient identity management with strategic indexes for fast de-duplication.
- **Hybrid Authentication System**: Supports UPI, Phone (OTP), Email (OTP), and Social Sign-In (OAuth) with EMPI matching.
- **Session Management**: Secure HTTP-only cookie authentication with session revocation.
- **HIPAA Compliance**: PHI stored in PostgreSQL; authentication-only data in Entra External ID.

**System Design Choices:**
- **Monorepo**: For shared code, consistent tooling, and simplified dependency management.
- **Microservices**: For independent development, deployment, and scaling.
- **Azure Integration**: Azure-ready with Bicep templates.
- **Security by Design**: Incorporates HIPAA audit logging, robust session management, and rate limiting.
- **Extensible Authentication**: Migration to Microsoft Entra External ID with Custom Authentication Extensions.

## External Dependencies
- **Microsoft Entra External ID**: For identity and access management.
- **Microsoft Graph API**: For Entra External ID user provisioning and management.
- **Twilio**: For SMS OTP delivery.
- **Google reCAPTCHA v3**: For bot protection.
- **PostgreSQL**: Primary relational database.
- **Drizzle ORM**: For interacting with PostgreSQL.
- **libphonenumber-js**: For phone number formatting and validation.
- **Expo**: For React Native mobile application development.
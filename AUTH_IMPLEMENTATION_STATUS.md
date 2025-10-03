# Eye Hospital Authentication Implementation Status

**Last Updated**: October 3, 2025  
**Architecture**: Microsoft Entra External ID + Custom UI + HIPAA-Compliant PostgreSQL

---

## 🎯 **ARCHITECTURE OVERVIEW**

### **Core Principles**
1. ✅ **Custom UI**: Patient Portal maintains existing phone-first signup/signin UX
2. ✅ **Entra External ID**: Central authentication authority (HIPAA-compliant BAA)
3. ✅ **Passwordless**: OTP-based authentication (SMS + Email)
4. ✅ **Data Separation**: PHI in PostgreSQL, minimal identity data in Entra
5. ✅ **Family-Friendly**: Supports shared phone numbers via unique email identifiers

---

## 📊 **DATA STORAGE STRATEGY**

| **Data Type** | **Microsoft Entra External ID** | **PostgreSQL Database** |
|--------------|--------------------------------|------------------------|
| **Unique Identifier** | Email (real or system-generated) | `patient_id` (UUID) |
| **Phone Number** | ❌ No (can have duplicates in DB) | ✅ Yes (actual phone, nullable, can be shared) |
| **Email** | ✅ Yes (authentication identifier) | ✅ Yes (actual email, nullable) |
| **Name, DOB, Address** | ❌ No (HIPAA: No PHI in Entra!) | ✅ Yes (patient demographics) |
| **Medical Records** | ❌ No | ✅ Yes (ePHI) |
| **Roles & Permissions** | ✅ Yes (RBAC, custom claims) | ✅ Yes (app-specific roles) |
| **Audit Logs (Identity)** | ✅ Yes (sign-in logs) | ✅ Yes (data access logs) |

---

## 🏗️ **ENTRA EXTERNAL ID INFRASTRUCTURE**

### **Tenant Configuration**
```yaml
Tenant: eyehospitalext.ciamlogin.com
Tenant ID: b9337298-b6a4-4a97-9438-ad3a897b7d62
Region: US (HIPAA-compliant)
License: External ID (Free tier: 50K MAU)
```

### **App Registration**
```yaml
App Name: Eye Hospital Patient Portal
Client ID: 7d0d315b-b36a-44d9-bdbb-2d97af3829bc
Redirect URIs:
  - https://{replit-domain}/auth/callback
  - http://localhost:5000/auth/callback
```

### **Custom Authentication Extensions**

#### **1. OnAttributeCollectionSubmit (SMS OTP)**
```yaml
Extension ID: 6b187d41-ac5f-458b-85d6-dde93111580f
Event Listener ID: c32590bc-9164-4397-9362-27ec3f805d8e
Endpoint: https://{replit-domain}/api/extensions/onAttributeCollectionSubmit
Authentication: Bearer Token (JWT)
Token Issuer: b9337298-b6a4-4a97-9438-ad3a897b7d62.ciamlogin.com
Token Audience: 9f40b99c-5398-4580-b8cb-cd98d31e2dcf
Purpose: Send SMS OTP via Twilio during phone verification
Status: ✅ IMPLEMENTED (SMS sending works)
```

#### **2. OnTokenIssuanceStart (Custom Claims)**
```yaml
Extension ID: TBD
Endpoint: https://{replit-domain}/api/extensions/onTokenIssuanceStart
Purpose: Inject patient_id claim into JWT tokens
Status: ⚠️ PARTIALLY IMPLEMENTED
```

### **Authentication Methods Enabled**
- ✅ Email One-Time Passcode (built-in)
- ✅ Phone One-Time Passcode (via Twilio integration)
- ❌ Password authentication (disabled for passwordless flow)
- ❌ Social providers (Google, Facebook - not configured yet)

---

## 🔄 **SIGNUP FLOW**

### **Architecture Decision: Hybrid Email-Phone Model**

**Problem Solved**: Entra requires unique identifiers, but families share phones.

**Solution**: 
- If user provides email → use real email as identifier
- If user doesn't provide email → generate system email: `{phone}@patients.eyehospital.com`

### **Detailed Signup Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                    PATIENT PORTAL UI (/auth)                    │
│              Phone-first, Email-optional signup flow            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Phone Verification (SMS OTP)                           │
├─────────────────────────────────────────────────────────────────┤
│  UI Component: PhoneStep.tsx                                    │
│  Action: User enters phone number (e.g., 8919653433)           │
│                                                                 │
│  API Call:                                                      │
│  POST /api/auth/send-otp                                        │
│  Body: { phone: "+918919653433" }                              │
│                                                                 │
│  Backend Flow:                                                  │
│  1. Patient Portal → AuthService (port 8000)                   │
│  2. POST http://localhost:8000/signup/start                    │
│  3. AuthService generates OTP (6-digit)                        │
│  4. AuthService sends SMS via Twilio                           │
│  5. AuthService stores OTP hash in PostgreSQL (otp_attempt)    │
│                                                                 │
│  Response: { status: "otp_sent", expires_in: 300 }            │
│                                                                 │
│  ⚠️ CURRENT STATUS: Using AuthService, NOT Entra yet          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: OTP Verification                                       │
├─────────────────────────────────────────────────────────────────┤
│  UI Component: OtpStep.tsx                                      │
│  Action: User enters 6-digit OTP code                          │
│                                                                 │
│  API Call:                                                      │
│  POST /api/auth/verify-otp                                      │
│  Body: { phone: "+918919653433", otp: "123456" }              │
│                                                                 │
│  Backend Flow:                                                  │
│  1. Patient Portal → AuthService                               │
│  2. POST http://localhost:8000/signup/verify                   │
│  3. AuthService validates OTP hash                             │
│  4. Creates/fetches patient record in PostgreSQL               │
│  5. Generates link token (10-min TTL)                          │
│                                                                 │
│  Response:                                                      │
│  {                                                              │
│    status: "verified",                                         │
│    patientId: "uuid-xxx",                                      │
│    linkToken: "base64-token"                                   │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Email Verification (OPTIONAL)                          │
├─────────────────────────────────────────────────────────────────┤
│  Status: 🔴 NOT IMPLEMENTED YET                                │
│                                                                 │
│  Planned Flow:                                                  │
│  - If user provides email → Send Email OTP via Entra           │
│  - Use Entra's built-in Email OTP feature                      │
│  - Verify email ownership                                       │
│  - Store verified email in PostgreSQL                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Collect Demographics                                   │
├─────────────────────────────────────────────────────────────────┤
│  UI Component: ProfileStep.tsx                                  │
│  Status: 🟡 PARTIALLY IMPLEMENTED (needs HIPAA fields)         │
│                                                                 │
│  Fields to Collect:                                             │
│  - Full Name (mandatory)                                        │
│  - Date of Birth (mandatory)                                    │
│  - Email (optional if already provided, show if email signup)   │
│  - Address (optional)                                           │
│  - Additional demographics as needed                            │
│                                                                 │
│  Note: All PHI data stored in PostgreSQL, NOT Entra            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: Create Patient Record (PostgreSQL)                     │
├─────────────────────────────────────────────────────────────────┤
│  Status: 🔴 NOT IMPLEMENTED YET                                │
│                                                                 │
│  Database Operation:                                            │
│  INSERT INTO patient (                                          │
│    patient_id,        -- UUID (primary key)                    │
│    phone,             -- Actual phone (can be shared)          │
│    email,             -- Actual email (nullable)               │
│    full_name,         -- PHI                                   │
│    date_of_birth,     -- PHI                                   │
│    address,           -- PHI                                   │
│    status,            -- 'active'                              │
│    created_at,                                                  │
│    updated_at                                                   │
│  ) VALUES (...)                                                 │
│                                                                 │
│  Audit Log:                                                     │
│  INSERT INTO audit_log (                                        │
│    patient_id,                                                  │
│    action: 'patient_created',                                  │
│    details: { signup_method: 'phone_otp' }                     │
│  )                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 6: Create Entra User (Microsoft Graph API)                │
├─────────────────────────────────────────────────────────────────┤
│  Status: 🔴 NOT IMPLEMENTED YET                                │
│                                                                 │
│  Email Identifier Logic:                                        │
│  IF user_provided_email:                                        │
│    entra_email = user_provided_email                           │
│  ELSE:                                                          │
│    entra_email = f"{phone_number}@patients.eyehospital.com"   │
│                                                                 │
│  Microsoft Graph API Call:                                      │
│  POST https://graph.microsoft.com/v1.0/users                   │
│  {                                                              │
│    "accountEnabled": true,                                     │
│    "displayName": "{patient_id}",  // NOT PHI!                │
│    "userPrincipalName": "{entra_email}",                       │
│    "identities": [                                             │
│      {                                                          │
│        "signInType": "emailAddress",                           │
│        "issuer": "eyehospitalext.onmicrosoft.com",            │
│        "issuerAssignedId": "{entra_email}"                    │
│      }                                                          │
│    ]                                                            │
│  }                                                              │
│                                                                 │
│  Custom Extension Attribute (patient_id claim):                 │
│  PATCH https://graph.microsoft.com/v1.0/users/{userId}         │
│  {                                                              │
│    "extension_{appId}_patientId": "{patient_id_uuid}"         │
│  }                                                              │
│                                                                 │
│  ⚠️ CRITICAL: NO PHI stored in Entra (HIPAA compliance)       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 7: Account Created Successfully ✅                        │
├─────────────────────────────────────────────────────────────────┤
│  User State:                                                    │
│  - PostgreSQL: Full patient record with all PHI                │
│  - Entra: Minimal user with email identifier + patient_id      │
│  - Ready for passwordless sign-in                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 **SIGNIN FLOW**

### **Passwordless OTP Authentication**

```
┌─────────────────────────────────────────────────────────────────┐
│                    PATIENT PORTAL UI (/auth)                    │
│                   Passwordless Sign-In Flow                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: User Enters Identifier                                 │
├─────────────────────────────────────────────────────────────────┤
│  Status: 🔴 NOT IMPLEMENTED YET                                │
│                                                                 │
│  User Input Options:                                            │
│  - Email address (if provided during signup)                   │
│  - Phone number (system looks up associated email)             │
│                                                                 │
│  Backend Logic:                                                 │
│  IF user enters phone:                                          │
│    1. Query PostgreSQL for patient record by phone             │
│    2. Check if patient has real email → use it                 │
│    3. Else use system email: {phone}@patients.eyehospital.com │
│                                                                 │
│  Result: Email identifier for Entra authentication              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Send OTP via Entra                                     │
├─────────────────────────────────────────────────────────────────┤
│  Status: 🔴 NOT IMPLEMENTED YET                                │
│                                                                 │
│  OTP Method Selection:                                          │
│  - If real email → Email OTP (Entra built-in)                 │
│  - If system email OR user prefers SMS → SMS OTP (Twilio)     │
│                                                                 │
│  Entra Authentication Flow:                                     │
│  1. POST to Entra External ID OTP endpoint                     │
│  2. Entra sends OTP (email or triggers SMS webhook)            │
│  3. User receives code                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Verify OTP & Authenticate                              │
├─────────────────────────────────────────────────────────────────┤
│  Status: 🔴 NOT IMPLEMENTED YET                                │
│                                                                 │
│  User enters OTP code                                           │
│  → Entra validates OTP                                          │
│  → Entra issues JWT tokens:                                     │
│    - Access Token                                               │
│    - ID Token (with custom claims)                             │
│    - Refresh Token                                              │
│                                                                 │
│  JWT ID Token Claims:                                           │
│  {                                                              │
│    "sub": "{entra_user_id}",                                   │
│    "email": "{identifier_email}",                              │
│    "extension_patientId": "{patient_id_uuid}",  // CUSTOM      │
│    "iss": "https://b9337298...ciamlogin.com/...",             │
│    "aud": "7d0d315b-b36a-44d9-bdbb-2d97af3829bc"              │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Token Validation & Session Creation                    │
├─────────────────────────────────────────────────────────────────┤
│  Status: 🔴 NOT IMPLEMENTED YET                                │
│                                                                 │
│  Patient Portal Backend:                                        │
│  1. Validate JWT signature (JWKS from Entra)                   │
│  2. Verify issuer, audience, expiration                        │
│  3. Extract patient_id from custom claim                       │
│  4. Query PostgreSQL for patient demographics                  │
│  5. Create application session                                  │
│                                                                 │
│  Session Data:                                                  │
│  - patient_id (from JWT)                                       │
│  - Patient demographics (from PostgreSQL)                      │
│  - Permissions/roles                                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 5: User Authenticated ✅                                  │
├─────────────────────────────────────────────────────────────────┤
│  User sees personalized dashboard with:                         │
│  - Full name, demographics (from PostgreSQL)                   │
│  - Appointments, medical records (from PostgreSQL)             │
│  - All PHI securely retrieved from database                    │
│                                                                 │
│  Entra manages:                                                 │
│  - Authentication (identity verification)                       │
│  - Token lifecycle (access, refresh)                            │
│  - Audit logs (sign-in events)                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔌 **AUTH SERVICE ENDPOINTS**

### **Current AuthService (Port 8000)**

#### **1. Health Check**
```http
GET http://localhost:8000/health

Response:
{
  "status": "ok",
  "service": "temp-auth-service",
  "timestamp": "2025-10-03T12:00:00.000Z"
}
```

#### **2. Start OTP Flow**
```http
POST http://localhost:8000/signup/start

Request Body:
{
  "phone": "+918919653433"
}

Backend Actions:
1. Generate 6-digit OTP
2. Create HMAC hash with nonce
3. Store in otp_attempt table (5-min expiry)
4. Send SMS via Twilio
5. Log OTP to console (for testing)

Response:
{
  "status": "otp_sent",
  "expires_in": 300
}

Database:
INSERT INTO otp_attempt (
  phone, otp_hash, nonce, expires_at, 
  attempts, resend_count, status
) VALUES (...)
```

#### **3. Verify OTP**
```http
POST http://localhost:8000/signup/verify

Request Body:
{
  "phone": "+918919653433",
  "otp": "123456"
}

Backend Actions:
1. Fetch latest pending OTP for phone
2. Verify HMAC hash matches
3. Check expiration and attempt limits
4. Create/fetch patient record
5. Generate link token (10-min TTL)
6. Log audit trail

Response (Success):
{
  "status": "verified",
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "linkToken": "base64-encoded-token"
}

Response (Failure):
{
  "error": "invalid_otp",
  "attemptsLeft": 2
}

Database:
- UPDATE otp_attempt SET status = 'verified'
- INSERT INTO patient (if new)
- INSERT INTO link_token
- INSERT INTO audit_log
```

#### **4. Link Microsoft Account**
```http
POST http://localhost:8000/auth/link

Headers:
Authorization: Bearer {microsoft_access_token}

Request Body:
{
  "patientId": "550e8400-e29b-41d4-a716-446655440000",
  "linkToken": "base64-token"
}

Backend Actions:
1. Validate link token (not expired, not used)
2. Validate Microsoft JWT (mock validation currently)
3. Extract Microsoft OID from token
4. Create auth_identity record
5. Mark link token as used

Response:
{
  "status": "linked",
  "message": "Microsoft account successfully linked"
}

Database:
- INSERT INTO auth_identity (patient_id, provider, provider_subject)
- UPDATE link_token SET used = true
```

#### **5. Record Consent**
```http
POST http://localhost:8000/consent

Request Body:
{
  "consentType": "hipaa_privacy_notice",
  "version": "1.0",
  "accepted": true
}

Response:
{
  "status": "consent_recorded",
  "message": "Your consent preferences have been recorded"
}

Status: 🟡 IMPLEMENTED (no database storage yet)
```

---

## 🔌 **PATIENT PORTAL API ROUTES**

### **Authentication Proxies**

#### **1. Send OTP Proxy**
```typescript
// apps/patient-portal-web/src/app/api/auth/send-otp/route.ts
POST /api/auth/send-otp

Flow:
1. Receives request from PhoneStep component
2. Proxies to AuthService: http://localhost:8000/signup/start
3. Returns response to UI

Status: ✅ IMPLEMENTED
```

#### **2. Verify OTP Proxy**
```typescript
// apps/patient-portal-web/src/app/api/auth/verify-otp/route.ts
POST /api/auth/verify-otp

Flow:
1. Receives request from OtpStep component
2. Proxies to AuthService: http://localhost:8000/signup/verify
3. Returns patient_id and linkToken to UI

Status: ✅ IMPLEMENTED
```

### **Entra Custom Extensions**

#### **3. OnAttributeCollectionSubmit**
```typescript
// apps/patient-portal-web/src/app/api/extensions/onAttributeCollectionSubmit/route.ts
POST /api/extensions/onAttributeCollectionSubmit

Triggered: When Entra user submits signup form

Request (from Entra):
{
  "type": "microsoft.graph.authenticationEvent.attributeCollectionSubmit",
  "data": {
    "userSignUpInfo": {
      "attributes": {
        "extension_5b89551d47314a0a80245dbb348c6875_MobileNumber": {
          "value": "8919653433"
        },
        "givenName": { "value": "Sam" },
        "surname": { "value": "Aluri" }
      }
    }
  }
}

Backend Logic:
1. Validate Bearer token (⚠️ currently disabled)
2. Extract phone number from attributes
3. Add +91 country code if missing
4. Generate 6-digit OTP
5. Send SMS via Twilio
6. Store OTP in entra_otp_attempts table

Response:
{
  "data": {
    "@odata.type": "microsoft.graph.onAttributeCollectionSubmitResponseData",
    "actions": [
      {
        "@odata.type": "microsoft.graph.attributeCollectionSubmit.continueWithDefaultBehavior"
      }
    ]
  }
}

Status: ✅ IMPLEMENTED (SMS sending works, token validation disabled)
Issues: 
- Response format causes Entra UI error (needs investigation)
- Token validation disabled due to jose library JWKS issues
```

#### **4. OnTokenIssuanceStart**
```typescript
// apps/patient-portal-web/src/app/api/extensions/onTokenIssuanceStart/route.ts
POST /api/extensions/onTokenIssuanceStart

Triggered: Before Entra issues JWT tokens

Purpose: Inject custom claims (patient_id)

Status: 🟡 PARTIALLY IMPLEMENTED (stub only)

Planned Response:
{
  "data": {
    "@odata.type": "microsoft.graph.onTokenIssuanceStartResponseData",
    "actions": [
      {
        "@odata.type": "microsoft.graph.tokenIssuanceStart.provideClaimsForToken",
        "claims": {
          "patient_id": "{uuid_from_database}"
        }
      }
    ]
  }
}
```

---

## 💾 **DATABASE SCHEMA**

### **PostgreSQL Tables**

#### **1. patient**
```sql
CREATE TABLE patient (
  patient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20),              -- Actual phone (can be shared)
  email VARCHAR(255),              -- Actual email (nullable)
  full_name VARCHAR(255),          -- PHI
  date_of_birth DATE,              -- PHI
  address TEXT,                    -- PHI (nullable)
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

Status: 🟡 EXISTS (needs HIPAA-compliant fields)
```

#### **2. otp_attempt**
```sql
CREATE TABLE otp_attempt (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(64) NOT NULL,
  nonce VARCHAR(24) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  resend_count INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

Status: ✅ IMPLEMENTED
```

#### **3. entra_otp_attempts**
```sql
CREATE TABLE entra_otp_attempts (
  id SERIAL PRIMARY KEY,
  phone_number VARCHAR(20) NOT NULL,
  otp_code VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  attempts INTEGER DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

Status: ✅ IMPLEMENTED (for Entra Custom Extension)
```

#### **4. link_token**
```sql
CREATE TABLE link_token (
  id SERIAL PRIMARY KEY,
  patient_id UUID REFERENCES patient(patient_id),
  token_hash VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP
);

Status: ✅ IMPLEMENTED
```

#### **5. auth_identity**
```sql
CREATE TABLE auth_identity (
  id SERIAL PRIMARY KEY,
  patient_id UUID REFERENCES patient(patient_id),
  provider VARCHAR(50) NOT NULL,      -- 'Microsoft', 'Google', etc.
  provider_subject VARCHAR(255) NOT NULL,  -- OID from provider
  verified_at TIMESTAMP,
  is_primary BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

Status: ✅ IMPLEMENTED
```

#### **6. audit_log**
```sql
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  patient_id UUID REFERENCES patient(patient_id),
  actor VARCHAR(255),              -- User/system performing action
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

Status: ✅ IMPLEMENTED
```

---

## 🔐 **SECRETS & ENVIRONMENT VARIABLES**

### **Replit Secrets (Configured)**
```bash
# Database
DATABASE_URL=postgresql://...
PGHOST=...
PGPORT=5432
PGUSER=...
PGPASSWORD=...
PGDATABASE=...

# Twilio SMS
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=+1...

# OTP Security
OTP_HMAC_SECRET=...
LINK_TOKEN_HMAC_SECRET=...

# Azure/Entra (Public - Safe to expose)
NEXT_PUBLIC_AZURE_CLIENT_ID=7d0d315b-b36a-44d9-bdbb-2d97af3829bc
NEXT_PUBLIC_AZURE_TENANT_ID=b9337298-b6a4-4a97-9438-ad3a897b7d62
```

### **Missing Secrets (Needed for Implementation)**
```bash
# Microsoft Graph API
AZURE_CLIENT_SECRET=...          # For server-side Graph API calls
AZURE_GRAPH_SCOPE=https://graph.microsoft.com/.default

# Custom Extension Authentication
EXTENSION_CLIENT_ID=...          # For validating Entra webhook tokens
EXTENSION_CLIENT_SECRET=...
```

---

## 📋 **IMPLEMENTATION STATUS**

### ✅ **COMPLETED**
1. ✅ Entra External ID tenant setup (eyehospitalext.ciamlogin.com)
2. ✅ Custom Authentication Extension for SMS OTP (OnAttributeCollectionSubmit)
3. ✅ Twilio SMS integration (OTP delivery working)
4. ✅ Phone number E.164 formatting (auto +91 for India)
5. ✅ AuthService OTP flow (start → verify → link)
6. ✅ Patient Portal UI components (PhoneStep, OtpStep, ProfileStep)
7. ✅ PostgreSQL schema (patient, otp_attempt, auth_identity, audit_log)
8. ✅ API proxy routes (send-otp, verify-otp)

### 🟡 **PARTIALLY IMPLEMENTED**
1. 🟡 Token validation (disabled due to jose library JWKS issues)
2. 🟡 OnTokenIssuanceStart extension (stub exists, needs custom claims logic)
3. 🟡 Patient demographics collection (UI exists, needs HIPAA fields)
4. 🟡 ProfileStep (basic implementation, needs DOB, address fields)

### 🔴 **NOT IMPLEMENTED (PENDING)**
1. 🔴 Email OTP flow via Entra (built-in)
2. 🔴 System-generated email for phone-only users (`{phone}@patients.eyehospital.com`)
3. 🔴 Microsoft Graph API integration (create users, add custom attributes)
4. 🔴 Custom claims injection (patient_id in JWT)
5. 🔴 Passwordless sign-in flow (OTP each time)
6. 🔴 JWT token validation in Patient Portal (JWKS endpoint resolution)
7. 🔴 Session management (token refresh, logout)
8. 🔴 Account recovery mechanisms
9. 🔴 Account lockout after failed attempts
10. 🔴 HIPAA audit logging (comprehensive)
11. 🔴 Consent management (HIPAA privacy notice)
12. 🔴 MFA enforcement policies
13. 🔴 Conditional Access configuration

---

## 🚨 **KNOWN ISSUES**

### **1. Entra Custom Extension Response Error**
- **Problem**: After successful SMS OTP send, Entra UI shows "Something went wrong"
- **Root Cause**: Response format may not match Entra's exact specification
- **Status**: Investigating Microsoft's undocumented response requirements
- **Workaround**: OTP is sent successfully, user can still receive codes

### **2. Token Validation Disabled**
- **Problem**: Jose library can't fetch JWKS from Entra endpoint
- **Root Cause**: Next.js serverless environment + JWKS URL resolution issues
- **Impact**: Custom Extension webhooks accept any Bearer token (insecure)
- **Status**: Temporarily disabled for testing, MUST fix for production

### **3. Database Connection Instability**
- **Problem**: Auth Service shows frequent reconnection attempts
- **Root Cause**: PostgreSQL connection timeouts in Replit environment
- **Impact**: Occasional request failures
- **Mitigation**: Retry logic implemented, but not ideal

---

## 🎯 **NEXT STEPS (Priority Order)**

### **Phase 1: Complete Signup Flow**
1. Add Email OTP option via Entra built-in
2. Implement system-generated emails for phone-only users
3. Add HIPAA-compliant demographic fields (DOB, address)
4. Integrate Microsoft Graph API to create Entra users
5. Implement custom claims (patient_id) via OnTokenIssuanceStart
6. Store all demographics in PostgreSQL

### **Phase 2: Implement Sign-In Flow**
1. Build sign-in UI (email/phone identifier entry)
2. Integrate with Entra passwordless OTP authentication
3. Implement JWT token validation (fix JWKS issue)
4. Extract patient_id from custom claims
5. Fetch patient data from PostgreSQL
6. Create application session

### **Phase 3: Security & Compliance**
1. Fix Custom Extension token validation
2. Enable Conditional Access policies
3. Implement comprehensive audit logging
4. Add account recovery (email/SMS based)
5. Add account lockout mechanisms
6. HIPAA compliance review

### **Phase 4: Production Readiness**
1. Enable MFA enforcement
2. Set up monitoring and alerting
3. Performance optimization
4. Security penetration testing
5. HIPAA compliance certification

---

## 📚 **ARCHITECTURE DECISIONS**

### **Why Hybrid Email-Phone Model?**
- **Problem**: Entra requires unique identifiers, families share phones
- **Solution**: System-generated emails (`{phone}@patients.eyehospital.com`) ensure uniqueness
- **Benefit**: Supports shared phones while maintaining Entra compatibility

### **Why Passwordless OTP?**
- **HIPAA**: Reduces password-related breaches (80% of attacks)
- **UX**: Better patient experience (no complex passwords to remember)
- **Security**: OTP + phone/email possession = strong 2-factor authentication

### **Why Separate PHI from Entra?**
- **HIPAA Compliance**: Entra is for authentication, NOT PHI storage
- **Microsoft Guidance**: "Do NOT store PHI in Entra attributes"
- **Data Sovereignty**: Full control over patient data in own database

### **Why Custom Authentication Extensions?**
- **Flexibility**: Integrate existing Twilio SMS infrastructure
- **Control**: Manage OTP logic, rate limiting, custom validation
- **Future-proof**: Can add email providers, custom branding

---

## 🔗 **USEFUL LINKS**

- **Entra Admin Portal**: https://entra.microsoft.com
- **Azure Portal**: https://portal.azure.com
- **Microsoft Graph Explorer**: https://developer.microsoft.com/en-us/graph/graph-explorer
- **Entra External ID Docs**: https://learn.microsoft.com/en-us/entra/external-id/
- **Custom Extensions Guide**: https://learn.microsoft.com/en-us/entra/external-id/customers/concept-custom-extensions
- **HIPAA Compliance Guide**: https://learn.microsoft.com/en-us/entra/standards/hipaa-configure-for-compliance

---

**End of Implementation Status Document**

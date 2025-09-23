# Eye Hospital Management System - Complete Database Schema & Consent Storage

## Overview
The system uses **PostgreSQL** as the primary database with a **dual ORM approach**:
- **Entity Framework Core** (.NET) for the Authentication Service
- **Drizzle ORM** (TypeScript) for Next.js applications

## Authentication Service Tables (.NET Entity Framework)

### 1. `patient` table
Core patient identity table used by the authentication service.

```sql
CREATE TABLE patient (
    patient_id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    email varchar(255) UNIQUE,
    phone varchar(30) NOT NULL UNIQUE,
    full_name varchar(255),
    dob timestamp,
    mrn_encrypted bytea,  -- Medical Record Number (encrypted)
    status varchar(50) NOT NULL DEFAULT 'active',
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_patient_phone ON patient(phone);
CREATE UNIQUE INDEX idx_patient_email ON patient(email);
```

### 2. `auth_identity` table
Links external authentication providers (Microsoft Azure AD) to patient accounts.

```sql
CREATE TABLE auth_identity (
    id bigserial PRIMARY KEY,
    patient_id uuid REFERENCES patient(patient_id) ON DELETE CASCADE,
    provider varchar(50) NOT NULL,  -- 'Microsoft', 'Google', etc.
    provider_subject varchar(255) NOT NULL,  -- OAuth subject ID
    verified_at timestamp,
    is_primary boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    last_used_at timestamp,
    created_at timestamp NOT NULL DEFAULT now()
);

-- Indexes
CREATE UNIQUE INDEX idx_auth_identity_provider_subject ON auth_identity(provider, provider_subject);
```

### 3. `otp_attempt` table
SMS OTP verification attempts for phone-based authentication.

```sql
CREATE TABLE otp_attempt (
    id bigserial PRIMARY KEY,
    phone varchar(30) NOT NULL,
    otp_hash varchar(255),  -- HMAC-SHA256 hash of OTP
    nonce varchar(255),     -- Random nonce for HMAC
    expires_at timestamp,
    attempts integer NOT NULL DEFAULT 0,
    resend_count integer NOT NULL DEFAULT 0,
    status varchar(20) NOT NULL DEFAULT 'pending',  -- pending, verified, expired, failed
    created_at timestamp NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_otp_phone ON otp_attempt(phone);
```

### 4. `consent` table
**HIPAA-compliant consent management** with versioning and audit trail.

```sql
CREATE TABLE consent (
    id bigserial PRIMARY KEY,
    patient_id uuid REFERENCES patient(patient_id) ON DELETE CASCADE,
    consent_type varchar(100) NOT NULL,  -- 'privacy_policy', 'terms_of_service', 'data_sharing', etc.
    version varchar(20) NOT NULL,        -- Version of the consent document
    consent_text_hash varchar(255) NOT NULL,  -- SHA256 hash of consent text for integrity
    accepted boolean NOT NULL DEFAULT false,
    accepted_at timestamp,
    revoked_at timestamp,
    accepted_ip varchar(45),             -- IPv4/IPv6 address
    accepted_user_agent text,            -- Browser/device information
    created_at timestamp NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_consent_patient ON consent(patient_id);
CREATE INDEX idx_consent_type_version ON consent(consent_type, version);
```

### 5. `device` table
Registered devices for multi-device authentication.

```sql
CREATE TABLE device (
    id bigserial PRIMARY KEY,
    patient_id uuid REFERENCES patient(patient_id) ON DELETE CASCADE,
    device_id varchar(255) NOT NULL,    -- Unique device identifier
    device_public_key text,             -- Public key for device-based auth
    display_name varchar(100),          -- User-friendly device name
    registered_at timestamp NOT NULL DEFAULT now(),
    last_used_at timestamp,
    status varchar(20) NOT NULL DEFAULT 'active'  -- active, revoked
);

-- Indexes
CREATE INDEX idx_device_patient ON device(patient_id);
```

### 6. `audit_log` table
**Comprehensive audit logging** for compliance and security monitoring.

```sql
CREATE TABLE audit_log (
    id bigserial PRIMARY KEY,
    patient_id uuid,                    -- May be null for system events
    actor varchar(255),                 -- User ID, system, or service name
    action varchar(100) NOT NULL,       -- Action performed
    details text,                       -- JSON details of the action
    ip varchar(45),                     -- Source IP address
    user_agent text,                    -- Browser/client information
    created_at timestamp NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_audit_patient_created ON audit_log(patient_id, created_at);
CREATE INDEX idx_audit_action ON audit_log(action);
```

### 7. `link_token` table
**Secure account linking** between SMS-verified accounts and OAuth providers.

```sql
CREATE TABLE link_token (
    id bigserial PRIMARY KEY,
    patient_id uuid NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    token_hash varchar(512) NOT NULL,   -- HMAC-SHA256 hash of token
    created_at timestamp NOT NULL DEFAULT now(),
    expires_at timestamp NOT NULL,      -- Short TTL (10 minutes)
    used boolean NOT NULL DEFAULT false,
    used_at timestamp
);

-- Indexes
CREATE INDEX idx_linktoken_patient ON link_token(patient_id);
CREATE INDEX idx_linktoken_expires ON link_token(expires_at);
```

## Patient Portal Application Tables (Drizzle ORM)

### 8. `users` table
Extended user management for the patient portal application.

```sql
CREATE TABLE users (
    id serial PRIMARY KEY,
    email varchar(255) NOT NULL UNIQUE,
    password varchar(255) NOT NULL,
    first_name varchar(100) NOT NULL,
    last_name varchar(100) NOT NULL,
    phone varchar(20),
    role varchar(50) NOT NULL DEFAULT 'patient',  -- patient, doctor, admin, staff
    is_active boolean DEFAULT true,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);
```

### 9. `patients` table (Portal Extension)
Patient-specific information extending the core patient data.

```sql
CREATE TABLE patients (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id),
    date_of_birth timestamp,
    gender varchar(20),
    address text,
    emergency_contact varchar(255),
    emergency_phone varchar(20),
    insurance_provider varchar(100),
    insurance_id varchar(100),
    medical_history text,
    allergies text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);
```

### 10. `doctors` table

```sql
CREATE TABLE doctors (
    id serial PRIMARY KEY,
    user_id integer NOT NULL REFERENCES users(id),
    specialization varchar(100) NOT NULL,
    license_number varchar(50) NOT NULL UNIQUE,
    years_experience integer,
    education text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);
```

### 11. `appointments` table

```sql
CREATE TABLE appointments (
    id serial PRIMARY KEY,
    patient_id integer NOT NULL REFERENCES patients(id),
    doctor_id integer NOT NULL REFERENCES doctors(id),
    appointment_date timestamp NOT NULL,
    duration integer DEFAULT 30,  -- minutes
    status varchar(50) NOT NULL DEFAULT 'scheduled',  -- scheduled, confirmed, cancelled, completed, no_show
    reason text,
    notes text,
    confirmation_sent boolean DEFAULT false,
    reminder_sent boolean DEFAULT false,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);
```

### 12. `medical_records` table

```sql
CREATE TABLE medical_records (
    id serial PRIMARY KEY,
    patient_id integer NOT NULL REFERENCES patients(id),
    doctor_id integer NOT NULL REFERENCES doctors(id),
    appointment_id integer REFERENCES appointments(id),
    record_date timestamp NOT NULL,
    diagnosis text,
    treatment text,
    prescription text,
    notes text,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);
```

### 13. `billing_records` table

```sql
CREATE TABLE billing_records (
    id serial PRIMARY KEY,
    patient_id integer NOT NULL REFERENCES patients(id),
    appointment_id integer REFERENCES appointments(id),
    amount decimal(10,2) NOT NULL,
    status varchar(50) NOT NULL DEFAULT 'pending',  -- pending, paid, failed, refunded
    payment_method varchar(50),
    stripe_payment_id varchar(255),
    invoice_number varchar(100),
    due_date timestamp,
    paid_at timestamp,
    created_at timestamp DEFAULT now(),
    updated_at timestamp DEFAULT now()
);
```

### 14. `webhook_logs` table
Integration webhook logging for external services.

```sql
CREATE TABLE webhook_logs (
    id serial PRIMARY KEY,
    type varchar(50) NOT NULL,  -- sms, billing, appointment, insurance
    source varchar(100),        -- twilio, stripe, etc.
    payload text,              -- JSON payload (PHI-protected)
    status varchar(50) NOT NULL DEFAULT 'received',  -- received, processed, failed
    error_message text,
    created_at timestamp DEFAULT now()
);
```

## Consent Management System

### HIPAA-Compliant Consent Storage
The `consent` table provides enterprise-grade consent management:

#### Key Features:
1. **Versioning**: Each consent type can have multiple versions
2. **Integrity**: SHA256 hash ensures consent text hasn't been tampered with
3. **Audit Trail**: IP address, user agent, and timestamps for legal compliance
4. **Revocation Support**: Patients can revoke consent with timestamp tracking
5. **Multiple Types**: Support for various consent categories

#### Consent Types:
- `privacy_policy`: HIPAA privacy policy consent
- `terms_of_service`: Application terms of service
- `data_sharing`: Third-party data sharing consent
- `marketing`: Marketing communications consent
- `research`: Medical research participation consent

#### Example Consent Flow:
```sql
-- Insert new consent acceptance
INSERT INTO consent (
    patient_id,
    consent_type,
    version,
    consent_text_hash,
    accepted,
    accepted_at,
    accepted_ip,
    accepted_user_agent
) VALUES (
    'patient-uuid-here',
    'privacy_policy',
    'v2.1',
    'sha256-hash-of-consent-text',
    true,
    now(),
    '192.168.1.100',
    'Mozilla/5.0...'
);
```

## Security Features

### 1. **Cryptographic Security**
- All OTP tokens stored as HMAC-SHA256 hashes
- Link tokens use secure random generation + HMAC
- Consent text integrity verified with SHA256 hashes
- Encrypted MRN storage in patient table

### 2. **Audit Logging**
Every significant action is logged with:
- Patient ID (when applicable)
- Actor (user, system, or service)
- Action type and details
- IP address and user agent
- Precise timestamp

### 3. **Rate Limiting** 
- Redis-based rate limiting for OTP requests
- IP-based and phone-based limits
- Prevents brute force attacks

### 4. **Token Security**
- Short-lived link tokens (10-minute TTL)
- One-time use tokens (marked as used)
- Automatic cleanup of expired tokens

## Integration Points

### 1. **Authentication Flow**
1. SMS OTP verification → `otp_attempt` table
2. Patient record creation → `patient` table  
3. Link token generation → `link_token` table
4. Microsoft OAuth linking → `auth_identity` table
5. Audit logging → `audit_log` table

### 2. **Data Synchronization**
The system maintains consistency between:
- Auth service patient records (`patient` table)
- Portal application user records (`users`/`patients` tables)
- Cross-references via phone number or linked OAuth identity

### 3. **Compliance Features**
- **HIPAA**: Audit logs, consent management, encrypted PHI
- **GDPR**: Right to be forgotten, consent revocation, data portability
- **SOC 2**: Access controls, audit trails, encryption at rest

This comprehensive database schema supports a production-ready healthcare management platform with enterprise-grade security, compliance, and scalability features.
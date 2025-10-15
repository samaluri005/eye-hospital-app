# Eye Hospital Management System - Database Setup

## 📋 Overview

This directory contains all database scripts for the Eye Hospital Management System with CDC-compliant EMPI duplicate detection, HIPAA audit logging, and enhanced patient registration flow.

## 🗂️ Script Files

### 1. **01_create_tables.sql**
Creates all database tables including:
- Patient table with CDC/EMPI fields
- Authentication & session management
- Healthcare operational tables (doctors, appointments, medical records, billing)
- CDC de-duplication tables
- Government ID verification
- Consent management
- HIPAA audit logging
- Phase 1 identity architecture (UPI-first)

### 2. **02_consent_setup.sql**
Sets up the consent management framework:
- 4 required consent types (Terms, Privacy, HIPAA, Authorization)
- Helper functions for consent recording and revocation
- Consent audit reporting views
- HIPAA audit integration

### 3. **03_mfa_security_setup.sql**
Configures Multi-Factor Authentication:
- Support for 3 MFA methods (TOTP, SMS OTP, Email OTP)
- MFA verification attempt tracking
- Account lockout protection
- Guardian relationship management for minors
- Security statistics and monitoring

## 🚀 Quick Start

### Option 1: Using Replit Database (Recommended)

If you're using Replit's built-in PostgreSQL database, use the database tools:

```bash
# Push schema changes using Drizzle
npm run db:push
```

If you encounter data-loss warnings:
```bash
npm run db:push --force
```

### Option 2: Execute SQL Scripts Directly

If you want to execute the raw SQL scripts:

1. **Connect to your PostgreSQL database**:
```bash
psql $DATABASE_URL
```

2. **Execute scripts in order**:
```bash
# Script 1: Create all tables
psql $DATABASE_URL -f database/01_create_tables.sql

# Script 2: Setup consent management
psql $DATABASE_URL -f database/02_consent_setup.sql

# Script 3: Setup MFA and security
psql $DATABASE_URL -f database/03_mfa_security_setup.sql
```

### Option 3: One-Command Execution

Execute all scripts at once:
```bash
cat database/01_create_tables.sql database/02_consent_setup.sql database/03_mfa_security_setup.sql | psql $DATABASE_URL
```

## 📊 Database Schema Overview

### Core Tables

#### Patient Table
- **CDC-compliant fields**: Standardized names, phones, addresses
- **EMPI scoring**: Duplicate detection with similarity scores
- **Government ID verification**: Aadhaar, passport, voter ID, etc.
- **Demographics**: Title, gender, guardian info for minors
- **Medical data**: Blood group, allergies, medical history

#### Consent Management
- **patient_consents**: Stores all consent records
- **4 required consents**:
  - `terms_of_service`
  - `privacy_policy`
  - `hipaa_notice`
  - `health_information_authorization`

#### MFA Configuration
- **patient_mfa_config**: MFA settings per patient
- **3 supported methods**:
  - TOTP (Authenticator App)
  - SMS OTP
  - Email OTP
- **Security features**: Failed attempt tracking, account lockout

#### HIPAA Audit
- **hipaa_audit_log**: All PHI access logged
- **audit_log**: General system audit trail
- Immutable audit records for compliance

## 🔧 Helper Functions

### Consent Management

```sql
-- Record all 4 consents at registration
SELECT record_registration_consents('patient-uuid'::UUID, '192.168.1.1'::INET);

-- Check if patient has all consents
SELECT patient_has_all_consents('patient-uuid'::UUID);

-- Revoke a consent
SELECT revoke_patient_consent('patient-uuid'::UUID, 'terms_of_service', '192.168.1.1'::INET);
```

### MFA Setup

```sql
-- Enable TOTP MFA
SELECT enable_patient_mfa('patient-uuid'::UUID, 'totp', 'base32-secret-here');

-- Enable SMS MFA
SELECT enable_patient_mfa('patient-uuid'::UUID, 'sms', NULL, '+919876543210');

-- Enable Email MFA
SELECT enable_patient_mfa('patient-uuid'::UUID, 'email', NULL, NULL, 'patient@example.com');

-- Check if MFA is locked
SELECT is_mfa_locked('patient-uuid'::UUID);
```

## 📈 Useful Queries

### View all patients with consents
```sql
SELECT * FROM consent_audit_report;
```

### View MFA statistics
```sql
SELECT * FROM mfa_statistics;
```

### Find duplicate candidates
```sql
SELECT 
  a.upi as patient_a_upi,
  b.upi as patient_b_upi,
  dc.similarity_score,
  dc.status
FROM duplicate_candidates dc
JOIN patient a ON dc.patient_a_id = a.patient_id
JOIN patient b ON dc.patient_b_id = b.patient_id
WHERE dc.status = 'pending'
ORDER BY dc.similarity_score DESC;
```

### HIPAA audit report
```sql
SELECT 
  hal.timestamp,
  hal.action,
  p.upi,
  p.full_name,
  hal.actor_type,
  hal.ip_address,
  hal.hipaa_compliance_note
FROM hipaa_audit_log hal
LEFT JOIN patient p ON hal.patient_id = p.patient_id
ORDER BY hal.timestamp DESC
LIMIT 100;
```

## 🔐 Security Features

### Password & PIN Storage
- **Argon2id hashing** for passwords
- Separate salt storage
- Failed attempt tracking
- Account lockout after 5 failures

### Session Management
- HTTP-only cookie sessions
- Device fingerprinting
- IP address tracking
- Automatic session expiration

### Audit Logging
- All PHI access logged (HIPAA compliant)
- Immutable audit records
- IP address and user agent tracking
- Actor type identification (user/system/staff)

## 📝 Indexes

Performance indexes are automatically created for:
- Patient lookups (UPI, email, phone, DOB)
- Fuzzy name matching (trigram indexes)
- EMPI blocking keys
- Appointment scheduling
- HIPAA audit searches
- Session management

## ⚠️ Important Notes

1. **Data Loss Warning**: Running `npm run db:push --force` will drop and recreate tables. Use only in development.

2. **PHI Security**: All patient data is considered Protected Health Information (PHI). Ensure proper access controls.

3. **Backup**: Always backup your database before running migration scripts in production.

4. **Extensions Required**:
   - `uuid-ossp` - For UUID generation
   - `pg_trgm` - For trigram fuzzy matching

5. **Triggers**: Automatic `updated_at` triggers are set up for patient, doctors, appointments, medical_records, and billing_records tables.

## 🧪 Testing the Setup

After running the scripts, verify the setup:

```sql
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verify extensions
SELECT * FROM pg_extension;

-- Check functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- Verify indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;
```

## 📚 Related Documentation

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [CDC Patient Matching](https://www.cdc.gov/phin/resources/guides/patient-matching.html)
- [HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)

## 🆘 Troubleshooting

### Issue: Tables already exist
```sql
-- Drop all tables (⚠️ DESTRUCTIVE - Development only)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

### Issue: Extension not found
```bash
# Install PostgreSQL contrib package
sudo apt-get install postgresql-contrib
```

### Issue: Permission denied
```sql
-- Grant necessary permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

---

**Last Updated**: October 15, 2025  
**Version**: 1.0.0  
**Compatibility**: PostgreSQL 12+

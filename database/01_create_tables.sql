-- ============================================================================
-- EYE HOSPITAL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Generated: October 15, 2025
-- CDC-Compliant, HIPAA-Compliant Patient Identity Management
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For trigram similarity matching

-- ============================================================================
-- MAIN PATIENT TABLE (Enhanced with CDC/EMPI fields)
-- ============================================================================

CREATE TABLE IF NOT EXISTS patient (
  patient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Phase 1: UPI (Unique Patient Identifier)
  upi TEXT UNIQUE,
  
  -- Core Contact Information
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL, -- Primary phone for authentication (OTP)
  mobile VARCHAR(20), -- User-entered mobile number (optional)
  full_name VARCHAR(255),
  dob TIMESTAMP,
  mrn_encrypted TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- CDC De-Duplication Fields
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  middle_name VARCHAR(100),
  name_suffix VARCHAR(20), -- Mr, Mrs, Miss, Dr, etc.
  full_name_standardized VARCHAR(255),
  phone_standardized VARCHAR(20),
  address TEXT,
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'India',
  address_standardized TEXT,
  soundex_last_name VARCHAR(10),
  blocking_key VARCHAR(100),
  
  -- Entra External ID Integration
  entra_object_id VARCHAR(255) UNIQUE,
  system_email VARCHAR(255),
  email_verified_at TIMESTAMP,
  
  -- Government ID Verification
  govt_id_type VARCHAR(50), -- aadhaar, passport, voter_id, driving_license, pan_card
  govt_id_number VARCHAR(100),
  govt_id_verified BOOLEAN DEFAULT FALSE,
  trust_level VARCHAR(20) DEFAULT 'low', -- low, medium, high
  
  -- Demographics
  title VARCHAR(20), -- Mr, Mrs, Ms, Dr, Prof
  gender VARCHAR(20),
  guardian_name VARCHAR(255), -- For patients under 18
  guardian_relationship VARCHAR(50), -- Relationship with guardian
  emergency_contact VARCHAR(255),
  emergency_phone VARCHAR(20),
  
  -- Patient Classification & Visit Details
  patient_type VARCHAR(50), -- General, Insurer, Camp, etc.
  source_of_patient VARCHAR(50), -- General, Referral
  referral_name VARCHAR(255),
  referral_phone VARCHAR(20),
  
  -- Medical & Personal Details
  blood_group VARCHAR(10), -- A+, A-, B+, B-, O+, O-, AB+, AB-
  occupation VARCHAR(100),
  marital_status VARCHAR(20), -- Single, Married
  spouse_name VARCHAR(255),
  
  -- Address Management
  permanent_address JSONB, -- Structured permanent address
  
  -- Insurance
  insurance_provider VARCHAR(100),
  insurance_id VARCHAR(100),
  
  -- Medical
  medical_history TEXT,
  allergies TEXT,
  
  -- Security
  recaptcha_score DECIMAL(3, 2),
  
  -- Phase 1 PDF Requirements: EMPI & Verification
  addresses JSONB, -- Structured address data
  identifiers JSONB, -- Government IDs
  empi_score DECIMAL(5, 2), -- EMPI matching confidence score
  empi_status TEXT DEFAULT 'unknown', -- 'unknown', 'verified', 'duplicate_suspected', 'merged'
  verified_method TEXT, -- How identity was verified
  verified_by UUID, -- Staff user_id who verified identity
  verification_at TIMESTAMP -- When identity verification occurred
);

-- Create trigram index for fuzzy name matching
CREATE INDEX IF NOT EXISTS idx_patient_first_name_trgm ON patient USING gin (first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patient_last_name_trgm ON patient USING gin (last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_patient_full_name_trgm ON patient USING gin (full_name gin_trgm_ops);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_patient_upi ON patient(upi);
CREATE INDEX IF NOT EXISTS idx_patient_email ON patient(email);
CREATE INDEX IF NOT EXISTS idx_patient_phone ON patient(phone);
CREATE INDEX IF NOT EXISTS idx_patient_dob ON patient(dob);
CREATE INDEX IF NOT EXISTS idx_patient_blocking_key ON patient(blocking_key);
CREATE INDEX IF NOT EXISTS idx_patient_empi_status ON patient(empi_status);
CREATE INDEX IF NOT EXISTS idx_patient_govt_id ON patient(govt_id_type, govt_id_number);

-- ============================================================================
-- AUTHENTICATION & SESSION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_identity (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patient(patient_id),
  identity_provider VARCHAR(50) NOT NULL,
  provider_user_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS entra_otp_attempts (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  attempt_count INTEGER DEFAULT 0,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_attempt (
  id SERIAL PRIMARY KEY,
  phone VARCHAR(20) NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  attempt_count INTEGER DEFAULT 0,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS link_token (
  id SERIAL PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  patient_id UUID NOT NULL REFERENCES patient(patient_id),
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patient_sessions (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patient(patient_id),
  session_token VARCHAR(255) NOT NULL UNIQUE,
  device_fingerprint VARCHAR(255),
  device_info JSONB,
  ip_address INET,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS patient_pin (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL UNIQUE REFERENCES patient(patient_id),
  pin_hash VARCHAR(255) NOT NULL,
  salt VARCHAR(255) NOT NULL,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- AUDIT & COMPLIANCE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  patient_id UUID,
  action VARCHAR(100) NOT NULL,
  actor_id UUID,
  actor_type VARCHAR(50), -- 'user', 'system', 'staff'
  resource_type VARCHAR(50), -- 'patient', 'user', 'session', 'credential'
  resource_id UUID,
  ip_address VARCHAR(45),
  metadata JSONB, -- LEGACY
  meta JSONB, -- Flexible metadata storage
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hipaa_audit_log (
  id SERIAL PRIMARY KEY,
  patient_id UUID,
  action VARCHAR(100) NOT NULL,
  actor_id VARCHAR(255) NOT NULL,
  actor_type VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  accessed_data JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  hipaa_compliance_note TEXT
);

-- Create indexes for HIPAA audit searches
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_patient ON hipaa_audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_timestamp ON hipaa_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_action ON hipaa_audit_log(action);

-- ============================================================================
-- HEALTHCARE OPERATIONAL TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  specialization VARCHAR(100) NOT NULL,
  license_number VARCHAR(50) NOT NULL UNIQUE,
  years_experience INTEGER,
  education TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patient(patient_id),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id),
  appointment_date TIMESTAMP NOT NULL,
  duration INTEGER DEFAULT 30, -- minutes
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
  reason TEXT,
  notes TEXT,
  confirmation_sent BOOLEAN DEFAULT FALSE,
  reminder_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);

CREATE TABLE IF NOT EXISTS medical_records (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patient(patient_id),
  doctor_id INTEGER NOT NULL REFERENCES doctors(id),
  appointment_id INTEGER REFERENCES appointments(id),
  record_date TIMESTAMP NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  prescription TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_records (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patient(patient_id),
  appointment_id INTEGER REFERENCES appointments(id),
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50),
  stripe_payment_id VARCHAR(255),
  invoice_number VARCHAR(100),
  due_date TIMESTAMP,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- CDC DE-DUPLICATION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS duplicate_candidates (
  id SERIAL PRIMARY KEY,
  patient_a_id UUID NOT NULL REFERENCES patient(patient_id),
  patient_b_id UUID NOT NULL REFERENCES patient(patient_id),
  similarity_score INTEGER NOT NULL,
  blocking_key VARCHAR(100),
  match_details JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS duplicate_adjudication (
  id SERIAL PRIMARY KEY,
  patient_a_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
  patient_b_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
  decision VARCHAR(20) NOT NULL,
  adjudicated_by VARCHAR(255) NOT NULL,
  adjudicated_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS patient_merge_audit (
  id SERIAL PRIMARY KEY,
  source_patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE RESTRICT,
  target_patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE RESTRICT,
  merged_by VARCHAR(255) NOT NULL,
  merged_at TIMESTAMP DEFAULT NOW(),
  merge_data JSONB,
  can_unmerge BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- GOVERNMENT ID VERIFICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS patient_identity_documents (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patient(patient_id),
  document_type VARCHAR(50) NOT NULL,
  document_number_encrypted TEXT,
  document_number_last4 VARCHAR(4),
  document_file_url TEXT,
  verified_at TIMESTAMP,
  verified_via VARCHAR(50),
  verified_by VARCHAR(255),
  verification_status VARCHAR(20) DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- CONSENT MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS patient_consents (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patient(patient_id),
  consent_type VARCHAR(100) NOT NULL,
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP,
  revoked_at TIMESTAMP,
  consent_document_url TEXT,
  ip_address INET,
  signature_data TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patient_consents_patient ON patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_type ON patient_consents(consent_type);

-- ============================================================================
-- FAMILY / EMERGENCY ACCESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS family_access (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patient(patient_id),
  guardian_patient_id UUID NOT NULL REFERENCES patient(patient_id),
  relationship VARCHAR(50) NOT NULL,
  access_level VARCHAR(20) NOT NULL,
  approved_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  consent_document_url TEXT,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- PHASE 1: IDENTITY ARCHITECTURE TABLES (UPI-first)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(patient_id),
  display_name TEXT,
  email TEXT,
  phone_normalized TEXT,
  is_locked BOOLEAN DEFAULT FALSE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone_normalized);

CREATE TABLE IF NOT EXISTS credentials (
  credential_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  credential_type TEXT NOT NULL, -- 'password','pin','webauthn'
  password_hash TEXT,
  password_salt TEXT,
  pin_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_used_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS external_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_sub TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(provider, provider_sub)
);

CREATE UNIQUE INDEX IF NOT EXISTS external_identities_provider_sub_unique 
  ON external_identities(provider, provider_sub);

CREATE TABLE IF NOT EXISTS proxy_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
  delegate_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  granted_by_user_id UUID REFERENCES users(user_id),
  scopes JSONB,
  status TEXT DEFAULT 'active',
  start_at TIMESTAMP DEFAULT NOW(),
  end_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
  evidence_type TEXT,
  file_ref TEXT,
  hashed_name TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  retention_policy TEXT
);

CREATE TABLE IF NOT EXISTS staff_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(patient_id) ON DELETE CASCADE,
  invited_by_staff_id UUID,
  invite_token_hash TEXT,
  delivery_channel TEXT,
  expires_at TIMESTAMP,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empi_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patient(patient_id),
  empi_payload JSONB,
  score DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS merge_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_patient_id UUID REFERENCES patient(patient_id) ON DELETE RESTRICT,
  target_patient_id UUID REFERENCES patient(patient_id) ON DELETE RESTRICT,
  status TEXT DEFAULT 'open',
  created_by UUID,
  approved_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attempt_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_type TEXT,
  context_value TEXT,
  count INTEGER DEFAULT 0,
  last_attempt TIMESTAMP
);

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Audit log performance
CREATE INDEX IF NOT EXISTS idx_audit_patient ON audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);

-- Session management
CREATE INDEX IF NOT EXISTS idx_sessions_patient ON patient_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON patient_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON patient_sessions(expires_at);

-- Medical records
CREATE INDEX IF NOT EXISTS idx_medical_records_patient ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON medical_records(record_date);

-- Billing
CREATE INDEX IF NOT EXISTS idx_billing_patient ON billing_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing_records(status);

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_patient_updated_at BEFORE UPDATE ON patient
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_records_updated_at BEFORE UPDATE ON billing_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE patient IS 'Main patient table with CDC-compliant EMPI fields for duplicate detection';
COMMENT ON TABLE patient_consents IS 'HIPAA-compliant consent management with 4 required consent types';
COMMENT ON TABLE hipaa_audit_log IS 'Enhanced HIPAA audit logging for all PHI access';
COMMENT ON TABLE duplicate_candidates IS 'CDC duplicate detection candidates for manual review';
COMMENT ON TABLE users IS 'Phase 1: Authentication principals (patients and caregivers)';
COMMENT ON TABLE credentials IS 'Phase 1: Consolidated password/PIN/WebAuthn storage';
COMMENT ON TABLE external_identities IS 'Phase 1: Map Entra/social provider subjects to users';

-- ============================================================================
-- SEED DATA (OPTIONAL - For Development/Testing)
-- ============================================================================

-- Insert sample doctor for testing
INSERT INTO doctors (email, first_name, last_name, phone, specialization, license_number, years_experience, education)
VALUES 
  ('dr.sharma@eyecare.com', 'Rajesh', 'Sharma', '+919876543210', 'Ophthalmology', 'MCI-12345', 15, 'MBBS, MS (Ophthalmology)')
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SCRIPT COMPLETE
-- ============================================================================

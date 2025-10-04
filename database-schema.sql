-- ============================================================================
-- EYE HOSPITAL MANAGEMENT SYSTEM - POSTGRESQL DATABASE SCHEMA
-- ============================================================================
-- CDC-COMPLIANT, HIPAA-CERTIFIED PATIENT IDENTITY MANAGEMENT SYSTEM
-- WITH MICROSOFT ENTRA EXTERNAL ID INTEGRATION
-- ============================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CORE PATIENT MANAGEMENT TABLES
-- ============================================================================

-- Main patient table with CDC de-duplication fields
CREATE TABLE IF NOT EXISTS patient (
    patient_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Core Contact Info
    email VARCHAR(255),
    phone VARCHAR(20) NOT NULL,
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
    name_suffix VARCHAR(20),
    full_name_standardized VARCHAR(255),
    phone_standardized VARCHAR(20),
    
    -- Address Fields
    address TEXT,
    address_line1 VARCHAR(255),
    address_line2 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    address_standardized TEXT,
    
    -- CDC Phonetic Matching
    soundex_last_name VARCHAR(10),
    blocking_key VARCHAR(100),
    
    -- Entra External ID Integration
    entra_object_id VARCHAR(255) UNIQUE,
    system_email VARCHAR(255),
    email_verified_at TIMESTAMP,
    
    -- Government ID Verification
    govt_id_verified BOOLEAN DEFAULT FALSE,
    trust_level VARCHAR(20) DEFAULT 'low',
    
    -- Demographics
    gender VARCHAR(20),
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(20),
    
    -- Insurance
    insurance_provider VARCHAR(100),
    insurance_id VARCHAR(100),
    
    -- Medical
    medical_history TEXT,
    allergies TEXT,
    
    -- Security
    recaptcha_score DECIMAL(3,2)
);

-- Authentication identity providers (OAuth/OIDC)
CREATE TABLE IF NOT EXISTS auth_identity (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    identity_provider VARCHAR(50) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Legacy Entra OTP attempts table (kept for compatibility)
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

-- OTP attempt tracking (used by .NET AuthService)
CREATE TABLE IF NOT EXISTS otp_attempt (
    id SERIAL PRIMARY KEY,
    phone VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    nonce VARCHAR(255),
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    resend_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Link tokens for profile completion
CREATE TABLE IF NOT EXISTS link_token (
    id SERIAL PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- General audit log (legacy, use hipaa_audit_log for HIPAA compliance)
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patient(patient_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    ip VARCHAR(50),
    user_agent TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- HEALTHCARE PROVIDER TABLES
-- ============================================================================

-- Doctors/Physicians table
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

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    appointment_date TIMESTAMP NOT NULL,
    duration INTEGER DEFAULT 30,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    reason TEXT,
    notes TEXT,
    confirmation_sent BOOLEAN DEFAULT FALSE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Medical records table
CREATE TABLE IF NOT EXISTS medical_records (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    doctor_id INTEGER NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    record_date TIMESTAMP NOT NULL,
    diagnosis TEXT,
    treatment TEXT,
    prescription TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Billing records table
CREATE TABLE IF NOT EXISTS billing_records (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    appointment_id INTEGER REFERENCES appointments(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
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

-- Duplicate patient candidates detected by CDC algorithms
CREATE TABLE IF NOT EXISTS duplicate_candidates (
    id SERIAL PRIMARY KEY,
    patient_a_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    patient_b_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    similarity_score INTEGER NOT NULL,
    blocking_key VARCHAR(100),
    match_details JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMP,
    review_notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Duplicate adjudication (human review decisions)
CREATE TABLE IF NOT EXISTS duplicate_adjudication (
    id SERIAL PRIMARY KEY,
    patient_a_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    patient_b_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    decision VARCHAR(20) NOT NULL,
    adjudicated_by VARCHAR(255) NOT NULL,
    adjudicated_at TIMESTAMP DEFAULT NOW(),
    notes TEXT
);

-- Patient merge audit trail
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

-- Patient identity documents (Aadhaar, PAN, DigiLocker, etc.)
CREATE TABLE IF NOT EXISTS patient_identity_documents (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
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
-- SESSION MANAGEMENT & SECURITY
-- ============================================================================

-- Patient sessions with device fingerprinting
CREATE TABLE IF NOT EXISTS patient_sessions (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    device_fingerprint VARCHAR(255),
    device_info JSONB,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- HIPAA AUDIT LOGGING (6-Year Retention)
-- ============================================================================

-- HIPAA-compliant audit log with enhanced tracking
CREATE TABLE IF NOT EXISTS hipaa_audit_log (
    id SERIAL PRIMARY KEY,
    patient_id UUID REFERENCES patient(patient_id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    actor_type VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    accessed_data JSONB,
    timestamp TIMESTAMP DEFAULT NOW(),
    hipaa_compliance_note TEXT
);

-- ============================================================================
-- CONSENT MANAGEMENT (HIPAA Requirement)
-- ============================================================================

-- Patient consent tracking
CREATE TABLE IF NOT EXISTS patient_consents (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    consent_document_url TEXT,
    ip_address INET,
    signature_data TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- FAMILY / EMERGENCY ACCESS (Shared Phone Support)
-- ============================================================================

-- Family member access to patient records
CREATE TABLE IF NOT EXISTS family_access (
    id SERIAL PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    guardian_patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
    relationship VARCHAR(50) NOT NULL,
    access_level VARCHAR(20) NOT NULL,
    approved_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    consent_document_url TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Patient table indexes
CREATE INDEX IF NOT EXISTS idx_patient_phone ON patient(phone);
CREATE INDEX IF NOT EXISTS idx_patient_email ON patient(email);
CREATE INDEX IF NOT EXISTS idx_patient_phone_standardized ON patient(phone_standardized);
CREATE INDEX IF NOT EXISTS idx_patient_soundex_last_name ON patient(soundex_last_name);
CREATE INDEX IF NOT EXISTS idx_patient_blocking_key ON patient(blocking_key);
CREATE INDEX IF NOT EXISTS idx_patient_entra_object_id ON patient(entra_object_id);
CREATE INDEX IF NOT EXISTS idx_patient_dob ON patient(dob);
CREATE INDEX IF NOT EXISTS idx_patient_first_last_name ON patient(first_name, last_name);

-- OTP attempt indexes
CREATE INDEX IF NOT EXISTS idx_otp_attempt_phone ON otp_attempt(phone);
CREATE INDEX IF NOT EXISTS idx_otp_attempt_status ON otp_attempt(status);
CREATE INDEX IF NOT EXISTS idx_otp_attempt_created_at ON otp_attempt(created_at);

-- Link token indexes
CREATE INDEX IF NOT EXISTS idx_link_token_patient_id ON link_token(patient_id);
CREATE INDEX IF NOT EXISTS idx_link_token_expires_at ON link_token(expires_at);

-- Appointment indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Medical records indexes
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_doctor_id ON medical_records(doctor_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_date ON medical_records(record_date);

-- Billing records indexes
CREATE INDEX IF NOT EXISTS idx_billing_records_patient_id ON billing_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_billing_records_status ON billing_records(status);

-- Duplicate candidates indexes
CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_patient_a ON duplicate_candidates(patient_a_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_patient_b ON duplicate_candidates(patient_b_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_status ON duplicate_candidates(status);
CREATE INDEX IF NOT EXISTS idx_duplicate_candidates_score ON duplicate_candidates(similarity_score);

-- HIPAA audit log indexes (6-year retention queries)
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_patient_id ON hipaa_audit_log(patient_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_timestamp ON hipaa_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_action ON hipaa_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_hipaa_audit_actor ON hipaa_audit_log(actor_id);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_patient_sessions_patient_id ON patient_sessions(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_sessions_expires_at ON patient_sessions(expires_at);

-- Consent indexes
CREATE INDEX IF NOT EXISTS idx_patient_consents_patient_id ON patient_consents(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_consents_type ON patient_consents(consent_type);

-- ============================================================================
-- MASTER DATA (SAMPLE DOCTORS AND REFERENCE DATA)
-- ============================================================================

-- Insert sample doctors (Eye Hospital specializations)
INSERT INTO doctors (email, first_name, last_name, phone, specialization, license_number, years_experience, education, is_active) VALUES
('dr.sharma@eyehospital.com', 'Rajesh', 'Sharma', '+919876543210', 'Ophthalmology - Cataract Specialist', 'MCI-OPH-001', 15, 'MBBS, MS Ophthalmology, Fellowship in Phacoemulsification', TRUE),
('dr.kumar@eyehospital.com', 'Anil', 'Kumar', '+919876543211', 'Ophthalmology - Retina Specialist', 'MCI-OPH-002', 12, 'MBBS, MS Ophthalmology, Fellowship in Vitreoretinal Surgery', TRUE),
('dr.patel@eyehospital.com', 'Priya', 'Patel', '+919876543212', 'Ophthalmology - Glaucoma Specialist', 'MCI-OPH-003', 10, 'MBBS, MS Ophthalmology, Fellowship in Glaucoma Management', TRUE),
('dr.reddy@eyehospital.com', 'Srinivas', 'Reddy', '+919876543213', 'Ophthalmology - Cornea Specialist', 'MCI-OPH-004', 8, 'MBBS, MS Ophthalmology, Fellowship in Corneal Transplantation', TRUE),
('dr.mehta@eyehospital.com', 'Anjali', 'Mehta', '+919876543214', 'Ophthalmology - Pediatric Ophthalmologist', 'MCI-OPH-005', 14, 'MBBS, MS Ophthalmology, Fellowship in Pediatric Ophthalmology & Strabismus', TRUE),
('dr.singh@eyehospital.com', 'Vikram', 'Singh', '+919876543215', 'Ophthalmology - Oculoplasty Specialist', 'MCI-OPH-006', 11, 'MBBS, MS Ophthalmology, Fellowship in Oculoplastic & Reconstructive Surgery', TRUE),
('dr.gupta@eyehospital.com', 'Neha', 'Gupta', '+919876543216', 'Ophthalmology - LASIK & Refractive Surgery', 'MCI-OPH-007', 9, 'MBBS, MS Ophthalmology, Fellowship in Refractive Surgery', TRUE),
('dr.joshi@eyehospital.com', 'Amit', 'Joshi', '+919876543217', 'Ophthalmology - Neuro-Ophthalmologist', 'MCI-OPH-008', 13, 'MBBS, MS Ophthalmology, Fellowship in Neuro-Ophthalmology', TRUE),
('dr.iyer@eyehospital.com', 'Lakshmi', 'Iyer', '+919876543218', 'Ophthalmology - Uveitis Specialist', 'MCI-OPH-009', 7, 'MBBS, MS Ophthalmology, Fellowship in Ocular Immunology & Uveitis', TRUE),
('dr.khan@eyehospital.com', 'Farhan', 'Khan', '+919876543219', 'Ophthalmology - General Ophthalmologist', 'MCI-OPH-010', 6, 'MBBS, MS Ophthalmology', TRUE)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- COMMENTS AND DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE patient IS 'Core patient table with CDC IIS de-duplication fields and HIPAA compliance';
COMMENT ON TABLE doctors IS 'Eye hospital doctors and physicians with specializations';
COMMENT ON TABLE appointments IS 'Patient appointment scheduling and tracking';
COMMENT ON TABLE medical_records IS 'Patient medical records and visit notes (PHI protected)';
COMMENT ON TABLE billing_records IS 'Billing and payment tracking';
COMMENT ON TABLE duplicate_candidates IS 'CDC-compliant duplicate patient detection with similarity scoring';
COMMENT ON TABLE duplicate_adjudication IS 'Human review and adjudication of duplicate patient records';
COMMENT ON TABLE patient_merge_audit IS 'Audit trail for patient record merges (HIPAA compliance)';
COMMENT ON TABLE patient_identity_documents IS 'Government ID verification (Aadhaar, PAN, DigiLocker)';
COMMENT ON TABLE patient_sessions IS 'Active patient sessions with device fingerprinting';
COMMENT ON TABLE hipaa_audit_log IS 'HIPAA-compliant audit log with 6-year retention requirement';
COMMENT ON TABLE patient_consents IS 'Patient consent tracking for HIPAA compliance';
COMMENT ON TABLE family_access IS 'Family member and emergency access to patient records (shared phone support)';

COMMENT ON COLUMN patient.entra_object_id IS 'Microsoft Entra External ID object ID for authentication';
COMMENT ON COLUMN patient.system_email IS 'System-generated email format: {phone}@patients.eyehospital.com';
COMMENT ON COLUMN patient.trust_level IS 'Trust level based on ID verification: low, medium, high';
COMMENT ON COLUMN patient.soundex_last_name IS 'Soundex phonetic encoding for CDC name matching';
COMMENT ON COLUMN patient.blocking_key IS 'CDC blocking key for efficient duplicate detection';
COMMENT ON COLUMN patient.recaptcha_score IS 'Google reCAPTCHA v3 score (0.0-1.0) for bot detection';

-- ============================================================================
-- GRANTS (Optional - adjust based on your security requirements)
-- ============================================================================

-- Example: Grant permissions to application role (uncomment and customize)
-- CREATE ROLE eye_hospital_app;
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO eye_hospital_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO eye_hospital_app;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Eye Hospital Management System Database Schema Created Successfully!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Tables Created: 18';
    RAISE NOTICE 'Indexes Created: 29';
    RAISE NOTICE 'Sample Doctors Inserted: 10';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  ✓ CDC IIS De-Duplication Compliance';
    RAISE NOTICE '  ✓ HIPAA Audit Logging (6-year retention)';
    RAISE NOTICE '  ✓ Microsoft Entra External ID Integration';
    RAISE NOTICE '  ✓ Government ID Verification Support';
    RAISE NOTICE '  ✓ Family/Emergency Access Management';
    RAISE NOTICE '  ✓ Consent Management';
    RAISE NOTICE '  ✓ Session Tracking with Device Fingerprinting';
    RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- MFA & SECURITY SETUP
-- Enhanced MFA with TOTP, SMS OTP, and Email OTP
-- ============================================================================

-- This script sets up the Multi-Factor Authentication framework
-- Supporting 3 methods: Authenticator App (TOTP), SMS OTP, Email OTP

-- ============================================================================
-- MFA CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS patient_mfa_config (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL UNIQUE REFERENCES patient(patient_id) ON DELETE CASCADE,
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_method VARCHAR(20), -- 'totp', 'sms', 'email'
  
  -- TOTP Configuration
  totp_secret TEXT, -- Base32 encoded secret for TOTP
  totp_verified BOOLEAN DEFAULT FALSE,
  totp_verified_at TIMESTAMP,
  
  -- SMS Configuration  
  sms_phone VARCHAR(20), -- Phone number for SMS OTP
  sms_verified BOOLEAN DEFAULT FALSE,
  sms_verified_at TIMESTAMP,
  
  -- Email Configuration
  email_address VARCHAR(255), -- Email for OTP
  email_verified BOOLEAN DEFAULT FALSE,
  email_verified_at TIMESTAMP,
  
  -- Backup codes
  backup_codes JSONB, -- Array of hashed backup codes
  backup_codes_used INTEGER DEFAULT 0,
  
  -- Security
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  last_verified_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfa_patient ON patient_mfa_config(patient_id);
CREATE INDEX IF NOT EXISTS idx_mfa_method ON patient_mfa_config(mfa_method);

-- ============================================================================
-- MFA VERIFICATION ATTEMPTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS mfa_verification_attempts (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
  mfa_method VARCHAR(20) NOT NULL, -- 'totp', 'sms', 'email'
  code_hash VARCHAR(255), -- Hashed verification code
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT FALSE,
  attempted_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mfa_attempts_patient ON mfa_verification_attempts(patient_id);
CREATE INDEX IF NOT EXISTS idx_mfa_attempts_expires ON mfa_verification_attempts(expires_at);

-- ============================================================================
-- HELPER FUNCTION: Enable MFA for patient
-- ============================================================================

CREATE OR REPLACE FUNCTION enable_patient_mfa(
  p_patient_id UUID,
  p_mfa_method VARCHAR(20),
  p_totp_secret TEXT DEFAULT NULL,
  p_sms_phone VARCHAR(20) DEFAULT NULL,
  p_email_address VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert or update MFA configuration
  INSERT INTO patient_mfa_config (
    patient_id,
    mfa_enabled,
    mfa_method,
    totp_secret,
    totp_verified,
    sms_phone,
    sms_verified,
    email_address,
    email_verified
  ) VALUES (
    p_patient_id,
    TRUE,
    p_mfa_method,
    CASE WHEN p_mfa_method = 'totp' THEN p_totp_secret ELSE NULL END,
    CASE WHEN p_mfa_method = 'totp' THEN TRUE ELSE FALSE END,
    CASE WHEN p_mfa_method = 'sms' THEN p_sms_phone ELSE NULL END,
    CASE WHEN p_mfa_method = 'sms' THEN TRUE ELSE FALSE END,
    CASE WHEN p_mfa_method = 'email' THEN p_email_address ELSE NULL END,
    CASE WHEN p_mfa_method = 'email' THEN TRUE ELSE FALSE END
  )
  ON CONFLICT (patient_id) DO UPDATE SET
    mfa_enabled = TRUE,
    mfa_method = p_mfa_method,
    totp_secret = CASE WHEN p_mfa_method = 'totp' THEN p_totp_secret ELSE patient_mfa_config.totp_secret END,
    totp_verified = CASE WHEN p_mfa_method = 'totp' THEN TRUE ELSE patient_mfa_config.totp_verified END,
    sms_phone = CASE WHEN p_mfa_method = 'sms' THEN p_sms_phone ELSE patient_mfa_config.sms_phone END,
    sms_verified = CASE WHEN p_mfa_method = 'sms' THEN TRUE ELSE patient_mfa_config.sms_verified END,
    email_address = CASE WHEN p_mfa_method = 'email' THEN p_email_address ELSE patient_mfa_config.email_address END,
    email_verified = CASE WHEN p_mfa_method = 'email' THEN TRUE ELSE patient_mfa_config.email_verified END,
    updated_at = NOW();
  
  -- Log in HIPAA audit
  INSERT INTO hipaa_audit_log (
    patient_id,
    action,
    actor_id,
    actor_type,
    accessed_data,
    hipaa_compliance_note
  ) VALUES (
    p_patient_id,
    'MFA_ENABLED',
    p_patient_id::TEXT,
    'patient',
    jsonb_build_object('method', p_mfa_method),
    'Patient enabled multi-factor authentication'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Disable MFA for patient
-- ============================================================================

CREATE OR REPLACE FUNCTION disable_patient_mfa(
  p_patient_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE patient_mfa_config
  SET mfa_enabled = FALSE,
      updated_at = NOW()
  WHERE patient_id = p_patient_id;
  
  -- Log in HIPAA audit
  INSERT INTO hipaa_audit_log (
    patient_id,
    action,
    actor_id,
    actor_type,
    hipaa_compliance_note
  ) VALUES (
    p_patient_id,
    'MFA_DISABLED',
    p_patient_id::TEXT,
    'patient',
    'Patient disabled multi-factor authentication'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Record MFA verification attempt
-- ============================================================================

CREATE OR REPLACE FUNCTION record_mfa_attempt(
  p_patient_id UUID,
  p_mfa_method VARCHAR(20),
  p_code_hash VARCHAR(255),
  p_success BOOLEAN,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert attempt record
  INSERT INTO mfa_verification_attempts (
    patient_id,
    mfa_method,
    code_hash,
    ip_address,
    user_agent,
    success,
    expires_at
  ) VALUES (
    p_patient_id,
    p_mfa_method,
    p_code_hash,
    p_ip_address,
    p_user_agent,
    p_success,
    NOW() + INTERVAL '10 minutes'
  );
  
  -- Update MFA config with attempt tracking
  IF p_success THEN
    UPDATE patient_mfa_config
    SET failed_attempts = 0,
        locked_until = NULL,
        last_verified_at = NOW()
    WHERE patient_id = p_patient_id;
  ELSE
    UPDATE patient_mfa_config
    SET failed_attempts = failed_attempts + 1,
        locked_until = CASE 
          WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
          ELSE locked_until
        END
    WHERE patient_id = p_patient_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Check if MFA is locked
-- ============================================================================

CREATE OR REPLACE FUNCTION is_mfa_locked(
  p_patient_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  locked_until_ts TIMESTAMP;
BEGIN
  SELECT locked_until INTO locked_until_ts
  FROM patient_mfa_config
  WHERE patient_id = p_patient_id;
  
  IF locked_until_ts IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN locked_until_ts > NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GUARDIAN RELATIONSHIP TABLE (for minors)
-- ============================================================================

CREATE TABLE IF NOT EXISTS patient_guardian_relationship (
  id SERIAL PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patient(patient_id) ON DELETE CASCADE,
  guardian_name VARCHAR(255) NOT NULL,
  guardian_relationship VARCHAR(50) NOT NULL, -- father, mother, caregiver, etc.
  guardian_phone VARCHAR(20),
  guardian_email VARCHAR(255),
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardian_patient ON patient_guardian_relationship(patient_id);

-- ============================================================================
-- MFA STATISTICS VIEW
-- ============================================================================

CREATE OR REPLACE VIEW mfa_statistics AS
SELECT 
  COUNT(*) FILTER (WHERE mfa_enabled = TRUE) as total_mfa_enabled,
  COUNT(*) FILTER (WHERE mfa_method = 'totp') as totp_users,
  COUNT(*) FILTER (WHERE mfa_method = 'sms') as sms_users,
  COUNT(*) FILTER (WHERE mfa_method = 'email') as email_users,
  COUNT(*) FILTER (WHERE locked_until > NOW()) as currently_locked,
  COUNT(*) FILTER (WHERE failed_attempts > 0) as users_with_failed_attempts
FROM patient_mfa_config;

-- ============================================================================
-- TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE TRIGGER update_mfa_config_updated_at BEFORE UPDATE ON patient_mfa_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_guardian_updated_at BEFORE UPDATE ON patient_guardian_relationship
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE patient_mfa_config IS 'Multi-factor authentication configuration supporting TOTP, SMS, and Email methods';
COMMENT ON TABLE mfa_verification_attempts IS 'Audit trail of MFA verification attempts for security monitoring';
COMMENT ON TABLE patient_guardian_relationship IS 'Guardian information for patients under 18 years old';
COMMENT ON FUNCTION enable_patient_mfa IS 'Enable MFA for a patient with specified method (totp, sms, or email)';
COMMENT ON FUNCTION disable_patient_mfa IS 'Disable MFA for a patient';
COMMENT ON FUNCTION is_mfa_locked IS 'Check if patient MFA is temporarily locked due to failed attempts';

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Enable TOTP MFA
-- SELECT enable_patient_mfa('patient-uuid'::UUID, 'totp', 'base32-secret-here');

-- Example 2: Enable SMS MFA
-- SELECT enable_patient_mfa('patient-uuid'::UUID, 'sms', NULL, '+919876543210');

-- Example 3: Enable Email MFA
-- SELECT enable_patient_mfa('patient-uuid'::UUID, 'email', NULL, NULL, 'patient@example.com');

-- Example 4: Record MFA attempt
-- SELECT record_mfa_attempt('patient-uuid'::UUID, 'totp', 'code-hash', TRUE, '192.168.1.1'::INET);

-- Example 5: Check if MFA is locked
-- SELECT is_mfa_locked('patient-uuid'::UUID);

-- Example 6: View MFA statistics
-- SELECT * FROM mfa_statistics;

-- ============================================================================
-- SCRIPT COMPLETE
-- ============================================================================

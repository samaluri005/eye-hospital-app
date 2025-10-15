-- ============================================================================
-- CONSENT MANAGEMENT SETUP
-- 4 Required Consent Types for Patient Registration
-- ============================================================================

-- This script sets up the consent framework for the patient registration flow
-- All 4 consents are required during signup (ProfileStep Step 2)

-- ============================================================================
-- CONSENT TYPE DEFINITIONS
-- ============================================================================

-- The patient_consents table stores consent records with the following types:
-- 1. terms_of_service - Acceptance of Terms of Service
-- 2. privacy_policy - Acceptance of Privacy Policy  
-- 3. hipaa_notice - Consent to HIPAA Notice of Privacy Practices
-- 4. health_information_authorization - Authorization for use of health information

-- ============================================================================
-- HELPER FUNCTION: Check if patient has all required consents
-- ============================================================================

CREATE OR REPLACE FUNCTION patient_has_all_consents(p_patient_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  consent_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT consent_type) INTO consent_count
  FROM patient_consents
  WHERE patient_id = p_patient_id
    AND granted = TRUE
    AND revoked_at IS NULL
    AND consent_type IN (
      'terms_of_service',
      'privacy_policy',
      'hipaa_notice',
      'health_information_authorization'
    );
  
  -- All 4 consents must be present
  RETURN consent_count = 4;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Record patient consent
-- ============================================================================

CREATE OR REPLACE FUNCTION record_patient_consent(
  p_patient_id UUID,
  p_consent_type VARCHAR(100),
  p_ip_address INET DEFAULT NULL,
  p_signature_data TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Insert consent record
  INSERT INTO patient_consents (
    patient_id,
    consent_type,
    granted,
    granted_at,
    ip_address,
    signature_data
  ) VALUES (
    p_patient_id,
    p_consent_type,
    TRUE,
    NOW(),
    p_ip_address,
    p_signature_data
  );
  
  -- Log in HIPAA audit
  INSERT INTO hipaa_audit_log (
    patient_id,
    action,
    actor_id,
    actor_type,
    ip_address,
    accessed_data,
    hipaa_compliance_note
  ) VALUES (
    p_patient_id,
    'CONSENT_GRANTED',
    p_patient_id::TEXT,
    'patient',
    p_ip_address,
    jsonb_build_object('consent_type', p_consent_type),
    'Patient granted consent during registration'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Revoke patient consent
-- ============================================================================

CREATE OR REPLACE FUNCTION revoke_patient_consent(
  p_patient_id UUID,
  p_consent_type VARCHAR(100),
  p_ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Update consent record
  UPDATE patient_consents
  SET revoked_at = NOW()
  WHERE patient_id = p_patient_id
    AND consent_type = p_consent_type
    AND granted = TRUE
    AND revoked_at IS NULL;
  
  -- Log in HIPAA audit
  INSERT INTO hipaa_audit_log (
    patient_id,
    action,
    actor_id,
    actor_type,
    ip_address,
    accessed_data,
    hipaa_compliance_note
  ) VALUES (
    p_patient_id,
    'CONSENT_REVOKED',
    p_patient_id::TEXT,
    'patient',
    p_ip_address,
    jsonb_build_object('consent_type', p_consent_type),
    'Patient revoked consent'
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTION: Record all 4 required consents at registration
-- ============================================================================

CREATE OR REPLACE FUNCTION record_registration_consents(
  p_patient_id UUID,
  p_ip_address INET DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Record all 4 required consents
  PERFORM record_patient_consent(p_patient_id, 'terms_of_service', p_ip_address);
  PERFORM record_patient_consent(p_patient_id, 'privacy_policy', p_ip_address);
  PERFORM record_patient_consent(p_patient_id, 'hipaa_notice', p_ip_address);
  PERFORM record_patient_consent(p_patient_id, 'health_information_authorization', p_ip_address);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CONSENT AUDIT VIEW (for compliance reporting)
-- ============================================================================

CREATE OR REPLACE VIEW consent_audit_report AS
SELECT 
  p.patient_id,
  p.upi,
  p.full_name,
  p.email,
  pc.consent_type,
  pc.granted,
  pc.granted_at,
  pc.revoked_at,
  pc.ip_address,
  CASE 
    WHEN pc.revoked_at IS NULL AND pc.granted = TRUE THEN 'Active'
    WHEN pc.revoked_at IS NOT NULL THEN 'Revoked'
    ELSE 'Not Granted'
  END as consent_status,
  pc.created_at
FROM patient p
LEFT JOIN patient_consents pc ON p.patient_id = pc.patient_id
ORDER BY p.created_at DESC, pc.consent_type;

-- ============================================================================
-- INDEX FOR CONSENT QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_patient_consents_granted 
  ON patient_consents(patient_id, consent_type) 
  WHERE granted = TRUE AND revoked_at IS NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION patient_has_all_consents IS 'Check if patient has all 4 required consents (terms, privacy, hipaa, authorization)';
COMMENT ON FUNCTION record_patient_consent IS 'Record a patient consent with HIPAA audit logging';
COMMENT ON FUNCTION revoke_patient_consent IS 'Revoke a patient consent with HIPAA audit logging';
COMMENT ON FUNCTION record_registration_consents IS 'Record all 4 required consents during patient registration';
COMMENT ON VIEW consent_audit_report IS 'Compliance report showing all patient consents and their status';

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Example 1: Record all consents at registration
-- SELECT record_registration_consents('patient-uuid-here'::UUID, '192.168.1.1'::INET);

-- Example 2: Check if patient has all consents
-- SELECT patient_has_all_consents('patient-uuid-here'::UUID);

-- Example 3: Revoke a specific consent
-- SELECT revoke_patient_consent('patient-uuid-here'::UUID, 'terms_of_service', '192.168.1.1'::INET);

-- Example 4: View consent audit report
-- SELECT * FROM consent_audit_report WHERE upi = 'EH-2025-A1234';

-- ============================================================================
-- SCRIPT COMPLETE
-- ============================================================================

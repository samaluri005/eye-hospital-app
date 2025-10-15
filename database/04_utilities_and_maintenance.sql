-- ============================================================================
-- DATABASE UTILITIES & MAINTENANCE
-- Cleanup, optimization, and maintenance scripts
-- ============================================================================

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Clean up expired OTP attempts (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_expired_otp_attempts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM otp_attempt
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  DELETE FROM entra_otp_attempts
  WHERE expires_at < NOW() - INTERVAL '24 hours';
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired link tokens (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_expired_link_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM link_token
  WHERE expires_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM patient_sessions
  WHERE expires_at < NOW() OR (is_active = FALSE AND last_activity_at < NOW() - INTERVAL '30 days');
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up old MFA verification attempts (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_mfa_attempts()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM mfa_verification_attempts
  WHERE attempted_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Master cleanup function - run all cleanup tasks
CREATE OR REPLACE FUNCTION run_all_cleanup_tasks()
RETURNS TABLE(task VARCHAR, records_deleted INTEGER) AS $$
BEGIN
  RETURN QUERY SELECT 'OTP Attempts'::VARCHAR, cleanup_expired_otp_attempts();
  RETURN QUERY SELECT 'Link Tokens'::VARCHAR, cleanup_expired_link_tokens();
  RETURN QUERY SELECT 'Sessions'::VARCHAR, cleanup_expired_sessions();
  RETURN QUERY SELECT 'MFA Attempts'::VARCHAR, cleanup_old_mfa_attempts();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ANALYTICS & REPORTING FUNCTIONS
-- ============================================================================

-- Get patient registration statistics
CREATE OR REPLACE FUNCTION get_registration_stats()
RETURNS TABLE(
  total_patients BIGINT,
  patients_this_month BIGINT,
  patients_this_week BIGINT,
  patients_today BIGINT,
  avg_age NUMERIC,
  mfa_enabled_count BIGINT,
  consents_complete_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_patients,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))::BIGINT as patients_this_month,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('week', NOW()))::BIGINT as patients_this_week,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('day', NOW()))::BIGINT as patients_today,
    AVG(EXTRACT(YEAR FROM AGE(dob)))::NUMERIC as avg_age,
    COUNT(*) FILTER (WHERE patient_id IN (SELECT patient_id FROM patient_mfa_config WHERE mfa_enabled = TRUE))::BIGINT as mfa_enabled_count,
    COUNT(*) FILTER (WHERE patient_has_all_consents(patient_id))::BIGINT as consents_complete_count
  FROM patient;
END;
$$ LANGUAGE plpgsql;

-- Get appointment statistics
CREATE OR REPLACE FUNCTION get_appointment_stats()
RETURNS TABLE(
  total_appointments BIGINT,
  scheduled_count BIGINT,
  completed_count BIGINT,
  cancelled_count BIGINT,
  upcoming_today BIGINT,
  upcoming_week BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_appointments,
    COUNT(*) FILTER (WHERE status = 'scheduled')::BIGINT as scheduled_count,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT as completed_count,
    COUNT(*) FILTER (WHERE status = 'cancelled')::BIGINT as cancelled_count,
    COUNT(*) FILTER (WHERE status = 'scheduled' AND appointment_date::DATE = CURRENT_DATE)::BIGINT as upcoming_today,
    COUNT(*) FILTER (WHERE status = 'scheduled' AND appointment_date >= NOW() AND appointment_date < NOW() + INTERVAL '7 days')::BIGINT as upcoming_week
  FROM appointments;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DATA QUALITY FUNCTIONS
-- ============================================================================

-- Find patients with incomplete data
CREATE OR REPLACE VIEW incomplete_patient_profiles AS
SELECT 
  patient_id,
  upi,
  full_name,
  CASE WHEN email IS NULL THEN 'Missing email' ELSE NULL END as email_issue,
  CASE WHEN phone IS NULL THEN 'Missing phone' ELSE NULL END as phone_issue,
  CASE WHEN dob IS NULL THEN 'Missing DOB' ELSE NULL END as dob_issue,
  CASE WHEN gender IS NULL THEN 'Missing gender' ELSE NULL END as gender_issue,
  CASE WHEN NOT patient_has_all_consents(patient_id) THEN 'Incomplete consents' ELSE NULL END as consent_issue,
  created_at
FROM patient
WHERE 
  email IS NULL OR 
  phone IS NULL OR 
  dob IS NULL OR 
  gender IS NULL OR
  NOT patient_has_all_consents(patient_id);

-- Find duplicate phone numbers
CREATE OR REPLACE VIEW duplicate_phone_numbers AS
SELECT 
  phone,
  COUNT(*) as patient_count,
  ARRAY_AGG(upi ORDER BY created_at) as upis
FROM patient
WHERE phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1;

-- Find duplicate emails
CREATE OR REPLACE VIEW duplicate_emails AS
SELECT 
  email,
  COUNT(*) as patient_count,
  ARRAY_AGG(upi ORDER BY created_at) as upis
FROM patient
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1;

-- ============================================================================
-- PERFORMANCE OPTIMIZATION
-- ============================================================================

-- Analyze all tables for query optimization
CREATE OR REPLACE FUNCTION analyze_all_tables()
RETURNS VOID AS $$
BEGIN
  ANALYZE patient;
  ANALYZE patient_consents;
  ANALYZE patient_mfa_config;
  ANALYZE appointments;
  ANALYZE medical_records;
  ANALYZE billing_records;
  ANALYZE hipaa_audit_log;
  ANALYZE audit_log;
  ANALYZE patient_sessions;
  ANALYZE duplicate_candidates;
END;
$$ LANGUAGE plpgsql;

-- Vacuum and analyze (maintenance)
CREATE OR REPLACE FUNCTION vacuum_and_analyze()
RETURNS VOID AS $$
BEGIN
  VACUUM ANALYZE patient;
  VACUUM ANALYZE patient_consents;
  VACUUM ANALYZE appointments;
  VACUUM ANALYZE hipaa_audit_log;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECURITY AUDIT FUNCTIONS
-- ============================================================================

-- Get recent login activity
CREATE OR REPLACE VIEW recent_login_activity AS
SELECT 
  p.patient_id,
  p.upi,
  p.full_name,
  ps.session_token,
  ps.ip_address,
  ps.created_at as login_time,
  ps.last_activity_at,
  ps.is_active
FROM patient_sessions ps
JOIN patient p ON ps.patient_id = p.patient_id
WHERE ps.created_at >= NOW() - INTERVAL '7 days'
ORDER BY ps.created_at DESC;

-- Get failed MFA attempts
CREATE OR REPLACE VIEW failed_mfa_attempts AS
SELECT 
  p.patient_id,
  p.upi,
  p.full_name,
  mva.mfa_method,
  mva.ip_address,
  mva.attempted_at,
  COUNT(*) OVER (PARTITION BY p.patient_id, DATE(mva.attempted_at)) as daily_failures
FROM mfa_verification_attempts mva
JOIN patient p ON mva.patient_id = p.patient_id
WHERE mva.success = FALSE
  AND mva.attempted_at >= NOW() - INTERVAL '7 days'
ORDER BY mva.attempted_at DESC;

-- ============================================================================
-- SCHEDULED MAINTENANCE (Run via cron or pg_cron)
-- ============================================================================

-- Example cron job setup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-expired-data', '0 2 * * *', 'SELECT run_all_cleanup_tasks()');
-- SELECT cron.schedule('daily-vacuum', '0 3 * * *', 'SELECT vacuum_and_analyze()');

-- ============================================================================
-- BACKUP & RESTORE HELPERS
-- ============================================================================

-- Generate patient data export (for backup)
CREATE OR REPLACE VIEW patient_export_view AS
SELECT 
  p.patient_id,
  p.upi,
  p.full_name,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.dob,
  p.gender,
  p.created_at,
  p.status,
  (SELECT COUNT(*) FROM appointments WHERE patient_id = p.patient_id) as appointment_count,
  (SELECT COUNT(*) FROM medical_records WHERE patient_id = p.patient_id) as record_count,
  patient_has_all_consents(p.patient_id) as has_all_consents,
  (SELECT mfa_enabled FROM patient_mfa_config WHERE patient_id = p.patient_id) as mfa_enabled
FROM patient p;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION cleanup_expired_otp_attempts IS 'Remove OTP attempts older than 24 hours';
COMMENT ON FUNCTION cleanup_expired_link_tokens IS 'Remove link tokens older than 7 days';
COMMENT ON FUNCTION cleanup_expired_sessions IS 'Remove expired or inactive sessions';
COMMENT ON FUNCTION run_all_cleanup_tasks IS 'Execute all cleanup tasks and return summary';
COMMENT ON FUNCTION get_registration_stats IS 'Get patient registration statistics';
COMMENT ON FUNCTION get_appointment_stats IS 'Get appointment statistics';
COMMENT ON FUNCTION analyze_all_tables IS 'Analyze all tables for query optimization';
COMMENT ON VIEW incomplete_patient_profiles IS 'Find patients with missing required data';
COMMENT ON VIEW duplicate_phone_numbers IS 'Find duplicate phone numbers across patients';
COMMENT ON VIEW duplicate_emails IS 'Find duplicate email addresses across patients';

-- ============================================================================
-- USAGE EXAMPLES
-- ============================================================================

-- Run all cleanup tasks
-- SELECT * FROM run_all_cleanup_tasks();

-- Get registration statistics
-- SELECT * FROM get_registration_stats();

-- Get appointment statistics
-- SELECT * FROM get_appointment_stats();

-- Find incomplete profiles
-- SELECT * FROM incomplete_patient_profiles;

-- Find duplicate contacts
-- SELECT * FROM duplicate_phone_numbers;
-- SELECT * FROM duplicate_emails;

-- Optimize database performance
-- SELECT analyze_all_tables();

-- View recent login activity
-- SELECT * FROM recent_login_activity LIMIT 20;

-- View failed MFA attempts
-- SELECT * FROM failed_mfa_attempts LIMIT 20;

-- Export patient data for backup
-- COPY (SELECT * FROM patient_export_view) TO '/tmp/patient_backup.csv' CSV HEADER;

-- ============================================================================
-- SCRIPT COMPLETE
-- ============================================================================

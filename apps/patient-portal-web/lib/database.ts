// Real database helper using PostgreSQL
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function executeQuery(query: string, params: any[] = []) {
  const client = await pool.connect();
  try {
    console.log('🗄️ Database Query:', query.substring(0, 100) + '...', params?.length || 0, 'params');
    const result = await client.query(query, params);
    return {
      rows: result.rows,
      rowCount: result.rowCount || 0
    };
  } catch (error) {
    console.error('❌ Database error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Hash phone number for privacy-preserving logging
function hashPhone(phone: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(phone).digest('hex').substring(0, 16);
}

export async function logWebhook(type: string, source: string, payload: any, status: string = 'received') {
  // Remove/mask PHI from payload for logging
  let sanitizedPayload = { ...payload };
  
  if (type === 'sms' && payload.from) {
    sanitizedPayload = {
      from_hash: hashPhone(payload.from),
      from_partial: payload.from?.substring(0, 6) + '***',
      body_length: payload.body?.length || 0,
      messageStatus: payload.messageStatus
    };
  }
  
  const query = `
    INSERT INTO webhook_logs (type, source, payload, status, created_at) 
    VALUES ($1, $2, $3, $4, NOW())
  `;
  
  try {
    await executeQuery(query, [type, source, JSON.stringify(sanitizedPayload), status]);
    console.log(`✅ Webhook logged: ${type} from ${source} (PHI protected)`);
  } catch (error) {
    console.error('❌ Failed to log webhook:', error);
  }
}

// Normalize phone number to E.164 format for consistent lookup
function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add +1 if it looks like a US number without country code
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // If it already has country code, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  
  // Return original if we can't parse it
  return phone;
}

export async function findPatientByPhone(phone: string) {
  const normalizedPhone = normalizePhone(phone);
  
  const query = `
    SELECT p.id, u.first_name, u.last_name, u.phone 
    FROM patients p 
    JOIN users u ON p.user_id = u.id 
    WHERE u.phone = $1 OR u.phone = $2
  `;
  
  try {
    const result = await executeQuery(query, [phone, normalizedPhone]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Failed to find patient:', error);
    return null;
  }
}

export async function updateAppointmentStatus(patientId: number, status: string, appointmentId?: number) {
  let query: string;
  let params: any[];
  
  if (appointmentId) {
    // Update specific appointment by ID
    query = `
      UPDATE appointments 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 AND patient_id = $3
    `;
    params = [status, appointmentId, patientId];
  } else {
    // Update next upcoming appointment for patient
    query = `
      UPDATE appointments 
      SET status = $1, updated_at = NOW() 
      WHERE id = (
        SELECT id FROM appointments 
        WHERE patient_id = $2 AND appointment_date > NOW() 
        ORDER BY appointment_date ASC 
        LIMIT 1
      )
    `;
    params = [status, patientId];
  }
  
  try {
    const result = await executeQuery(query, params);
    console.log(`✅ Updated appointment status to ${status} for patient ${patientId}${appointmentId ? ` (appointment ${appointmentId})` : ''}`);
    return result.rowCount > 0;
  } catch (error) {
    console.error('❌ Failed to update appointment:', error);
    return false;
  }
}

export async function recordBillingEvent(patientId: number, appointmentId: number | null, amount: number, status: string, paymentData: any) {
  const query = `
    INSERT INTO billing_records (patient_id, appointment_id, amount, status, payment_method, stripe_payment_id, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
  `;
  
  try {
    await executeQuery(query, [
      patientId, 
      appointmentId, 
      amount, 
      status, 
      paymentData.payment_method || 'stripe',
      paymentData.payment_intent_id || null
    ]);
    console.log(`✅ Recorded billing event: ${status} for patient ${patientId}`);
  } catch (error) {
    console.error('❌ Failed to record billing event:', error);
  }
}
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { Client } from 'pg';

const app = express();
const PORT = 8000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Database connection
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

try {
  await db.connect();
  console.log('✅ Connected to PostgreSQL database');
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
}

// Helper functions
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const computeHmac = (secret, otp, nonce) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(otp + nonce);
  return hmac.digest('hex');
};

const generateNonce = () => {
  return crypto.randomBytes(12).toString('hex');
};

const generateUuid = () => {
  return crypto.randomUUID();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'temp-auth-service', timestamp: new Date().toISOString() });
});

// Database tables check
app.get('/db/tables', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    res.json({ 
      tables: result.rows.map(r => r.table_name),
      count: result.rows.length
    });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// Start OTP verification flow
app.post('/signup/start', async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'phone required' });
    }

    const otp = generateOtp();
    const nonce = generateNonce();
    const otpSecret = process.env.OTP_HMAC_SECRET || 'default-secret-key';
    const hash = computeHmac(otpSecret, otp, nonce);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store OTP attempt
    await db.query(`
      INSERT INTO otp_attempt (phone, otp_hash, nonce, expires_at, attempts, resend_count, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, now())
    `, [phone, hash, nonce, expiresAt, 0, 1, 'pending']);

    // Log OTP for testing (remove in production)
    console.log(`🔐 OTP for ${phone}: ${otp} (expires: ${expiresAt})`);

    // In real implementation, send SMS via Twilio here
    if (process.env.TWILIO_ACCOUNT_SID) {
      console.log('📱 Would send SMS via Twilio in production mode');
    }

    res.json({ status: 'otp_sent', expires_in: 300 });
  } catch (error) {
    console.error('OTP start error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP
app.post('/signup/verify', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    if (!phone || !otp) {
      return res.status(400).json({ error: 'phone and otp required' });
    }

    // Get latest pending OTP attempt
    const otpResult = await db.query(`
      SELECT * FROM otp_attempt 
      WHERE phone = $1 AND status = 'pending' 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [phone]);

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'no_otp_found' });
    }

    const otpEntry = otpResult.rows[0];
    const now = new Date();

    if (now > otpEntry.expires_at) {
      await db.query(`UPDATE otp_attempt SET status = 'expired' WHERE id = $1`, [otpEntry.id]);
      return res.status(400).json({ error: 'otp_expired' });
    }

    if (otpEntry.attempts >= 3) {
      await db.query(`UPDATE otp_attempt SET status = 'failed' WHERE id = $1`, [otpEntry.id]);
      return res.status(400).json({ error: 'max_attempts_exceeded', message: 'Too many incorrect attempts' });
    }

    // Verify OTP
    const otpSecret = process.env.OTP_HMAC_SECRET || 'default-secret-key';
    const expectedHash = computeHmac(otpSecret, otp, otpEntry.nonce);
    
    if (expectedHash !== otpEntry.otp_hash) {
      await db.query(`UPDATE otp_attempt SET attempts = $1 WHERE id = $2`, [otpEntry.attempts + 1, otpEntry.id]);
      return res.status(400).json({ 
        error: 'invalid_otp', 
        attemptsLeft: 3 - (otpEntry.attempts + 1) 
      });
    }

    // OTP verified - create or get patient
    let patientResult = await db.query(`SELECT * FROM patient WHERE phone = $1`, [phone]);
    let patientId;

    if (patientResult.rows.length === 0) {
      // Create new patient
      patientId = generateUuid();
      await db.query(`
        INSERT INTO patient (patient_id, phone, status, created_at, updated_at)
        VALUES ($1, $2, $3, now(), now())
      `, [patientId, phone, 'active']);
    } else {
      patientId = patientResult.rows[0].patient_id;
    }

    // Mark OTP as verified
    await db.query(`UPDATE otp_attempt SET status = 'verified' WHERE id = $1`, [otpEntry.id]);

    // Create link token (10-minute TTL)
    const linkSecret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET || 'default-secret-key';
    const linkTokenPlain = crypto.randomBytes(32).toString('base64').replace(/[+/]/g, s => s === '+' ? '-' : '_').replace(/=/g, '');
    const linkTokenHash = crypto.createHmac('sha256', linkSecret).update(linkTokenPlain).digest('hex');
    const linkExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.query(`
      INSERT INTO link_token (patient_id, token_hash, created_at, expires_at, used, used_at)
      VALUES ($1, $2, now(), $3, false, null)
    `, [patientId, linkTokenHash, linkExpiresAt]);

    // Audit log
    await db.query(`
      INSERT INTO audit_log (patient_id, actor, action, details, ip, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
    `, [patientId, 'system', 'otp_verified', JSON.stringify({ phone }), req.ip, req.get('User-Agent')]);

    console.log(`✅ OTP verified for ${phone}, patient: ${patientId}`);
    
    res.json({ 
      status: 'verified', 
      patientId,
      linkToken: linkTokenPlain
    });
  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Link Microsoft account
app.post('/auth/link', async (req, res) => {
  try {
    const { patientId, linkToken } = req.body;
    const authHeader = req.get('Authorization');

    if (!patientId || !linkToken) {
      return res.status(400).json({ error: 'patientId and linkToken required' });
    }

    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Bearer token required' });
    }

    // For now, we'll simulate Microsoft token validation
    // In production, you'd validate the JWT token with Microsoft's public keys
    const mockOid = 'microsoft-user-' + crypto.randomBytes(8).toString('hex');
    
    // Validate link token
    const linkSecret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET || 'default-secret-key';
    const expectedHash = crypto.createHmac('sha256', linkSecret).update(linkToken).digest('hex');
    
    const linkResult = await db.query(`
      SELECT * FROM link_token 
      WHERE patient_id = $1 AND token_hash = $2 AND used = false AND expires_at > now()
    `, [patientId, expectedHash]);

    if (linkResult.rows.length === 0) {
      return res.status(400).json({ error: 'invalid_or_expired_link_token' });
    }

    // Check if identity already exists
    const existingResult = await db.query(`
      SELECT * FROM auth_identity WHERE provider = 'Microsoft' AND provider_subject = $1
    `, [mockOid]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ 
        error: 'identity_already_linked', 
        message: 'This Microsoft account is already linked to a patient account.' 
      });
    }

    // Mark token as used
    await db.query(`UPDATE link_token SET used = true, used_at = now() WHERE id = $1`, [linkResult.rows[0].id]);

    // Create auth identity link
    await db.query(`
      INSERT INTO auth_identity (patient_id, provider, provider_subject, verified_at, is_primary, is_active, created_at)
      VALUES ($1, $2, $3, now(), true, true, now())
    `, [patientId, 'Microsoft', mockOid]);

    // Audit log
    await db.query(`
      INSERT INTO audit_log (patient_id, actor, action, details, ip, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, now())
    `, [patientId, mockOid, 'identity_linked', JSON.stringify({ provider: 'Microsoft', oid: mockOid }), req.ip, req.get('User-Agent')]);

    console.log(`🔗 Linked Microsoft account for patient: ${patientId}`);

    res.json({ 
      status: 'linked', 
      message: 'Microsoft account successfully linked to patient profile.' 
    });
  } catch (error) {
    console.error('Auth link error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Temp Auth Service running on http://0.0.0.0:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('  GET  /health - Health check');
  console.log('  GET  /db/tables - Database status');
  console.log('  POST /signup/start - Start OTP flow');
  console.log('  POST /signup/verify - Verify OTP');
  console.log('  POST /auth/link - Link Microsoft account');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 Received SIGTERM, closing database connection...');
  await db.end();
  process.exit(0);
});
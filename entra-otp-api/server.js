import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { Client } from 'pg';
import twilio from 'twilio';

const app = express();
const PORT = 3002; // Different port from auth service

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form-encoded data from Entra

// Database connection
const db = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Connect to database
db.connect()
  .then(() => console.log('✅ Connected to PostgreSQL for OTP storage'))
  .catch(err => console.error('❌ Database connection failed:', err));

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
const twilioFromNumber = process.env.TWILIO_FROM_NUMBER;

// Store OTP attempts in database
const storeOTP = async (phone, otp) => {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  const otpHash = crypto
    .createHash('sha256')
    .update(`${otp}${process.env.OTP_HMAC_SECRET}`)
    .digest('hex');
  
  try {
    await db.query(`
      INSERT INTO entra_otp_attempts (phone, otp_hash, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (phone) DO UPDATE
      SET otp_hash = $2, expires_at = $3, created_at = NOW(), attempts = 0
    `, [phone, otpHash, expiresAt]);
    
    return true;
  } catch (error) {
    console.error('Failed to store OTP:', error);
    return false;
  }
};

// Verify OTP from database
const verifyOTP = async (phone, code) => {
  const otpHash = crypto
    .createHash('sha256')
    .update(`${code}${process.env.OTP_HMAC_SECRET}`)
    .digest('hex');
  
  try {
    const result = await db.query(`
      SELECT * FROM entra_otp_attempts
      WHERE phone = $1 AND otp_hash = $2 AND expires_at > NOW() AND attempts < 3
    `, [phone, otpHash]);
    
    if (result.rows.length > 0) {
      // Mark as used
      await db.query(`
        UPDATE entra_otp_attempts 
        SET attempts = attempts + 1 
        WHERE phone = $1
      `, [phone]);
      
      return true;
    }
    
    // Increment failed attempts
    await db.query(`
      UPDATE entra_otp_attempts 
      SET attempts = attempts + 1 
      WHERE phone = $1
    `, [phone]);
    
    return false;
  } catch (error) {
    console.error('Failed to verify OTP:', error);
    return false;
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'entra-otp-api',
    timestamp: new Date().toISOString() 
  });
});

/**
 * Send OTP endpoint - Called by Microsoft Entra External ID
 * Expected by Entra in custom policy REST API call
 */
app.post('/api/otp/send', async (req, res) => {
  console.log('📥 OTP Send Request:', req.body);
  
  try {
    // Extract phone number from various possible field names Entra might send
    const phone = req.body.To || req.body.phoneNumber || req.body.phone || req.body.signInName;
    
    if (!phone) {
      return res.status(400).json({
        version: '1.0.0',
        status: 400,
        userMessage: 'Phone number is required'
      });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in database
    await storeOTP(phone, otp);
    
    // Send SMS via Twilio
    try {
      const message = await twilioClient.messages.create({
        body: `Your Eye Hospital verification code is: ${otp}. Valid for 10 minutes.`,
        from: twilioFromNumber,
        to: phone
      });
      
      console.log(`✅ OTP sent to ${phone}, SID: ${message.sid}`);
      
      // Return success response expected by Entra
      return res.json({
        status: 'sent',
        sid: message.sid,
        phone: phone
      });
      
    } catch (twilioError) {
      console.error('❌ Twilio send failed:', twilioError.message);
      
      // In development, still return success but log the OTP
      if (process.env.NODE_ENV !== 'production') {
        console.log(`🔑 DEV MODE - OTP for ${phone}: ${otp}`);
        return res.json({
          status: 'sent',
          sid: 'dev-mode',
          phone: phone
        });
      }
      
      return res.status(500).json({
        version: '1.0.0',
        status: 500,
        userMessage: 'Failed to send verification code. Please try again.'
      });
    }
    
  } catch (error) {
    console.error('❌ OTP Send Error:', error);
    return res.status(500).json({
      version: '1.0.0',
      status: 500,
      userMessage: 'Service temporarily unavailable'
    });
  }
});

/**
 * Verify OTP endpoint - Called by Microsoft Entra External ID
 */
app.post('/api/otp/verify', async (req, res) => {
  console.log('📥 OTP Verify Request:', req.body);
  
  try {
    // Extract phone and code from request
    const phone = req.body.To || req.body.phoneNumber || req.body.phone || req.body.signInName;
    const code = req.body.Code || req.body.code || req.body.otp || req.body.otpCode;
    
    if (!phone || !code) {
      return res.status(400).json({
        version: '1.0.0',
        status: 400,
        userMessage: 'Phone number and code are required'
      });
    }
    
    // Verify OTP
    const isValid = await verifyOTP(phone, code);
    
    if (isValid) {
      console.log(`✅ OTP verified for ${phone}`);
      return res.json({
        status: 'approved',
        valid: true,
        phone: phone
      });
    } else {
      console.log(`❌ Invalid OTP for ${phone}`);
      return res.status(400).json({
        version: '1.0.0',
        status: 400,
        userMessage: 'Invalid or expired verification code'
      });
    }
    
  } catch (error) {
    console.error('❌ OTP Verify Error:', error);
    return res.status(500).json({
      version: '1.0.0',
      status: 500,
      userMessage: 'Service temporarily unavailable'
    });
  }
});

/**
 * Twilio Verify API endpoints (Alternative implementation using Twilio Verify service)
 */
app.post('/api/twilio-verify/send', async (req, res) => {
  console.log('📥 Twilio Verify Send Request:', req.body);
  
  try {
    const phone = req.body.To || req.body.phoneNumber;
    const channel = req.body.Channel || 'sms';
    
    // If you have Twilio Verify Service configured
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    if (!verifyServiceSid) {
      return res.status(501).json({
        version: '1.0.0',
        status: 501,
        userMessage: 'Twilio Verify service not configured'
      });
    }
    
    const verification = await twilioClient.verify
      .services(verifyServiceSid)
      .verifications
      .create({ to: phone, channel: channel });
    
    console.log(`✅ Twilio Verify sent to ${phone}, Status: ${verification.status}`);
    
    return res.json({
      sid: verification.sid,
      status: verification.status,
      to: verification.to,
      channel: verification.channel
    });
    
  } catch (error) {
    console.error('❌ Twilio Verify Send Error:', error);
    return res.status(500).json({
      version: '1.0.0',
      status: 500,
      userMessage: 'Failed to send verification'
    });
  }
});

app.post('/api/twilio-verify/check', async (req, res) => {
  console.log('📥 Twilio Verify Check Request:', req.body);
  
  try {
    const phone = req.body.To || req.body.phoneNumber;
    const code = req.body.Code || req.body.code;
    
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    if (!verifyServiceSid) {
      return res.status(501).json({
        version: '1.0.0',
        status: 501,
        userMessage: 'Twilio Verify service not configured'
      });
    }
    
    const verificationCheck = await twilioClient.verify
      .services(verifyServiceSid)
      .verificationChecks
      .create({ to: phone, code: code });
    
    console.log(`✅ Twilio Verify check for ${phone}, Status: ${verificationCheck.status}`);
    
    if (verificationCheck.status === 'approved') {
      return res.json({
        status: 'approved',
        valid: true,
        to: verificationCheck.to
      });
    } else {
      return res.status(400).json({
        version: '1.0.0',
        status: 400,
        userMessage: 'Invalid verification code'
      });
    }
    
  } catch (error) {
    console.error('❌ Twilio Verify Check Error:', error);
    return res.status(500).json({
      version: '1.0.0',
      status: 500,
      userMessage: 'Verification check failed'
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Entra OTP API running on http://0.0.0.0:${PORT}`);
  console.log(`📍 Endpoints:`);
  console.log(`   - POST /api/otp/send`);
  console.log(`   - POST /api/otp/verify`);
  console.log(`   - POST /api/twilio-verify/send (if Verify Service configured)`);
  console.log(`   - POST /api/twilio-verify/check (if Verify Service configured)`);
});
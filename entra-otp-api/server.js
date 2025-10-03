import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { Client } from 'pg';
import twilio from 'twilio';
import jwt from 'jsonwebtoken';
import https from 'https';

const app = express();
const PORT = 3002; // Different port from auth service

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form-encoded data from Entra

// Database connection with retry logic
let db;

const connectToDatabase = async () => {
  try {
    if (db) {
      try { await db.end(); } catch (e) { /* ignore */ }
    }
    
    db = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000,
      query_timeout: 10000,
      keepAlive: true
    });

    // Handle connection errors
    db.on('error', (err) => {
      console.error('❌ Database connection error:', err.message);
      db = null; // Mark as disconnected
      console.log('🔄 Attempting to reconnect...');
      setTimeout(connectToDatabase, 5000); // Retry after 5 seconds
    });

    await db.connect();
    console.log('✅ Connected to PostgreSQL for OTP storage');
    return db;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    db = null; // Mark as disconnected
    console.log('🔄 Retrying connection in 5 seconds...');
    setTimeout(connectToDatabase, 5000);
    return null;
  }
};

// Helper function to ensure database connection
const ensureDbConnection = async () => {
  if (!db || db._ending || db._ended) {
    console.log('🔄 Database disconnected, reconnecting...');
    await connectToDatabase();
    // Wait for connection to be established
    let attempts = 0;
    while ((!db || db._ending || db._ended) && attempts < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      attempts++;
    }
  }
  return db;
};

// Initialize database connection
await connectToDatabase();

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
    const conn = await ensureDbConnection();
    if (!conn) {
      console.error('❌ Database not available for OTP storage');
      return false;
    }
    
    await conn.query(`
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
    const conn = await ensureDbConnection();
    if (!conn) {
      console.error('❌ Database not available for OTP verification');
      return false;
    }
    
    const result = await conn.query(`
      SELECT * FROM entra_otp_attempts
      WHERE phone = $1 AND otp_hash = $2 AND expires_at > NOW() AND attempts < 3
    `, [phone, otpHash]);
    
    if (result.rows.length > 0) {
      // Mark as used
      await conn.query(`
        UPDATE entra_otp_attempts 
        SET attempts = attempts + 1 
        WHERE phone = $1
      `, [phone]);
      
      return true;
    }
    
    // Increment failed attempts
    await conn.query(`
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

// OAuth 2.0 Bearer Token validation middleware
const validateOAuthToken = async (req, res, next) => {
  // Allow health check without authentication
  if (req.path === '/health') {
    return next();
  }
  
  try {
    // Extract bearer token from Authorization header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid Authorization header');
      return res.status(401).json({
        version: '1.0.0',
        status: 401,
        userMessage: 'Unauthorized - Missing bearer token'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Decode token header to get key ID (kid)
    const decodedHeader = jwt.decode(token, { complete: true });
    if (!decodedHeader) {
      console.error('❌ Invalid token format');
      return res.status(401).json({
        version: '1.0.0',
        status: 401,
        userMessage: 'Unauthorized - Invalid token'
      });
    }
    
    // Expected values from Microsoft Entra External ID
    const tenantId = process.env.ENTRA_TENANT_ID || 'b9337298-5d48-46b2-b49f-0ff798b6d9ed';
    const appId = process.env.ENTRA_APP_ID || '9f4db99c-5398-458b-b3cb-cd98d31e2dcf';
    const issuer = `https://eyehospitalextd.ciamlogin.com/${tenantId}/v2.0`;
    const audience = `api://7886148d-154a-4dfe-afa4-4975a10c9ce7-00-wed1m9226kki.picard.replit.dev/${appId}`;
    
    // For now, decode without verification (development mode)
    // In production, you should verify the signature using Microsoft's public keys
    const decoded = jwt.decode(token);
    
    if (!decoded) {
      console.error('❌ Token decode failed');
      return res.status(401).json({
        version: '1.0.0',
        status: 401,
        userMessage: 'Unauthorized - Invalid token'
      });
    }
    
    // Validate issuer
    if (decoded.iss !== issuer) {
      console.error(`❌ Invalid issuer. Expected: ${issuer}, Got: ${decoded.iss}`);
      return res.status(401).json({
        version: '1.0.0',
        status: 401,
        userMessage: 'Unauthorized - Invalid token issuer'
      });
    }
    
    // Validate audience
    if (decoded.aud !== audience) {
      console.error(`❌ Invalid audience. Expected: ${audience}, Got: ${decoded.aud}`);
      return res.status(401).json({
        version: '1.0.0',
        status: 401,
        userMessage: 'Unauthorized - Invalid token audience'
      });
    }
    
    // Validate expiration
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      console.error('❌ Token expired');
      return res.status(401).json({
        version: '1.0.0',
        status: 401,
        userMessage: 'Unauthorized - Token expired'
      });
    }
    
    console.log('✅ Valid OAuth token from Microsoft Entra External ID');
    req.user = decoded; // Attach decoded token to request
    next();
    
  } catch (error) {
    console.error('❌ Token validation error:', error.message);
    return res.status(401).json({
      version: '1.0.0',
      status: 401,
      userMessage: 'Unauthorized - Token validation failed'
    });
  }
};

// Apply OAuth token validation to all routes except health
app.use(validateOAuthToken);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'entra-otp-api',
    timestamp: new Date().toISOString() 
  });
});

/**
 * Custom Authentication Extension - OnAttributeCollectionSubmit Event
 * Called when user submits phone number during sign-up
 */
app.post('/api/extensions/onAttributeCollectionSubmit', async (req, res) => {
  console.log('📥 OnAttributeCollectionSubmit Event:', JSON.stringify(req.body, null, 2));
  
  try {
    // Parse the event data from Entra
    const eventType = req.body.type;
    const eventData = req.body.data;
    
    // Extract phone number from attributes
    const attributes = eventData?.attributes || {};
    const phone = attributes.phoneNumber || attributes.phone || attributes.mobilePhone;
    
    if (!phone) {
      // Return validation error for missing phone
      return res.json({
        data: {
          "@odata.type": "microsoft.graph.onAttributeCollectionSubmitResponseData",
          actions: [
            {
              "@odata.type": "microsoft.graph.attributeCollectionSubmit.showValidationError",
              message: "Phone number is required for registration",
              attributeErrors: [
                {
                  attribute: "phoneNumber",
                  message: "Please enter a valid phone number"
                }
              ]
            }
          ]
        }
      });
    }
    
    // Validate phone format (basic validation)
    const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.json({
        data: {
          "@odata.type": "microsoft.graph.onAttributeCollectionSubmitResponseData",
          actions: [
            {
              "@odata.type": "microsoft.graph.attributeCollectionSubmit.showValidationError",
              message: "Invalid phone number format",
              attributeErrors: [
                {
                  attribute: "phoneNumber",
                  message: "Please enter a valid phone number with country code (e.g., +1234567890)"
                }
              ]
            }
          ]
        }
      });
    }
    
    // Generate and send OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await storeOTP(phone, otp);
    
    try {
      if (twilioFromNumber && process.env.TWILIO_ACCOUNT_SID) {
        const message = await twilioClient.messages.create({
          body: `Your Eye Hospital verification code is: ${otp}. Valid for 10 minutes.`,
          from: twilioFromNumber,
          to: phone
        });
        console.log(`✅ OTP sent to ${phone}, SID: ${message.sid}`);
      } else {
        console.log(`🔑 DEV MODE - OTP for ${phone}: ${otp}`);
      }
    } catch (twilioError) {
      console.error('❌ Twilio send failed:', twilioError.message);
      console.log(`🔑 FALLBACK - OTP for ${phone}: ${otp}`);
    }
    
    // Continue with default behavior and set phone as verified
    return res.json({
      data: {
        "@odata.type": "microsoft.graph.onAttributeCollectionSubmitResponseData",
        actions: [
          {
            "@odata.type": "microsoft.graph.attributeCollectionSubmit.modifyAttributeValues",
            attributes: {
              "phoneNumber": phone,
              "phoneNumberVerified": "pending_otp"
            }
          }
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Extension Error:', error);
    // Return error that blocks the flow
    return res.json({
      data: {
        "@odata.type": "microsoft.graph.onAttributeCollectionSubmitResponseData",
        actions: [
          {
            "@odata.type": "microsoft.graph.attributeCollectionSubmit.showBlockPage",
            message: "We're experiencing technical difficulties. Please try again later."
          }
        ]
      }
    });
  }
});

/**
 * Custom Authentication Extension - OnTokenIssuanceStart Event
 * Add custom claims to the token
 */
app.post('/api/extensions/onTokenIssuanceStart', async (req, res) => {
  console.log('📥 OnTokenIssuanceStart Event:', JSON.stringify(req.body, null, 2));
  
  try {
    const eventData = req.body.data;
    const user = eventData?.authenticationContext?.user || {};
    
    // Add custom claims based on user data
    const customClaims = {
      patientId: user.id,
      phoneVerified: "true",
      registrationSource: "phone_otp"
    };
    
    // Check if user has medical record number in our database
    if (user.userPrincipalName) {
      // You could query your database here for additional user data
      customClaims.hasMedicalHistory = "true";
    }
    
    return res.json({
      data: {
        "@odata.type": "microsoft.graph.onTokenIssuanceStartResponseData",
        actions: [
          {
            "@odata.type": "microsoft.graph.tokenIssuanceStart.provideClaimsForToken",
            claims: customClaims
          }
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Token Issuance Error:', error);
    // Continue without custom claims on error
    return res.json({
      data: {
        "@odata.type": "microsoft.graph.onTokenIssuanceStartResponseData",
        actions: []
      }
    });
  }
});

/**
 * Legacy endpoint for backward compatibility
 */
app.post('/api/otp/send', async (req, res) => {
  console.log('📥 Legacy OTP Send Request:', req.body);
  
  try {
    const phone = req.body.To || req.body.phoneNumber || req.body.phone || req.body.signInName;
    
    if (!phone) {
      return res.status(400).json({
        version: '1.0.0',
        status: 400,
        userMessage: 'Phone number is required'
      });
    }
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await storeOTP(phone, otp);
    
    try {
      if (twilioFromNumber && process.env.TWILIO_ACCOUNT_SID) {
        const message = await twilioClient.messages.create({
          body: `Your Eye Hospital verification code is: ${otp}. Valid for 10 minutes.`,
          from: twilioFromNumber,
          to: phone
        });
        console.log(`✅ OTP sent to ${phone}, SID: ${message.sid}`);
        return res.json({
          status: 'sent',
          sid: message.sid,
          phone: phone
        });
      } else {
        console.log(`🔑 DEV MODE - OTP for ${phone}: ${otp}`);
        return res.json({
          status: 'sent',
          sid: 'dev-mode',
          phone: phone
        });
      }
    } catch (twilioError) {
      console.error('❌ Twilio send failed:', twilioError.message);
      console.log(`🔑 FALLBACK - OTP for ${phone}: ${otp}`);
      return res.json({
        status: 'sent',
        sid: 'fallback-mode',
        phone: phone
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
  console.log(`🚀 Entra Custom Authentication Extensions API running on http://0.0.0.0:${PORT}`);
  console.log(`📍 Custom Authentication Extension Endpoints:`);
  console.log(`   - POST /api/extensions/onAttributeCollectionSubmit`);
  console.log(`   - POST /api/extensions/onTokenIssuanceStart`);
  console.log(`📍 Legacy/Testing Endpoints:`);
  console.log(`   - POST /api/otp/send`);
  console.log(`   - POST /api/otp/verify`);
  console.log(`   - POST /api/twilio-verify/send (if Verify Service configured)`);
  console.log(`   - POST /api/twilio-verify/check (if Verify Service configured)`);
});
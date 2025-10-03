import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import crypto from 'crypto';
import twilio from 'twilio';
import { Client } from 'pg';

const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'b9337298-b6a4-4a97-9438-ad3a897b7d62';
const appId = process.env.ENTRA_APP_ID || '9f4db99c-5398-458b-b3cb-cd98d31e2dcf';
const issuer = `https://login.microsoftonline.com/${tenantId}/v2.0`;
const audience = `api://7886148d-154a-4dfe-afa4-4975a10c9ce7-00-wed1m9226kki.picard.replit.dev/${appId}`;

const JWKS = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`));

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

async function storeOTP(phone: string, otp: string) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const otpHash = crypto
    .createHash('sha256')
    .update(`${otp}${process.env.OTP_HMAC_SECRET}`)
    .digest('hex');
  
  try {
    const db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    
    await db.query(`
      INSERT INTO entra_otp_attempts (phone, otp_hash, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (phone) DO UPDATE
      SET otp_hash = $2, expires_at = $3, created_at = NOW(), attempts = 0
    `, [phone, otpHash, expiresAt]);
    
    await db.end();
    return true;
  } catch (error) {
    console.error('Failed to store OTP:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid Authorization header');
      return NextResponse.json({
        version: '1.0.0',
        status: 401,
        userMessage: 'Unauthorized - Missing bearer token'
      }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: issuer,
      audience: audience,
      clockTolerance: 60
    });
    
    console.log('✅ Valid OAuth token from Microsoft Entra External ID (signature verified)');
    console.log('   Token subject:', payload.sub);
    console.log('   Token app ID:', payload.appid || payload.azp);
    
  } catch (error: any) {
    console.error('❌ Token validation error:', error.message);
    return NextResponse.json({
      version: '1.0.0',
      status: 401,
      userMessage: 'Unauthorized - Token validation failed'
    }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    console.log('📥 OnAttributeCollectionSubmit Event:', JSON.stringify(body, null, 2));
    
    const eventData = body.data;
    const attributes = eventData?.attributes || {};
    const phone = attributes.phoneNumber || attributes.phone || attributes.mobilePhone;
    
    if (!phone) {
      return NextResponse.json({
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
    
    const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return NextResponse.json({
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
    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await storeOTP(phone, otp);
    
    try {
      if (process.env.TWILIO_FROM_NUMBER && process.env.TWILIO_ACCOUNT_SID) {
        const message = await twilioClient.messages.create({
          body: `Your Eye Hospital verification code is: ${otp}. Valid for 10 minutes.`,
          from: process.env.TWILIO_FROM_NUMBER,
          to: phone
        });
        console.log(`✅ OTP sent to ${phone}, SID: ${message.sid}`);
      } else {
        console.log(`🔑 DEV MODE - OTP for ${phone}: ${otp}`);
      }
    } catch (twilioError: any) {
      console.error('❌ Twilio send failed:', twilioError.message);
      console.log(`🔑 FALLBACK - OTP for ${phone}: ${otp}`);
    }
    
    return NextResponse.json({
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
    return NextResponse.json({
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
}

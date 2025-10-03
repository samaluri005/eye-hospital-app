import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import crypto from 'crypto';
import twilio from 'twilio';
import { Client } from 'pg';

const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'b9337298-b6a4-4a97-9438-ad3a897b7d62';
const appId = process.env.ENTRA_APP_ID || '9f40b99c-5398-4580-b8cb-cd98d31e2dcf';
const issuer = `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`;
const audience = appId;

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
  let body;
  
  try {
    body = await req.json();
    console.log('📥 OnAttributeCollectionSubmit Event:', JSON.stringify(body, null, 2));
  } catch (error: any) {
    console.error('❌ Failed to parse request body:', error.message);
    return NextResponse.json({
      data: {
        "@odata.type": "microsoft.graph.onAttributeCollectionSubmitResponseData",
        actions: [
          {
            "@odata.type": "microsoft.graph.attributeCollectionSubmit.showBlockPage",
            message: "Invalid request format"
          }
        ]
      }
    });
  }
  
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('❌ Missing or invalid Authorization header');
  } else {
    console.log('✅ Bearer token present (validation temporarily disabled for testing)');
  }
  
  try {
    const eventData = body.data;
    const attributes = eventData?.userSignUpInfo?.attributes || {};
    
    let phone = null;
    for (const [key, attr] of Object.entries(attributes)) {
      if (key.includes('MobileNumber') || key.includes('phoneNumber')) {
        phone = (attr as any).value;
        break;
      }
    }
    
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
    
    if (!phone.startsWith('+')) {
      phone = '+91' + phone;
      console.log(`📱 Added country code: ${phone}`);
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

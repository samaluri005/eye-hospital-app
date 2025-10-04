import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify, createRemoteJWKSet } from 'jose';
import { db } from '../../../../../lib/db';
import { patient } from '../../../../../lib/schema';
import { eq } from 'drizzle-orm';

const tenantId = process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'b9337298-b6a4-4a97-9438-ad3a897b7d62';
const appId = process.env.ENTRA_APP_ID || '9f40b99c-5398-4580-b8cb-cd98d31e2dcf';
const issuer = `https://${tenantId}.ciamlogin.com/${tenantId}/v2.0`;
const audience = appId;

const JWKS = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`));

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
    
    console.log('✅ Valid OAuth token for Token Issuance (signature verified)');
    
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
    console.log('📥 OnTokenIssuanceStart Event:', JSON.stringify(body, null, 2));
    
    const eventData = body.data;
    const user = eventData?.authenticationContext?.user || {};
    const entraUserId = user.id; // Entra object ID
    
    // Look up patient record by Entra user ID to get PostgreSQL patientId
    let patientId: string | null = null;
    let phoneVerified = 'false';
    
    if (entraUserId) {
      try {
        const patientRecord = await db.select()
          .from(patient)
          .where(eq(patient.entraObjectId, entraUserId))
          .limit(1);
        
        if (patientRecord.length > 0) {
          patientId = patientRecord[0].patientId;
          phoneVerified = patientRecord[0].phone ? 'true' : 'false';
          console.log(`✅ Found patient ${patientId} for Entra user ${entraUserId}`);
        } else {
          console.warn(`⚠️  No patient record found for Entra user ${entraUserId}`);
        }
      } catch (dbError) {
        console.error('❌ Database lookup failed:', dbError);
      }
    }
    
    // Build custom claims to inject into JWT token
    const customClaims: Record<string, string> = {
      patientId: patientId || 'unknown',
      phoneVerified: phoneVerified,
      registrationSource: 'phone_otp',
      entraUserId: entraUserId || 'unknown',
    };
    
    if (user.userPrincipalName) {
      customClaims.email = user.userPrincipalName;
    }
    
    console.log('📤 Injecting custom claims:', customClaims);
    
    return NextResponse.json({
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
    return NextResponse.json({
      data: {
        "@odata.type": "microsoft.graph.onTokenIssuanceStartResponseData",
        actions: []
      }
    });
  }
}

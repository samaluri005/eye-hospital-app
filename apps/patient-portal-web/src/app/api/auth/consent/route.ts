import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { patientConsents, hipaaAuditLog, linkToken as linkTokenTable } from '../../../../../lib/schema';
import { sql, eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// Validate link token against database (matches temp-auth-service format)
async function validateLinkToken(token: string, patientId: string): Promise<boolean> {
  try {
    const secret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET;
    if (!secret) {
      console.error('LINK_TOKEN_HMAC_SECRET not configured');
      return false;
    }

    // Generate hash of provided token (matches temp-auth-service logic)
    const tokenHash = crypto.createHmac('sha256', secret).update(token).digest('hex');

    // Check link_token table using raw SQL (temp-auth-service uses token_hash column)
    const linkTokenResult = await db.execute(sql`
      SELECT * FROM link_token 
      WHERE patient_id = ${patientId}
      AND token_hash = ${tokenHash}
      AND used = false
      AND expires_at > NOW()
      LIMIT 1
    `);

    return linkTokenResult.rows.length > 0;
  } catch (error) {
    console.error('Link token validation error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, linkToken, consents } = body;

    // Validate required fields
    if (!patientId || !linkToken || !consents || !Array.isArray(consents)) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, linkToken, and consents array' },
        { status: 400 }
      );
    }

    // CRITICAL SECURITY: Validate link token to ensure caller is authorized
    const isValidToken = await validateLinkToken(linkToken, patientId);
    if (!isValidToken) {
      console.error(`[CONSENT] Invalid or expired link token for patient ${patientId}`);
      return NextResponse.json(
        { error: 'Invalid or expired authorization token' },
        { status: 401 }
      );
    }

    // Get IP address for audit trail (HIPAA requirement)
    // x-forwarded-for can contain multiple IPs (client, proxy1, proxy2), take the first one
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor 
      ? forwardedFor.split(',')[0].trim()
      : (request.headers.get('x-real-ip') || 'unknown');
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Use transaction for atomic consent recording (HIPAA compliance)
    await db.transaction(async (tx) => {
      for (const consent of consents) {
        const { consentType, granted } = consent;

        if (!consentType || typeof granted !== 'boolean') {
          continue; // Skip invalid consent entries
        }

        // Delete any existing consent of this type for this patient (prevent duplicates)
        await tx.delete(patientConsents)
          .where(
            and(
              eq(patientConsents.patientId, patientId),
              eq(patientConsents.consentType, consentType)
            )
          );

        // Insert new consent record
        await tx.insert(patientConsents).values({
          patientId,
          consentType,
          granted,
          grantedAt: granted ? sql`NOW()` : null,
          revokedAt: !granted ? sql`NOW()` : null,
          ipAddress,
          consentDocumentUrl: null, // TODO: Add URL to actual consent documents
          signatureData: null, // TODO: Add digital signature if available
        });

        // Create HIPAA audit log entry for consent action
        await tx.insert(hipaaAuditLog).values({
          patientId,
          action: granted ? 'consent_granted' : 'consent_revoked',
          actorId: patientId,
          actorType: 'patient',
          ipAddress,
          userAgent,
          accessedData: {
            consentType,
            granted,
            timestamp: new Date().toISOString(),
          },
          hipaaComplianceNote: `Patient ${granted ? 'granted' : 'revoked'} consent for ${consentType}`,
        });
      }
    });

    console.log(`[CONSENT] Successfully recorded ${consents.length} consent(s) for patient ${patientId}`);

    return NextResponse.json({ 
      status: 'consent_recorded',
      message: 'Your consent preferences have been recorded successfully',
      consentsRecorded: consents.length
    });
  } catch (error) {
    console.error('Consent API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to record consent',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

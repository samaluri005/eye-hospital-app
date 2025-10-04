import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { patientConsents, hipaaAuditLog, linkToken as linkTokenTable } from '../../../../../lib/schema';
import { sql, eq, and } from 'drizzle-orm';
import crypto from 'crypto';

// Validate link token (same HMAC logic as auth service)
function validateLinkToken(token: string, patientId: string): boolean {
  try {
    const secret = process.env.LINK_TOKEN_HMAC_SECRET;
    if (!secret) {
      console.error('LINK_TOKEN_HMAC_SECRET not configured');
      return false;
    }

    // Token format: base64(patientId:timestamp:hmac)
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [tokenPatientId, timestamp, providedHmac] = decoded.split(':');

    // Verify patient ID matches
    if (tokenPatientId !== patientId) {
      return false;
    }

    // Verify not expired (10 minutes)
    const tokenTime = parseInt(timestamp, 10);
    const now = Date.now();
    if (now - tokenTime > 10 * 60 * 1000) {
      return false;
    }

    // Verify HMAC signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(`${patientId}:${timestamp}`);
    const calculatedHmac = hmac.digest('hex');

    return calculatedHmac === providedHmac;
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
    if (!validateLinkToken(linkToken, patientId)) {
      console.error(`[CONSENT] Invalid or expired link token for patient ${patientId}`);
      return NextResponse.json(
        { error: 'Invalid or expired authorization token' },
        { status: 401 }
      );
    }

    // Get IP address for audit trail (HIPAA requirement)
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
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

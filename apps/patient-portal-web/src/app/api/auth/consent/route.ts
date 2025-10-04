import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { patientConsents, hipaaAuditLog } from '../../../../../lib/schema';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, consents } = body;

    if (!patientId || !consents || !Array.isArray(consents)) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId and consents array' },
        { status: 400 }
      );
    }

    // Get IP address for audit trail (HIPAA requirement)
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';

    // Store each consent in database
    for (const consent of consents) {
      const { consentType, granted } = consent;

      if (!consentType || typeof granted !== 'boolean') {
        continue; // Skip invalid consent entries
      }

      await db.insert(patientConsents).values({
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
      await db.insert(hipaaAuditLog).values({
        patientId,
        action: granted ? 'consent_granted' : 'consent_revoked',
        actorId: patientId,
        actorType: 'patient',
        ipAddress,
        userAgent: request.headers.get('user-agent') || 'unknown',
        accessedData: {
          consentType,
          granted,
          timestamp: new Date().toISOString(),
        },
        hipaaComplianceNote: `Patient ${granted ? 'granted' : 'revoked'} consent for ${consentType}`,
      });
    }

    console.log(`[CONSENT] Recorded ${consents.length} consent(s) for patient ${patientId}`);

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

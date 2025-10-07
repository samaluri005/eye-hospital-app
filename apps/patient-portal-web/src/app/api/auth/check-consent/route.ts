import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { patientConsents } from '../../../../../lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, linkToken } = body;

    if (!patientId || !linkToken) {
      return NextResponse.json(
        { error: 'Patient ID and link token are required' },
        { status: 400 }
      );
    }

    // Validate linkToken
    const secret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      );
    }

    const tokenHash = crypto.createHmac('sha256', secret).update(linkToken).digest('hex');

    // Verify linkToken is valid
    const linkTokenRecords = await db.execute(sql`
      SELECT id FROM link_token
      WHERE token_hash = ${tokenHash}
      AND patient_id = ${patientId}::uuid
      AND used = false
      AND expires_at > NOW()
      LIMIT 1
    `);

    if (linkTokenRecords.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired link token' },
        { status: 401 }
      );
    }

    // Check if required consents exist
    const consentRecords = await db.execute(sql`
      SELECT consent_type, granted
      FROM patient_consents
      WHERE patient_id = ${patientId}::uuid
      AND consent_type IN ('hipaa_privacy_notice', 'electronic_communications')
      AND granted = true
    `);

    const hasConsent = consentRecords.rows.length >= 2;

    return NextResponse.json({
      hasConsent,
      consentCount: consentRecords.rows.length,
    });
  } catch (error) {
    console.error('Check consent error:', error);
    return NextResponse.json(
      { error: 'Failed to check consent' },
      { status: 500 }
    );
  }
}

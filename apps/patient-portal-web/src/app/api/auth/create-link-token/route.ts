import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { sql } from 'drizzle-orm';
import { createHmac, randomBytes } from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, existingLinkToken } = body;

    if (!patientId || !existingLinkToken) {
      return NextResponse.json(
        { error: 'patient_id_and_existing_link_token_required' },
        { status: 400 }
      );
    }

    // Validate existing linkToken first to ensure user has proper authorization
    const linkSecret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET;
    if (!linkSecret) {
      console.error('LINK_TOKEN_HMAC_SECRET not configured');
      return NextResponse.json(
        { error: 'service_configuration_error' },
        { status: 500 }
      );
    }

    const existingTokenHash = createHmac('sha256', linkSecret)
      .update(existingLinkToken)
      .digest('hex');

    // Validate existing link token (must be valid and not expired)
    const existingLinkTokenRecords = await db.execute(sql`
      SELECT patient_id
      FROM link_token
      WHERE token_hash = ${existingTokenHash}
      AND expires_at > NOW()
      LIMIT 1
    `);

    if (existingLinkTokenRecords.rows.length === 0) {
      return NextResponse.json(
        { error: 'invalid_or_expired_link_token' },
        { status: 401 }
      );
    }

    const primaryPatientId = (existingLinkTokenRecords.rows[0] as any).patient_id;

    // Verify the requested patient is either the primary patient or a family member
    const familyCheck = await db.execute(sql`
      SELECT 1 FROM (
        -- Primary patient themselves
        SELECT ${patientId}::uuid as id WHERE ${patientId}::uuid = ${primaryPatientId}::uuid
        UNION
        -- Family members where primary is guardian
        SELECT patient_id FROM family_access 
        WHERE guardian_patient_id = ${primaryPatientId}::uuid 
        AND patient_id = ${patientId}::uuid
        AND is_active = true
        UNION
        -- Family members where selected patient is guardian of primary
        SELECT guardian_patient_id FROM family_access 
        WHERE patient_id = ${primaryPatientId}::uuid 
        AND guardian_patient_id = ${patientId}::uuid
        AND is_active = true
      ) AS authorized_patients
      LIMIT 1
    `);

    if (familyCheck.rows.length === 0) {
      return NextResponse.json(
        { error: 'unauthorized_patient_access' },
        { status: 403 }
      );
    }

    // Create new linkToken for the selected patient
    const newLinkToken = randomBytes(32).toString('hex');
    const newTokenHash = createHmac('sha256', linkSecret)
      .update(newLinkToken)
      .digest('hex');

    // Insert new link token (expires in 15 minutes)
    await db.execute(sql`
      INSERT INTO link_token (patient_id, token_hash, used, verified, expires_at, created_at)
      VALUES (
        ${patientId}::uuid,
        ${newTokenHash},
        false,
        false,
        NOW() + INTERVAL '15 minutes',
        NOW()
      )
    `);

    return NextResponse.json({
      success: true,
      linkToken: newLinkToken,
      patientId,
    });
  } catch (error) {
    console.error('Create link token error:', error);
    return NextResponse.json(
      { error: 'service_error' },
      { status: 500 }
    );
  }
}

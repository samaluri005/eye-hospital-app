import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { sql } from 'drizzle-orm';
import { createHmac } from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, linkToken } = body;

    if (!patientId || !linkToken) {
      return NextResponse.json(
        { error: 'patient_id_and_link_token_required' },
        { status: 400 }
      );
    }

    // Validate linkToken
    const linkSecret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET;
    if (!linkSecret) {
      console.error('LINK_TOKEN_HMAC_SECRET not configured');
      return NextResponse.json(
        { error: 'service_configuration_error' },
        { status: 500 }
      );
    }

    const tokenHash = createHmac('sha256', linkSecret)
      .update(linkToken)
      .digest('hex');

    // Validate link token
    const linkTokenRecords = await db.execute(sql`
      SELECT id
      FROM link_token
      WHERE token_hash = ${tokenHash}
      AND patient_id = ${patientId}::uuid
      AND used = false
      AND expires_at > NOW()
      LIMIT 1
    `);

    if (linkTokenRecords.rows.length === 0) {
      return NextResponse.json(
        { error: 'invalid_or_expired_link_token' },
        { status: 401 }
      );
    }

    // Fetch patient DOB
    const patientRecords = await db.execute(sql`
      SELECT 
        dob,
        (SELECT COUNT(*) FROM patient_pin WHERE patient_id = ${patientId}::uuid) as has_pin
      FROM patient
      WHERE id = ${patientId}::uuid
      LIMIT 1
    `);

    if (patientRecords.rows.length === 0) {
      return NextResponse.json(
        { error: 'patient_not_found' },
        { status: 404 }
      );
    }

    const patient = patientRecords.rows[0] as any;

    return NextResponse.json({
      success: true,
      dob: patient.dob ? (typeof patient.dob === 'string' ? patient.dob.split('T')[0] : new Date(patient.dob).toISOString().split('T')[0]) : null,
      hasPin: parseInt(patient.has_pin) > 0,
    });
  } catch (error) {
    console.error('Patient info fetch error:', error);
    return NextResponse.json(
      { error: 'service_error' },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { patient, hipaaAuditLog } from '../../../../../lib/schema';
import { eq, sql } from 'drizzle-orm';
import { createHmac } from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, linkToken, profile } = body;

    if (!patientId || !linkToken || !profile) {
      return NextResponse.json(
        { error: 'missing_required_fields' },
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

    // Extract profile data
    const { firstName, middleName, lastName, dateOfBirth, gender, email } = profile;

    // Build full name
    const fullName = [firstName, middleName, lastName]
      .filter(Boolean)
      .join(' ')
      .trim();

    // Update patient record with profile data
    await db
      .update(patient)
      .set({
        firstName: firstName || null,
        middleName: middleName || null,
        lastName: lastName || null,
        fullName: fullName || null,
        dob: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        email: email || null,
        updatedAt: new Date(),
      })
      .where(eq(patient.patientId, patientId));

    // Log the profile update
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await db.insert(hipaaAuditLog).values({
      patientId,
      action: 'patient_profile_updated',
      actorId: patientId,
      actorType: 'patient',
      ipAddress: clientIp,
      userAgent,
      accessedData: {
        fields_updated: ['firstName', 'lastName', 'fullName', 'dob', 'gender', 'email'],
      },
      hipaaComplianceNote: 'Patient profile information updated during signup',
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Save profile error:', error);
    return NextResponse.json(
      { error: 'service_error' },
      { status: 500 }
    );
  }
}

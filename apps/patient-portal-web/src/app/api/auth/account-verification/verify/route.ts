import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../lib/db';
import { patient, hipaaAuditLog } from '../../../../../../lib/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, dob, linkToken } = body;

    // Validate required fields
    if (!patientId || !dob || !linkToken) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, dob, linkToken' },
        { status: 400 }
      );
    }

    // SECURITY: Validate linkToken before allowing verification
    const secret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET;
    if (!secret) {
      console.error('LINK_TOKEN_HMAC_SECRET not configured');
      return NextResponse.json(
        { error: 'service_configuration_error' },
        { status: 500 }
      );
    }

    const tokenHash = crypto.createHmac('sha256', secret).update(linkToken).digest('hex');

    // Validate linkToken exists, matches patient, and is not used/expired
    const linkTokenRecords = await db.execute(sql`
      SELECT id, patient_id, expires_at, used
      FROM link_token
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

    // Get patient data
    const patientData = await db
      .select()
      .from(patient)
      .where(eq(patient.patientId, patientId))
      .limit(1);

    if (patientData.length === 0) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    const patientRecord = patientData[0];

    // Validate DOB
    const providedDOB = new Date(dob);
    const storedDOB = patientRecord.dob ? new Date(patientRecord.dob) : null;

    if (!storedDOB) {
      // First-time verification: Save the DOB for new patients
      await db
        .update(patient)
        .set({ 
          dob: providedDOB,
          updatedAt: new Date()
        })
        .where(eq(patient.patientId, patientId));

      // Log DOB setup for new patient
      await db.insert(hipaaAuditLog).values({
        patientId,
        action: 'patient_dob_set',
        actorId: patientId,
        actorType: 'patient',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        accessedData: { dob: providedDOB.toISOString().split('T')[0] },
        hipaaComplianceNote: 'Patient date of birth set during first verification',
      });
    } else {
      // Existing patient: Compare dates (ignore time component)
      const dobMatches =
        providedDOB.getFullYear() === storedDOB.getFullYear() &&
        providedDOB.getMonth() === storedDOB.getMonth() &&
        providedDOB.getDate() === storedDOB.getDate();

      if (!dobMatches) {
        // Log failed DOB attempt
        await db.insert(hipaaAuditLog).values({
          patientId,
          action: 'verification_failed_dob_mismatch',
          actorId: patientId,
          actorType: 'patient',
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          accessedData: { reason: 'dob_mismatch' },
          hipaaComplianceNote: 'Failed verification - DOB mismatch',
        });

        return NextResponse.json(
          { error: 'Date of birth does not match' },
          { status: 401 }
        );
      }
    }

    // Mark linkToken as verified
    const linkTokenRecord = linkTokenRecords.rows[0] as any;
    await db.execute(sql`
      UPDATE link_token
      SET verified = true
      WHERE id = ${linkTokenRecord.id}
    `);

    // Log successful verification
    await db.insert(hipaaAuditLog).values({
      patientId,
      action: 'verification_success',
      actorId: patientId,
      actorType: 'patient',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      accessedData: { verified: true },
      hipaaComplianceNote: 'Successful verification (DOB)',
    });

    return NextResponse.json({
      status: 'verified',
      message: 'Verification successful',
      patientId,
    });
  } catch (error) {
    console.error('Account verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  }
}

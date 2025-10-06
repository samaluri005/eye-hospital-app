import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../lib/db';
import { patient, patientPin, hipaaAuditLog } from '../../../../../../lib/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import { hashPin } from '../../../../../../lib/argon2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, pin, pinConfirm, linkToken } = body;

    // Validate required fields
    if (!patientId || !pin || !pinConfirm || !linkToken) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, pin, pinConfirm, linkToken' },
        { status: 400 }
      );
    }

    // Validate PIN format (exactly 4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 4 digits' },
        { status: 400 }
      );
    }

    // Validate PIN confirmation match
    if (pin !== pinConfirm) {
      return NextResponse.json(
        { error: 'PINs do not match' },
        { status: 400 }
      );
    }

    // SECURITY: Validate linkToken before allowing PIN creation
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

    // Check if patient exists
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

    // Check if PIN already exists
    const existingPin = await db
      .select()
      .from(patientPin)
      .where(eq(patientPin.patientId, patientId))
      .limit(1);

    if (existingPin.length > 0) {
      return NextResponse.json(
        { error: 'PIN already set for this patient' },
        { status: 409 }
      );
    }

    // Generate salt and hash PIN with Argon2id
    const salt = crypto.randomBytes(16).toString('hex');
    const pinHash = await hashPin(pin, salt);

    // Store PIN
    await db.insert(patientPin).values({
      patientId,
      pinHash,
      salt,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Mark linkToken as verified (PIN creation counts as verification)
    const linkTokenRecord = linkTokenRecords.rows[0] as any;
    await db.execute(sql`
      UPDATE link_token
      SET verified = true
      WHERE id = ${linkTokenRecord.id}
    `);

    // Log PIN creation
    await db.insert(hipaaAuditLog).values({
      patientId,
      action: 'pin_created',
      actorId: patientId,
      actorType: 'patient',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      accessedData: { pinSet: true },
      hipaaComplianceNote: 'Patient created secure PIN for second-factor authentication',
    });

    return NextResponse.json({
      status: 'pin_set',
      message: 'PIN created successfully',
      patientId,
    });
  } catch (error) {
    console.error('Set PIN error:', error);
    return NextResponse.json(
      { error: 'Failed to set PIN' },
      { status: 500 }
    );
  }
}

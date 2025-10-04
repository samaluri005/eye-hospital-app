import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../lib/db';
import { patient, patientPin, hipaaAuditLog } from '../../../../../../lib/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

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

    // Generate salt and hash PIN
    const salt = crypto.randomBytes(16).toString('hex');
    const pinHash = await bcrypt.hash(pin + salt, 12);

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

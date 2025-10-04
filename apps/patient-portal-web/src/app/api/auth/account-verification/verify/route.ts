import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../lib/db';
import { patient, patientPin, hipaaAuditLog } from '../../../../../../lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, dob, pin, linkToken } = body;

    // Validate required fields
    if (!patientId || !dob || !pin || !linkToken) {
      return NextResponse.json(
        { error: 'Missing required fields: patientId, dob, pin, linkToken' },
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

    // Get PIN data (if exists)
    const pinData = await db
      .select()
      .from(patientPin)
      .where(eq(patientPin.patientId, patientId))
      .limit(1);

    // Check if account is locked
    if (pinData.length > 0 && pinData[0].lockedUntil) {
      const lockExpiry = new Date(pinData[0].lockedUntil);
      if (lockExpiry > new Date()) {
        const minutesLeft = Math.ceil((lockExpiry.getTime() - Date.now()) / 60000);
        return NextResponse.json(
          {
            error: 'Account temporarily locked due to too many failed attempts',
            lockedUntil: lockExpiry.toISOString(),
            minutesLeft,
          },
          { status: 423 }
        );
      }
    }

    // Validate DOB
    const providedDOB = new Date(dob);
    const storedDOB = patientRecord.dob ? new Date(patientRecord.dob) : null;

    if (!storedDOB) {
      return NextResponse.json(
        { error: 'Date of birth not set for this patient' },
        { status: 400 }
      );
    }

    // Compare dates (ignore time component)
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
        hipaaComplianceNote: 'Failed second-factor verification - DOB mismatch',
      });

      return NextResponse.json(
        { error: 'Date of birth does not match' },
        { status: 401 }
      );
    }

    // If no PIN exists, user needs to set one
    if (pinData.length === 0) {
      return NextResponse.json(
        {
          status: 'pin_required',
          message: 'Please set a PIN to secure your account',
        },
        { status: 200 }
      );
    }

    // Validate PIN
    const pinRecord = pinData[0];
    const isValidPin = await bcrypt.compare(pin + pinRecord.salt, pinRecord.pinHash);

    if (!isValidPin) {
      // Increment failed attempts
      const newFailedAttempts = (pinRecord.failedAttempts || 0) + 1;
      const lockDuration = newFailedAttempts >= 5 ? 15 * 60 * 1000 : null; // 15 minutes
      const lockedUntil = lockDuration ? new Date(Date.now() + lockDuration) : null;

      await db
        .update(patientPin)
        .set({
          failedAttempts: newFailedAttempts,
          lockedUntil,
          updatedAt: new Date(),
        })
        .where(eq(patientPin.patientId, patientId));

      // Log failed PIN attempt
      await db.insert(hipaaAuditLog).values({
        patientId,
        action: 'verification_failed_pin_mismatch',
        actorId: patientId,
        actorType: 'patient',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        accessedData: {
          failedAttempts: newFailedAttempts,
          locked: newFailedAttempts >= 5,
        },
        hipaaComplianceNote: `Failed second-factor verification - PIN mismatch (attempt ${newFailedAttempts})`,
      });

      if (lockedUntil) {
        return NextResponse.json(
          {
            error: 'Too many failed attempts. Account locked for 15 minutes.',
            lockedUntil: lockedUntil.toISOString(),
          },
          { status: 423 }
        );
      }

      return NextResponse.json(
        {
          error: 'Incorrect PIN',
          attemptsRemaining: 5 - newFailedAttempts,
        },
        { status: 401 }
      );
    }

    // PIN is correct - reset failed attempts
    await db
      .update(patientPin)
      .set({
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date(),
      })
      .where(eq(patientPin.patientId, patientId));

    // Log successful verification
    await db.insert(hipaaAuditLog).values({
      patientId,
      action: 'second_factor_verification_success',
      actorId: patientId,
      actorType: 'patient',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      accessedData: { verified: true },
      hipaaComplianceNote: 'Successful second-factor verification (DOB + PIN)',
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

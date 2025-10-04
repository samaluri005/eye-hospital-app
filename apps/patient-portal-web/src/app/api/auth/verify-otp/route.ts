import { NextRequest, NextResponse } from 'next/server';
import { verifyRecaptchaToken, getActionThreshold } from '../../../../../lib/recaptcha';
import { db } from '../../../../../lib/db';
import { otpAttempt, patient, linkToken } from '../../../../../lib/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

const OTP_HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'default-secret-key-change-in-production';
const LINK_TOKEN_HMAC_SECRET = process.env.LINK_TOKEN_HMAC_SECRET || 'default-link-secret-change-in-production';

function computeHmac(otp: string): string {
  const hmac = crypto.createHmac('sha256', OTP_HMAC_SECRET);
  hmac.update(otp);
  return hmac.digest('hex');
}

function generateLinkToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function computeLinkTokenHash(token: string): string {
  const hmac = crypto.createHmac('sha256', LINK_TOKEN_HMAC_SECRET);
  hmac.update(token);
  return hmac.digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp, recaptchaToken } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    if (!recaptchaToken) {
      console.error('reCAPTCHA token missing for verify-otp request');
      return NextResponse.json(
        {
          error: 'recaptcha_required',
          message: 'Security verification is required. Please refresh and try again.',
        },
        { status: 400 }
      );
    }

    const threshold = getActionThreshold('verify');
    const verification = await verifyRecaptchaToken(
      recaptchaToken,
      'verify',
      threshold
    );

    if (!verification.isValid) {
      console.warn('reCAPTCHA verification failed:', verification.reason, 'Score:', verification.score);
      return NextResponse.json(
        {
          error: 'bot_detection_failed',
          message: 'Security verification failed. Please try again.',
          recaptchaScore: verification.score,
        },
        { status: 403 }
      );
    }

    console.info('reCAPTCHA verification passed. Score:', verification.score);

    const otpHash = computeHmac(otp);

    const attempts = await db.select()
      .from(otpAttempt)
      .where(
        and(
          eq(otpAttempt.phone, phone),
          eq(otpAttempt.otpHash, otpHash),
          gt(otpAttempt.expiresAt, new Date()),
          isNull(otpAttempt.verifiedAt)
        )
      )
      .limit(1);

    if (attempts.length === 0) {
      const expiredAttempts = await db.select()
        .from(otpAttempt)
        .where(eq(otpAttempt.phone, phone))
        .orderBy(otpAttempt.createdAt)
        .limit(1);

      if (expiredAttempts.length > 0 && expiredAttempts[0].expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'OTP expired. Please request a new code.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid OTP code. Please try again.' },
        { status: 400 }
      );
    }

    await db.update(otpAttempt)
      .set({ verifiedAt: new Date() })
      .where(eq(otpAttempt.id, attempts[0].id));

    let existingPatient = await db.select()
      .from(patient)
      .where(eq(patient.phone, phone))
      .limit(1);

    let patientId: string;

    if (existingPatient.length === 0) {
      const newPatient = await db.insert(patient)
        .values({
          phone,
          status: 'active',
        })
        .returning();
      
      patientId = newPatient[0].patientId;
      console.log(`✅ Created new patient: ${patientId}`);
    } else {
      patientId = existingPatient[0].patientId;
      console.log(`✅ Existing patient found: ${patientId}`);
    }

    const token = generateLinkToken();
    const tokenHash = computeLinkTokenHash(token);
    const tokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await db.insert(linkToken).values({
      tokenHash,
      patientId,
      expiresAt: tokenExpiresAt,
      used: false,
    });

    return NextResponse.json({
      success: true,
      patientId,
      linkToken: token,
      message: 'OTP verified successfully',
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

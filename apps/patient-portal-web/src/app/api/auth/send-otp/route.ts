import { NextRequest, NextResponse } from 'next/server';
import { verifyRecaptchaToken, getActionThreshold } from '../../../../../lib/recaptcha';
import { db } from '../../../../../lib/db';
import { otpAttempt } from '../../../../../lib/schema';
import { eq, and, gt } from 'drizzle-orm';
import crypto from 'crypto';
import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

const OTP_HMAC_SECRET = process.env.OTP_HMAC_SECRET || 'default-secret-key-change-in-production';

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function computeHmac(otp: string): string {
  const hmac = crypto.createHmac('sha256', OTP_HMAC_SECRET);
  hmac.update(otp);
  return hmac.digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, recaptchaToken } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    if (!recaptchaToken) {
      console.error('reCAPTCHA token missing for send-otp request');
      return NextResponse.json(
        {
          error: 'recaptcha_required',
          message: 'Security verification is required. Please refresh and try again.',
        },
        { status: 400 }
      );
    }

    const threshold = getActionThreshold('signup');
    const verification = await verifyRecaptchaToken(
      recaptchaToken,
      'signup',
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

    const existingAttempts = await db.select()
      .from(otpAttempt)
      .where(
        and(
          eq(otpAttempt.phone, phone),
          gt(otpAttempt.expiresAt, new Date())
        )
      )
      .orderBy(otpAttempt.createdAt)
      .limit(1);

    if (existingAttempts.length > 0) {
      const lastAttempt = existingAttempts[0];
      const timeSinceLastAttempt = Date.now() - lastAttempt.createdAt!.getTime();
      const cooldownMs = 60000;

      if (timeSinceLastAttempt < cooldownMs) {
        const waitSeconds = Math.ceil((cooldownMs - timeSinceLastAttempt) / 1000);
        return NextResponse.json(
          {
            error: 'rate_limit',
            message: `Please wait ${waitSeconds} seconds before requesting a new code`,
            waitSeconds,
          },
          { status: 429 }
        );
      }
    }

    const otp = generateOtp();
    const otpHash = computeHmac(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otpAttempt).values({
      phone,
      otpHash,
      expiresAt,
      attemptCount: 0,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    });

    try {
      if (process.env.TWILIO_FROM_NUMBER && process.env.TWILIO_ACCOUNT_SID) {
        const message = await twilioClient.messages.create({
          body: `Your Eye Hospital verification code is: ${otp}. Valid for 10 minutes.`,
          from: process.env.TWILIO_FROM_NUMBER,
          to: phone,
        });
        console.log(`✅ OTP sent to ${phone}, SID: ${message.sid}`);
      } else {
        console.warn('⚠️  Twilio not configured, OTP not sent. Code:', otp);
      }
    } catch (twilioError) {
      console.error('❌ Failed to send SMS:', twilioError);
      return NextResponse.json(
        {
          error: 'sms_failed',
          message: 'Failed to send verification code. Please try again.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent successfully',
      expiresIn: 600,
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

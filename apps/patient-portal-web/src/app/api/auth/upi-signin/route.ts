import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, rateLimitConfigs } from '../../../../../lib/rateLimiter';
import { sessionService } from '../../../../../lib/sessionService';
import { db } from '../../../../../lib/db';
import { patient, users, credentials, hipaaAuditLog } from '../../../../../lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verify } from '@node-rs/argon2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { upi, password, rememberMe } = body;

    if (!upi || !password) {
      return NextResponse.json(
        { error: 'UPI and password are required' },
        { status: 400 }
      );
    }

    // Rate limiting by UPI
    const rateLimit = await rateLimiter.checkRateLimit(
      `signin:upi:${upi}`,
      rateLimitConfigs.otpVerify // Reuse OTP verify config (5 attempts per 15 minutes)
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many sign-in attempts. Please try again later.',
          resetTime: rateLimit.resetTime
        },
        { status: 429 }
      );
    }

    // Find patient by UPI
    const patientRecords = await db.execute(sql`
      SELECT patient_id, upi, full_name FROM patient WHERE upi = ${upi} LIMIT 1
    `);

    if (patientRecords.rows.length === 0) {
      return NextResponse.json(
        { error: 'invalid_credentials', message: 'Invalid UPI or password' },
        { status: 401 }
      );
    }

    const patientRecord = patientRecords.rows[0] as any;
    const patientId = patientRecord.patient_id;

    // Find user account
    const userRecords = await db.execute(sql`
      SELECT user_id, patient_id, is_locked, mfa_enabled FROM users WHERE patient_id = ${patientId}::uuid LIMIT 1
    `);

    if (userRecords.rows.length === 0) {
      return NextResponse.json(
        { error: 'incomplete_signup', message: 'Please complete your account setup' },
        { status: 401 }
      );
    }

    const userRecord = userRecords.rows[0] as any;
    const userId = userRecord.user_id;
    const isLocked = userRecord.is_locked;
    const mfaEnabled = userRecord.mfa_enabled;

    // Check if locked
    if (isLocked) {
      return NextResponse.json(
        { error: 'account_locked', message: 'Account is locked' },
        { status: 423 }
      );
    }

    // Find password credential
    const credentialRecords = await db.execute(sql`
      SELECT credential_id, password_hash FROM credentials 
      WHERE user_id = ${userId}::uuid AND credential_type = 'password'
      LIMIT 1
    `);

    if (credentialRecords.rows.length === 0) {
      return NextResponse.json(
        { error: 'incomplete_signup', message: 'Please complete your account setup' },
        { status: 401 }
      );
    }

    const credentialRecord = credentialRecords.rows[0] as any;
    const passwordHash = credentialRecord.password_hash;

    // Verify password using @node-rs/argon2 (same library used during signup)
    // NOTE: Don't pass Argon2 params - verify() reads them from the hash itself
    const pepper = process.env.ARGON2_PEPPER;
    if (!pepper) {
      console.error('ARGON2_PEPPER not configured');
      return NextResponse.json(
        { error: 'service_configuration_error' },
        { status: 500 }
      );
    }

    const passwordWithPepper = password + pepper;
    let isValid = false;
    try {
      // Let verify() read parameters from the hash (no hardcoded params)
      isValid = await verify(passwordHash, passwordWithPepper);
    } catch (error) {
      console.error('Password verification error:', error);
      isValid = false;
    }

    if (!isValid) {
      // Increment rate limiter on failure
      await rateLimiter.checkRateLimit(
        `signin:upi:${upi}`,
        rateLimitConfigs.otpVerify
      );

      // Audit failed attempt
      const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      await db.insert(hipaaAuditLog).values({
        patientId,
        action: 'upi_signin_failed',
        actorId: patientId,
        actorType: 'patient',
        ipAddress,
        userAgent,
        accessedData: { reason: 'invalid_password', upi },
        hipaaComplianceNote: 'Failed UPI sign-in attempt',
      });

      return NextResponse.json(
        { error: 'invalid_credentials', message: 'Invalid UPI or password' },
        { status: 401 }
      );
    }

    // Check if MFA is enabled and credential exists
    let requireMfa = false;
    if (mfaEnabled) {
      const mfaCredentialRecords = await db.execute(sql`
        SELECT credential_id FROM credentials 
        WHERE user_id = ${userId}::uuid AND (credential_type = 'totp' OR pin_hash IS NOT NULL)
        LIMIT 1
      `);

      if (mfaCredentialRecords.rows.length === 0) {
        // MFA enabled but no credentials found - data inconsistency error
        console.error(`MFA enabled for user ${userId} but no MFA credentials found`);
        
        await db.insert(hipaaAuditLog).values({
          patientId,
          action: 'upi_signin_mfa_error',
          actorId: patientId,
          actorType: 'patient',
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          accessedData: { reason: 'mfa_enabled_but_no_credentials', userId },
          hipaaComplianceNote: 'MFA configuration error detected',
        });

        return NextResponse.json(
          { error: 'mfa_configuration_error', message: 'Account MFA settings are misconfigured. Please contact support.' },
          { status: 500 }
        );
      }

      requireMfa = true;
    }

    // Audit successful login
    const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await db.insert(hipaaAuditLog).values({
      patientId,
      action: 'upi_signin_success',
      actorId: patientId,
      actorType: 'patient',
      ipAddress,
      userAgent,
      accessedData: { userId, mfaEnabled, mfaRequired: requireMfa, upi },
      hipaaComplianceNote: 'Successful UPI sign-in',
    });

    // Check if MFA is required
    if (requireMfa) {
      const tempToken = await sessionService.createOtpSession(
        upi,
        ipAddress,
        { userAgent },
        undefined,
        patientId
      );

      return NextResponse.json({
        mfaRequired: true,
        tempToken,
        mfaMethods: ['totp'],
      });
    }

    // No MFA required - create session directly
    const session = await sessionService.createAuthenticatedSession(
      patientId,
      ipAddress,
      { userAgent }
    );
    const sessionToken = session.sessionToken;

    const responseObj = NextResponse.json({
      success: true,
      sessionToken,
      patientId,
    });

    // Set HTTP-only cookie
    const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day
    responseObj.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });

    return responseObj;
  } catch (error) {
    console.error('UPI sign-in error:', error);
    return NextResponse.json(
      { error: 'Failed to sign in with UPI' },
      { status: 500 }
    );
  }
}

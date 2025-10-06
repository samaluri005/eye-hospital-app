import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, rateLimitConfigs } from '../../../../../lib/rateLimiter';
import { sessionService } from '../../../../../lib/sessionService';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8000';

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

    // Call Auth Service to validate UPI + password
    // TODO: This endpoint needs to be implemented in the Auth Service
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/upi-signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ upi, password }),
    });

    let data;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { error: 'service_error', message: text.substring(0, 200) };
    }
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Check if MFA is required
    if (data.mfaRequired) {
      // Create temporary session token for MFA verification
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      const tempToken = await sessionService.createOtpSession(
        upi,
        ipAddress,
        { userAgent, type: 'mfa_pending', patientId: data.patientId }
      );

      return NextResponse.json({
        mfaRequired: true,
        tempToken,
        mfaMethods: data.mfaMethods || ['totp'],
      });
    }

    // No MFA required - create session directly
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const sessionToken = await sessionService.createSession(
      data.patientId,
      ipAddress,
      { userAgent }
    );

    const responseObj = NextResponse.json({
      success: true,
      sessionToken,
      patientId: data.patientId,
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

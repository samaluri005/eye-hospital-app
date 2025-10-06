import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, rateLimitConfigs } from '../../../../../lib/rateLimiter';
import { sessionService } from '../../../../../lib/sessionService';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tempToken, mfaCode } = body;

    if (!tempToken || !mfaCode) {
      return NextResponse.json(
        { error: 'Temporary token and MFA code are required' },
        { status: 400 }
      );
    }

    // Validate temp token
    const tempSession = await sessionService.validateSession(tempToken);
    if (!tempSession || !tempSession.metadata?.patientId) {
      return NextResponse.json(
        { error: 'Invalid or expired temporary session' },
        { status: 401 }
      );
    }

    const patientId = tempSession.metadata.patientId;

    // Rate limiting by patient ID
    const rateLimit = await rateLimiter.checkRateLimit(
      `mfa:verify:${patientId}`,
      rateLimitConfigs.otpVerify // 5 attempts per 15 minutes
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many MFA attempts. Please try again later.',
          resetTime: rateLimit.resetTime
        },
        { status: 429 }
      );
    }

    // Call Auth Service to verify MFA code
    // TODO: This endpoint needs to be implemented in the Auth Service
    const response = await fetch(`${AUTH_SERVICE_URL}/auth/verify-mfa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ patientId, mfaCode }),
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

    // MFA verified - create permanent session
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const sessionToken = await sessionService.createSession(
      patientId,
      ipAddress,
      { userAgent }
    );

    // Invalidate temp session
    await sessionService.revokeSession(tempToken);

    const responseObj = NextResponse.json({
      success: true,
      sessionToken,
      patientId,
    });

    // Set HTTP-only cookie
    responseObj.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 1 day
      path: '/',
    });

    return responseObj;
  } catch (error) {
    console.error('MFA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify MFA code' },
      { status: 500 }
    );
  }
}

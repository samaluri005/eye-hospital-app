import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, rateLimitConfigs } from '../../../../../lib/rateLimiter';
import { sessionService } from '../../../../../lib/sessionService';
import { cookies } from 'next/headers';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, otp } = body;

    if (!phone || !otp) {
      return NextResponse.json(
        { error: 'Phone number and OTP are required' },
        { status: 400 }
      );
    }

    const rateLimit = await rateLimiter.checkRateLimit(
      `otp:verify:${phone}`,
      rateLimitConfigs.otpVerify
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many verification attempts. Please try again later.',
          resetTime: rateLimit.resetTime
        },
        { status: 429 }
      );
    }
    
    const response = await fetch(`${AUTH_SERVICE_URL}/signup/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, otp }),
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

    if (data.status === 'verified' && data.patientId) {
      await sessionService.invalidateAllPatientSessions(data.patientId);

      const userAgent = request.headers.get('user-agent') || 'Unknown';
      const forwardedFor = request.headers.get('x-forwarded-for');
      const realIp = request.headers.get('x-real-ip');
      const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'Unknown');

      const deviceInfo = {
        userAgent,
      };

      const session = await sessionService.createAuthenticatedSession(
        data.patientId,
        ipAddress,
        deviceInfo
      );

      const cookieStore = await cookies();
      cookieStore.set('session_token', session.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Auth service connection error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to auth service' },
      { status: 500 }
    );
  }
}

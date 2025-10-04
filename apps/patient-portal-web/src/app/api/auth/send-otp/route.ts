import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, rateLimitConfigs } from '../../../../../lib/rateLimiter';
import { sessionService } from '../../../../../lib/sessionService';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const rateLimit = await rateLimiter.checkRateLimit(
      `otp:send:${phone}`,
      rateLimitConfigs.otpSend
    );

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: 'Too many OTP requests. Please try again later.',
          resetTime: rateLimit.resetTime
        },
        { status: 429 }
      );
    }

    const response = await fetch(`${AUTH_SERVICE_URL}/signup/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone }),
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

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const sessionToken = await sessionService.createOtpSession(
      phone,
      ipAddress,
      { userAgent }
    );

    return NextResponse.json({
      ...data,
      sessionToken,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      }
    });
  } catch (error) {
    console.error('Auth service connection error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to auth service' },
      { status: 500 }
    );
  }
}

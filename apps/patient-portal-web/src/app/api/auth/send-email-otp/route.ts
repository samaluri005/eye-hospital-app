import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, rateLimitConfigs } from '../../../../../lib/rateLimiter';
import { sessionService } from '../../../../../lib/sessionService';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, recaptchaToken } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format' },
        { status: 400 }
      );
    }

    // Rate limiting
    const rateLimit = await rateLimiter.checkRateLimit(
      `otp:send:${email}`,
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

    // TODO: Verify reCAPTCHA token
    // For now, we'll skip reCAPTCHA verification in development
    // In production, verify the token with Google reCAPTCHA API

    // Call Auth Service to send email OTP
    // Note: This endpoint may need to be implemented in the Auth Service
    const response = await fetch(`${AUTH_SERVICE_URL}/signup/start-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
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
      email,
      ipAddress,
      { userAgent }
    );

    return NextResponse.json({
      status: 'otp_sent',
      email,
      sessionToken,
      rateLimit: {
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      }
    });
  } catch (error) {
    console.error('Email OTP service error:', error);
    return NextResponse.json(
      { error: 'Failed to send email OTP' },
      { status: 500 }
    );
  }
}

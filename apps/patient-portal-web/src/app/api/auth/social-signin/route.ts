import { NextRequest, NextResponse } from 'next/server';
import { rateLimiter, rateLimitConfigs } from '../../../../../lib/rateLimiter';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, entraObjectId, provider } = body;

    if (!email || !entraObjectId) {
      return NextResponse.json(
        { error: 'Email and Entra Object ID are required' },
        { status: 400 }
      );
    }

    // Rate limiting by email
    const rateLimit = await rateLimiter.checkRateLimit(
      `social:signin:${email}`,
      rateLimitConfigs.otpVerify
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

    // Call Auth Service EMPI matching to find patients by email
    const empiResponse = await fetch(`${AUTH_SERVICE_URL}/empi/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        firstName: name?.split(' ')[0] || '',
        lastName: name?.split(' ').slice(1).join(' ') || '',
      }),
    });

    let empiData;
    const contentType = empiResponse.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      empiData = await empiResponse.json();
    } else {
      const text = await empiResponse.text();
      empiData = { matches: [] };
    }

    const matches = empiData.matches || [];

    // Create link token for the flow
    const linkTokenResponse = await fetch(`${AUTH_SERVICE_URL}/auth/create-link-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identifier: email }),
    });

    const linkTokenData = await linkTokenResponse.json();
    const linkToken = linkTokenData.linkToken;

    if (matches.length === 0) {
      // No matches - create new patient
      const createResponse = await fetch(`${AUTH_SERVICE_URL}/staff/create_patient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: name?.split(' ')[0] || 'Unknown',
          lastName: name?.split(' ').slice(1).join(' ') || 'User',
          email,
          entraObjectId,
        }),
      });

      const createData = await createResponse.json();

      return NextResponse.json({
        accountCount: 1,
        accounts: [{
          patientId: createData.upi,
          name: name || 'Unknown User',
          upi: createData.upi,
          hasProfile: false,
          isPrimary: true,
        }],
        primaryPatientId: createData.upi,
        linkToken,
        flow: 'new_patient',
      });
    } else if (matches.length === 1) {
      // Single match - go to verification
      const patient = matches[0];
      return NextResponse.json({
        accountCount: 1,
        accounts: [{
          patientId: patient.upi,
          name: `${patient.firstName} ${patient.lastName}`,
          upi: patient.upi,
          hasProfile: true,
          isPrimary: true,
        }],
        primaryPatientId: patient.upi,
        linkToken,
        flow: 'single_match',
      });
    } else {
      // Multiple matches - show account selection
      const accounts = matches.map((patient: any, index: number) => ({
        patientId: patient.upi,
        name: `${patient.firstName} ${patient.lastName}`,
        upi: patient.upi,
        hasProfile: true,
        isPrimary: index === 0,
      }));

      return NextResponse.json({
        accountCount: matches.length,
        accounts,
        primaryPatientId: matches[0].upi,
        linkToken,
        flow: 'multi_match',
      });
    }
  } catch (error) {
    console.error('Social sign-in error:', error);
    return NextResponse.json(
      { error: 'Failed to process social sign-in' },
      { status: 500 }
    );
  }
}

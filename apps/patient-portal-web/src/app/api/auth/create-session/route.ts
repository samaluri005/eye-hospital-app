import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '../../../../../lib/sessionService';
import { db } from '../../../../../lib/db';
import { sql } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId, linkToken } = body;

    if (!patientId || !linkToken) {
      return NextResponse.json(
        { error: 'Patient ID and link token are required' },
        { status: 400 }
      );
    }

    // Validate linkToken
    const secret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      );
    }

    const tokenHash = crypto.createHmac('sha256', secret).update(linkToken).digest('hex');

    // Verify linkToken is valid and mark as used atomically
    const linkTokenRecords = await db.execute(sql`
      UPDATE link_token
      SET used = true, used_at = NOW()
      WHERE token_hash = ${tokenHash}
      AND patient_id = ${patientId}::uuid
      AND used = false
      AND expires_at > NOW()
      RETURNING id
    `);

    if (linkTokenRecords.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid, expired, or already used link token' },
        { status: 401 }
      );
    }

    // Create authenticated session
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (request.headers.get('x-real-ip') || 'unknown');
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const session = await sessionService.createAuthenticatedSession(
      patientId,
      ipAddress,
      { userAgent }
    );

    const response = NextResponse.json({
      success: true,
      sessionToken: session.sessionToken,
    });

    // Set HTTP-only session cookie
    response.cookies.set('session_token', session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 1 day
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Create session error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

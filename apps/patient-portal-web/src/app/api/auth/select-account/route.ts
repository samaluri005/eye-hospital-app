import { NextResponse } from 'next/server';
import { createSession } from '../../../../../lib/sessionService';
import { sql } from '@vercel/postgres';
import { createHash, createHmac } from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, linkToken } = body;

    if (!patientId || !linkToken) {
      return NextResponse.json(
        { error: 'patient_id_and_link_token_required' },
        { status: 400 }
      );
    }

    // SECURITY: Validate linkToken before creating session
    const linkSecret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET;
    if (!linkSecret) {
      console.error('LINK_TOKEN_HMAC_SECRET not configured');
      return NextResponse.json(
        { error: 'service_configuration_error' },
        { status: 500 }
      );
    }

    // Hash the linkToken to compare with database
    const tokenHash = createHmac('sha256', linkSecret)
      .update(linkToken)
      .digest('hex');

    // Query the link_token table to validate
    const { rows } = await sql`
      SELECT id, patient_id, expires_at, used
      FROM link_token
      WHERE token_hash = ${tokenHash}
      AND patient_id = ${patientId}
      AND used = false
      AND expires_at > NOW()
      LIMIT 1
    `;

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'invalid_or_expired_link_token' },
        { status: 401 }
      );
    }

    const linkTokenRecord = rows[0];

    // Mark token as used (one-time use only)
    await sql`
      UPDATE link_token
      SET used = true, used_at = NOW()
      WHERE id = ${linkTokenRecord.id}
    `;

    // Create secure session for the selected patient account
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const sessionToken = await createSession(
      patientId,
      clientIp,
      userAgent,
      false // existing user
    );

    // Create response with HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      patientId,
    });

    // Set HTTP-only cookie with the session token
    response.cookies.set('session_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Select account error:', error);
    return NextResponse.json(
      { error: 'service_error' },
      { status: 500 }
    );
  }
}

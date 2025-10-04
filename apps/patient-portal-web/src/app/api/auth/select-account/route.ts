import { NextResponse } from 'next/server';
import { createSession } from '../../../../../lib/sessionService';

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

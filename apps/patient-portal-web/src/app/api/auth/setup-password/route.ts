import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { credentials, hipaaAuditLog } from '../../../../../lib/schema';
import { eq, sql } from 'drizzle-orm';
import { createHmac } from 'crypto';
import { hash } from '@node-rs/argon2';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, password, confirmPassword, linkToken } = body;

    if (!patientId || !password || !confirmPassword || !linkToken) {
      return NextResponse.json(
        { error: 'missing_required_fields' },
        { status: 400 }
      );
    }

    // Validate passwords match
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'passwords_do_not_match' },
        { status: 400 }
      );
    }

    // Validate password strength (8+ chars minimum)
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'password_too_weak', message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Validate linkToken
    const linkSecret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET;
    if (!linkSecret) {
      console.error('LINK_TOKEN_HMAC_SECRET not configured');
      return NextResponse.json(
        { error: 'service_configuration_error' },
        { status: 500 }
      );
    }

    const tokenHash = createHmac('sha256', linkSecret)
      .update(linkToken)
      .digest('hex');

    // Validate link token
    const linkTokenRecords = await db.execute(sql`
      SELECT id
      FROM link_token
      WHERE token_hash = ${tokenHash}
      AND patient_id = ${patientId}::uuid
      AND used = false
      AND expires_at > NOW()
      LIMIT 1
    `);

    if (linkTokenRecords.rows.length === 0) {
      return NextResponse.json(
        { error: 'invalid_or_expired_link_token' },
        { status: 401 }
      );
    }

    // Check if user exists for this patient, create if not
    const userRecords = await db.execute(sql`
      SELECT user_id FROM users WHERE patient_id = ${patientId}::uuid LIMIT 1
    `);

    let userId: string;
    
    if (userRecords.rows.length === 0) {
      // Create user record for this patient
      const newUserRecords = await db.execute(sql`
        INSERT INTO users (patient_id, created_at)
        VALUES (${patientId}::uuid, NOW())
        RETURNING user_id
      `);
      userId = (newUserRecords.rows[0] as any).user_id;
    } else {
      userId = (userRecords.rows[0] as any).user_id;
    }

    // Check if password credential already exists
    const existingCreds = await db.execute(sql`
      SELECT credential_id FROM credentials 
      WHERE user_id = ${userId}::uuid AND credential_type = 'password'
      LIMIT 1
    `);

    if (existingCreds.rows.length > 0) {
      return NextResponse.json(
        { error: 'password_already_set', message: 'This account already has a password' },
        { status: 400 }
      );
    }

    // Get pepper from environment
    const pepper = process.env.ARGON2_PEPPER;
    if (!pepper) {
      console.error('ARGON2_PEPPER not configured');
      return NextResponse.json(
        { error: 'service_configuration_error' },
        { status: 500 }
      );
    }

    // Hash password with Argon2id (pepper is applied by combining with password)
    const passwordWithPepper = password + pepper;
    const passwordHash = await hash(passwordWithPepper, {
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    // Store credentials
    await db.execute(sql`
      INSERT INTO credentials (user_id, credential_type, password_hash, created_at)
      VALUES (${userId}::uuid, 'password', ${passwordHash}, NOW())
    `);

    // Log password creation
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await db.insert(hipaaAuditLog).values({
      patientId,
      action: 'password_created',
      actorId: patientId,
      actorType: 'patient',
      ipAddress: clientIp,
      userAgent,
      accessedData: { event: 'password_setup_during_signup' },
      hipaaComplianceNote: 'Patient password created during account registration',
    });

    return NextResponse.json({
      success: true,
      message: 'Password set successfully',
    });
  } catch (error) {
    console.error('Password setup error:', error);
    return NextResponse.json(
      { error: 'service_error', message: 'Failed to set up password' },
      { status: 500 }
    );
  }
}

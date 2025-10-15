import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createHmac, randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../../../../../lib/db";
import { patient, linkToken as linkTokenTable, hipaaAuditLog } from "../../../../../lib/schema";
import { hash } from '@node-rs/argon2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profile } = body;

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "Profile data is required" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!profile.firstName || !profile.lastName || !profile.dateOfBirth || !profile.gender) {
      return NextResponse.json(
        { success: false, message: "Missing required profile fields" },
        { status: 400 }
      );
    }

    // EMPI check already done after Step 1, proceed directly to patient creation
    // Step 1: Create patient record
    const patientId = uuidv4();
    
    // Generate UPI locally (same algorithm as Auth Service)
    // Format: UPI-{GUID-first-8-chars-uppercase}
    const generatedUpi = `UPI-${uuidv4().substring(0, 8).toUpperCase()}`;

    // Create patient in database
    const fullName = [profile.title, profile.firstName, profile.middleName, profile.lastName]
      .filter(Boolean)
      .join(" ");

    // Build present address JSONB
    const presentAddress = (profile.addressLine1 || profile.city) ? {
      line1: profile.addressLine1 || '',
      line2: profile.addressLine2 || '',
      city: profile.city || '',
      state: profile.state || '',
      postalCode: profile.postalCode || '',
      country: profile.country || 'India'
    } : null;

    await db.insert(patient).values({
      patientId,
      upi: generatedUpi,
      title: profile.title || null,
      firstName: profile.firstName,
      middleName: profile.middleName || null,
      lastName: profile.lastName,
      fullName,
      dob: new Date(profile.dateOfBirth),
      gender: profile.gender,
      phone: profile.mobile || null,
      mobile: profile.mobile || null,
      email: profile.email || null,
      patientType: profile.patientType || null,
      guardianName: profile.guardianName || null,
      govtIdType: profile.govtIdType || null,
      govtIdNumber: profile.govtIdNumber || null,
      addresses: presentAddress ? JSON.stringify([presentAddress]) : null,
      empiStatus: 'unknown',
      empiScore: null,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Step 2: Create user account and password credentials if password provided
    if (profile.password) {
      // Create user record
      const newUserRecords = await db.execute(sql`
        INSERT INTO users (patient_id, created_at)
        VALUES (${patientId}::uuid, NOW())
        RETURNING user_id
      `);
      const userId = (newUserRecords.rows[0] as any).user_id;

      // Get pepper from environment
      const pepper = process.env.ARGON2_PEPPER;
      if (!pepper) {
        console.error('ARGON2_PEPPER not configured');
        return NextResponse.json(
          { success: false, message: 'Service configuration error' },
          { status: 500 }
        );
      }

      // Hash password with Argon2id
      const passwordWithPepper = profile.password + pepper;
      const passwordHash = await hash(passwordWithPepper, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      });

      // Store password credentials
      await db.execute(sql`
        INSERT INTO credentials (user_id, credential_type, password_hash, created_at)
        VALUES (${userId}::uuid, 'password', ${passwordHash}, NOW())
      `);

      // Log password creation
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                      request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      await db.insert(hipaaAuditLog).values({
        patientId,
        action: 'account_created',
        actorId: patientId,
        actorType: 'patient',
        ipAddress: clientIp,
        userAgent,
        accessedData: { event: 'patient_account_created_with_password', upi: generatedUpi },
        hipaaComplianceNote: 'Patient account created during registration with password credentials',
      });
    }

    // Step 3: Create linkToken for subsequent auth flow
    const linkSecret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET;
    if (!linkSecret) {
      console.error('LINK_TOKEN_HMAC_SECRET not configured');
      return NextResponse.json(
        { success: false, message: 'Service configuration error' },
        { status: 500 }
      );
    }

    const linkToken = randomBytes(32).toString('hex');
    const tokenHash = createHmac('sha256', linkSecret)
      .update(linkToken)
      .digest('hex');

    // Insert link token (expires in 15 minutes)
    await db.execute(sql`
      INSERT INTO link_token (patient_id, token_hash, used, verified, expires_at, created_at)
      VALUES (
        ${patientId}::uuid,
        ${tokenHash},
        false,
        false,
        NOW() + INTERVAL '15 minutes',
        NOW()
      )
    `);

    return NextResponse.json({
      success: true,
      patientId,
      upi: generatedUpi,
      linkToken,
      message: "Patient created successfully",
    });

  } catch (error: any) {
    console.error("Error creating patient:", error);
    
    // SECURITY: Do NOT leak account existence via constraint errors
    // Log detailed error server-side but return generic message to client
    return NextResponse.json(
      { success: false, message: "Unable to create patient account. Please try again or contact support." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { createHmac, randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../../../../../lib/db";
import { patient, linkToken as linkTokenTable } from "../../../../../lib/schema";

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

    // Step 2: Create linkToken for subsequent auth flow
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

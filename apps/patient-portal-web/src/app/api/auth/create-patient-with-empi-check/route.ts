import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { createHmac, randomBytes } from "crypto";
import { sql } from "drizzle-orm";
import { db } from "../../../../../lib/db";
import { patient, linkToken as linkTokenTable } from "../../../../../lib/schema";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:8000";

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

    // Step 1: Call EMPI /empi/match endpoint to check for duplicates
    try {
      const empiResponse = await axios.post(`${AUTH_SERVICE_URL}/empi/match`, {
        firstName: profile.firstName,
        middleName: profile.middleName || "",
        lastName: profile.lastName,
        dob: profile.dateOfBirth,
        gender: profile.gender,
        phone: profile.mobile || "",
        email: profile.email || "",
        govtIdType: profile.govtIdType || "",
        govtIdNumber: profile.govtIdNumber || "",
      });

      const { decision, highestScore, matches } = empiResponse.data;

      // Hard block if high-confidence match (≥80% similarity) or government ID match
      if (decision === 'block') {
        const topMatch = matches && matches.length > 0 ? matches[0] : null;
        
        // SECURITY: Do NOT expose PHI (UPI, name, DOB) or account existence to browser
        // Log match details server-side only for audit/compliance
        console.log('EMPI duplicate blocked:', {
          score: highestScore,
          matchReason: topMatch?.matchReason,
          matchedUPI: topMatch?.upi,
          requestData: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            dob: profile.dateOfBirth,
            govtIdType: profile.govtIdType || 'none'
          }
        });
        
        // Generic message that does NOT confirm account existence or specific match reason
        // SECURITY: Do NOT include duplicateFound flag (leaks account existence)
        return NextResponse.json(
          {
            success: false,
            message: "We could not complete your registration at this time. This may be due to matching information in our system. Please contact support for assistance.",
          },
          { status: 409 }
        );
      }

      // Medium probability match (50-79) - create but flag for review
      if (decision === 'review') {
        console.log('Medium-probability duplicate detected (score 50-79), creating with review flag');
        // We'll create the patient but mark them for manual review
        // This will be handled in the patient creation step below
      }

      // Step 2: No duplicate found, create patient record
      const patientId = uuidv4();
      
      // Generate UPI using Auth Service
      const upiResponse = await axios.post(`${AUTH_SERVICE_URL}/staff/create_patient`, {
        firstName: profile.firstName,
        middleName: profile.middleName || null,
        lastName: profile.lastName,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        phone: profile.mobile || null,
      });

      const generatedUpi = upiResponse.data.upi;

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
        empiStatus: decision === 'review' ? 'duplicate_suspected' : 'unknown',
        empiScore: decision === 'review' ? String(highestScore) : null,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

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

    } catch (empiError: any) {
      console.error("EMPI check failed:", empiError);
      
      // SECURITY: Do NOT leak account existence information
      // Return generic error without revealing if phone/email exists
      return NextResponse.json(
        { 
          success: false, 
          message: "Unable to verify patient information. Please try again or contact support." 
        },
        { status: 500 }
      );
    }

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

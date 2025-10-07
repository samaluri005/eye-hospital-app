import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { users, credentials } from "../../../../../lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, linkToken, mfa } = body;

    if (!patientId || !linkToken) {
      return NextResponse.json(
        { success: false, error: "Patient ID and link token are required" },
        { status: 400 }
      );
    }

    // TODO: Validate linkToken

    // Get the user record to get userId
    const userRecord = await db.select()
      .from(users)
      .where(eq(users.patientId, patientId))
      .limit(1);

    if (!userRecord || userRecord.length === 0) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const userId = userRecord[0].userId;

    if (mfa.method === "totp" && mfa.totpVerified && mfa.totpSecret) {
      // Store TOTP secret in credentials table
      await db.insert(credentials).values({
        userId,
        credentialType: "totp",
        passwordHash: mfa.totpSecret, // Store the TOTP secret (encrypt in production)
      });

      // Enable MFA for user
      await db.update(users)
        .set({ mfaEnabled: true })
        .where(eq(users.userId, userId));

      return NextResponse.json({
        success: true,
        message: "TOTP MFA enabled successfully",
      });
    } else if (mfa.method === "sms" && mfa.phoneNumber) {
      // SMS MFA uses existing phone verification, just enable flag
      await db.update(users)
        .set({ mfaEnabled: true })
        .where(eq(users.userId, userId));

      return NextResponse.json({
        success: true,
        message: "SMS MFA enabled successfully",
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid MFA configuration" },
      { status: 400 }
    );
  } catch (error) {
    console.error("MFA setup error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to setup MFA" 
      },
      { status: 500 }
    );
  }
}

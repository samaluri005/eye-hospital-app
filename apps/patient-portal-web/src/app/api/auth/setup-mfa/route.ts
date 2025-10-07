import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { users } from "../../../../../lib/schema";
import { eq } from "drizzle-orm";

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

    if ((mfa.method === "totp" && mfa.totpVerified) || (mfa.method === "sms" && mfa.phoneNumber)) {
      // Enable MFA for user
      // Note: TOTP secret is scanned client-side, SMS uses existing phone verification
      await db.update(users)
        .set({ mfaEnabled: true })
        .where(eq(users.patientId, patientId));

      return NextResponse.json({
        success: true,
        message: `${mfa.method.toUpperCase()} MFA enabled successfully`,
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

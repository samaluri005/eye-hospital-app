import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const secret = crypto.randomBytes(20).toString("hex");
    
    const issuer = "Eye Hospital";
    const accountName = "Patient Portal";
    
    const totpUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;

    return NextResponse.json({
      success: true,
      secret,
      uri: totpUri,
    });
  } catch (error) {
    console.error("TOTP generation error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to generate TOTP secret" 
      },
      { status: 500 }
    );
  }
}

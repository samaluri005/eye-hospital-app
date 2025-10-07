import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";

export async function POST(req: NextRequest) {
  try {
    // Generate a base32 secret for TOTP (compatible with authenticator apps)
    const secret = authenticator.generateSecret();
    
    const issuer = "Eye Hospital";
    const accountName = "Patient Portal";
    
    // Generate otpauth:// URI for QR code
    const totpUri = authenticator.keyuri(accountName, issuer, secret);

    // Return secret to be temporarily stored client-side until verification
    // The secret will be saved server-side only after successful verification
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

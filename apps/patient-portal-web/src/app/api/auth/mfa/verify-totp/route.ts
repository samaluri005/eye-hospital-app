import { NextRequest, NextResponse } from "next/server";
import { authenticator } from "otplib";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { secret, code } = body;

    if (!secret || !code) {
      return NextResponse.json(
        { success: false, error: "Secret and code are required" },
        { status: 400 }
      );
    }

    const isValid = authenticator.verify({
      token: code,
      secret: secret,
    });

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Invalid verification code" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      verified: true,
    });
  } catch (error) {
    console.error("TOTP verification error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Verification failed" 
      },
      { status: 500 }
    );
  }
}

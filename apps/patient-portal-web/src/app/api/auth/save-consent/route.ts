import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { patientConsents, hipaaAuditLog } from "../../../../../lib/schema";
import { sessionService } from "../../../../../lib/sessionService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { patientId, linkToken, consent } = body;

    if (!patientId || !linkToken) {
      return NextResponse.json(
        { success: false, error: "Patient ID and link token are required" },
        { status: 400 }
      );
    }

    // TODO: Validate linkToken

    const consentRecords = [];
    const now = new Date();

    // HIPAA Consent (Required)
    if (consent.hipaaConsent) {
      consentRecords.push({
        patientId,
        consentType: "hipaa_privacy_notice",
        granted: true,
        grantedAt: now,
      });
    }

    // Electronic Communications Consent (Required)
    if (consent.communicationConsent) {
      consentRecords.push({
        patientId,
        consentType: "electronic_communications",
        granted: true,
        grantedAt: now,
      });
    }

    // Research Participation Consent (Optional)
    if (consent.researchConsent) {
      consentRecords.push({
        patientId,
        consentType: "research_participation",
        granted: true,
        grantedAt: now,
      });
    }

    // Insert consent records
    if (consentRecords.length > 0) {
      await db.insert(patientConsents).values(consentRecords);
    }

    // Audit log
    await db.insert(hipaaAuditLog).values({
      patientId,
      action: "consent_accepted",
      actorType: "patient",
      actorId: patientId,
      accessedData: {
        consentTypes: consentRecords.map(c => c.consentType),
        timestamp: new Date().toISOString(),
      },
    });

    // Create authenticated session after consent
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (req.headers.get('x-real-ip') || 'unknown');
    const userAgent = req.headers.get('user-agent') || 'unknown';
    
    const session = await sessionService.createAuthenticatedSession(
      patientId,
      ipAddress,
      { userAgent }
    );

    const response = NextResponse.json({
      success: true,
      message: "Consent saved successfully",
      sessionToken: session.sessionToken,
    });

    // Set HTTP-only session cookie
    response.cookies.set('session_token', session.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 1 day
      path: '/',
    });

    return response;
  } catch (error) {
    console.error("Consent save error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to save consent" 
      },
      { status: 500 }
    );
  }
}

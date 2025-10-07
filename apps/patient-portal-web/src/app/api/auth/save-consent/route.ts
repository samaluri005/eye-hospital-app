import { NextRequest, NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { patientConsents, hipaaAuditLog } from "../../../../../lib/schema";

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

    return NextResponse.json({
      success: true,
      message: "Consent saved successfully",
    });
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

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { patient, familyAccess } from '../../../../../lib/schema';
import { eq, and, or } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientId } = body;

    if (!patientId) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const familyMembers = await db
      .select({
        id: familyAccess.id,
        patientId: familyAccess.patientId,
        guardianPatientId: familyAccess.guardianPatientId,
        relationship: familyAccess.relationship,
        accessLevel: familyAccess.accessLevel,
        approvedAt: familyAccess.approvedAt,
        expiresAt: familyAccess.expiresAt,
        isActive: familyAccess.isActive,
        memberFirstName: patient.firstName,
        memberLastName: patient.lastName,
        memberFullName: patient.fullName,
        memberDob: patient.dob,
        memberPhone: patient.phone,
        memberEmail: patient.email,
      })
      .from(familyAccess)
      .innerJoin(
        patient,
        or(
          and(
            eq(familyAccess.patientId, patient.patientId),
            eq(familyAccess.guardianPatientId, patientId)
          ),
          and(
            eq(familyAccess.guardianPatientId, patient.patientId),
            eq(familyAccess.patientId, patientId)
          )
        )
      )
      .where(
        and(
          or(
            eq(familyAccess.guardianPatientId, patientId),
            eq(familyAccess.patientId, patientId)
          ),
          eq(familyAccess.isActive, true)
        )
      );

    return NextResponse.json({
      success: true,
      familyMembers: familyMembers.map((fm: any) => ({
        id: fm.id,
        patientId: fm.guardianPatientId === patientId ? fm.patientId : fm.guardianPatientId,
        name: fm.memberFullName || `${fm.memberFirstName || ''} ${fm.memberLastName || ''}`.trim(),
        relationship: fm.relationship,
        accessLevel: fm.accessLevel,
        phone: fm.memberPhone,
        email: fm.memberEmail,
        isActive: fm.isActive,
        expiresAt: fm.expiresAt,
      })),
    });
  } catch (error) {
    console.error('List family members error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch family members' },
      { status: 500 }
    );
  }
}

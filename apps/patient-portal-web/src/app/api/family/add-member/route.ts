import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { patient, familyAccess, patientConsents } from '../../../../../lib/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export const FAMILY_RELATIONSHIPS = [
  { value: 'spouse', label: 'Spouse' },
  { value: 'parent', label: 'Parent' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'grandchild', label: 'Grandchild' },
  { value: 'guardian', label: 'Legal Guardian' },
  { value: 'dependent', label: 'Dependent' },
  { value: 'other', label: 'Other Family Member' },
] as const;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      primaryPatientId,
      firstName,
      lastName,
      middleName,
      dob,
      gender,
      relationship,
      accessLevel = 'full',
      phone,
      email,
    } = body;

    if (!primaryPatientId || !firstName || !lastName || !relationship) {
      return NextResponse.json(
        { error: 'Primary patient ID, first name, last name, and relationship are required' },
        { status: 400 }
      );
    }

    const primaryPatient = await db
      .select()
      .from(patient)
      .where(eq(patient.patientId, primaryPatientId))
      .limit(1);

    if (primaryPatient.length === 0) {
      return NextResponse.json(
        { error: 'Primary patient not found' },
        { status: 404 }
      );
    }

    const fullName = `${firstName} ${middleName || ''} ${lastName}`.replace(/\s+/g, ' ').trim();

    const newPatientId = uuidv4();
    
    // CRITICAL: Family members MUST have unique phone numbers to avoid constraint violations
    // They authenticate through the guardian's phone via family_access table
    // Generate synthetic phone - do NOT use the guardian's phone
    const syntheticPhone = `+family-${newPatientId}`;
    
    await db.insert(patient).values({
      patientId: newPatientId,
      firstName,
      lastName,
      middleName,
      fullName,
      fullNameStandardized: fullName.toLowerCase().replace(/[^a-z0-9\s]/g, ''),
      phone: syntheticPhone,
      phoneStandardized: syntheticPhone,
      email,
      dob: dob ? new Date(dob) : undefined,
      gender,
      status: 'active',
      trustLevel: 'low',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    await db.insert(familyAccess).values({
      patientId: newPatientId,
      guardianPatientId: primaryPatientId,
      relationship,
      accessLevel,
      approvedAt: new Date(),
      expiresAt,
      isActive: true,
    });

    await db.insert(patientConsents).values({
      patientId: newPatientId,
      consentType: 'family_access_granted_by_guardian',
      granted: true,
      grantedAt: new Date(),
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      patientId: newPatientId,
      message: 'Family member added successfully',
    });
  } catch (error) {
    console.error('Add family member error:', error);
    return NextResponse.json(
      { error: 'Failed to add family member' },
      { status: 500 }
    );
  }
}

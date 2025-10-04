import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { patient, familyAccess, patientConsents, linkToken as linkTokenTable } from '../../../../../lib/schema';
import { eq, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

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
    // Generate synthetic phone - use last 12 chars of UUID (phone column max is 30 chars)
    const syntheticPhone = `+fam${newPatientId.slice(-12)}`;
    
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

    // Generate linkToken for consent step (10 minute expiry)
    const secret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET;
    if (!secret) {
      throw new Error('LINK_TOKEN_HMAC_SECRET not configured');
    }
    
    const token = uuidv4();
    const tokenHash = crypto.createHmac('sha256', secret).update(token).digest('hex');
    const expiresAtToken = new Date();
    expiresAtToken.setMinutes(expiresAtToken.getMinutes() + 10);

    await db.execute(sql`
      INSERT INTO link_token (patient_id, token_hash, expires_at, used, created_at, used_at)
      VALUES (${newPatientId}, ${tokenHash}, ${expiresAtToken}, false, NOW(), NULL)
    `);

    return NextResponse.json({
      success: true,
      patientId: newPatientId,
      linkToken: token,
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

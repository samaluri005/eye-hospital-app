import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { patient, hipaaAuditLog } from '../../../../../lib/schema';
import { eq, sql } from 'drizzle-orm';
import { createHmac } from 'crypto';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patientId, linkToken, profile } = body;

    if (!patientId || !linkToken || !profile) {
      return NextResponse.json(
        { error: 'missing_required_fields' },
        { status: 400 }
      );
    }

    // Validate linkToken
    const linkSecret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET;
    if (!linkSecret) {
      console.error('LINK_TOKEN_HMAC_SECRET not configured');
      return NextResponse.json(
        { error: 'service_configuration_error' },
        { status: 500 }
      );
    }

    const tokenHash = createHmac('sha256', linkSecret)
      .update(linkToken)
      .digest('hex');

    // Validate link token
    const linkTokenRecords = await db.execute(sql`
      SELECT id
      FROM link_token
      WHERE token_hash = ${tokenHash}
      AND patient_id = ${patientId}::uuid
      AND used = false
      AND expires_at > NOW()
      LIMIT 1
    `);

    if (linkTokenRecords.rows.length === 0) {
      return NextResponse.json(
        { error: 'invalid_or_expired_link_token' },
        { status: 401 }
      );
    }

    // Extract profile data
    const { 
      title, firstName, middleName, lastName, dateOfBirth, gender, 
      mobile, email, patientType, guardianName,
      bloodGroup, sourceOfPatient, referralName, referralPhone,
      occupation, maritalStatus, spouseName,
      addressLine1, addressLine2, city, state, postalCode, country,
      permanentAddressLine1, permanentAddressLine2, permanentCity, 
      permanentState, permanentPostalCode, permanentCountry
    } = profile;

    // Build full name with title
    const nameParts = [title, firstName, middleName, lastName].filter(Boolean);
    const fullName = nameParts.join(' ').trim();

    // Calculate age to determine if guardian is required
    let isMinor = false;
    if (dateOfBirth) {
      const dob = new Date(dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - dob.getFullYear();
      isMinor = age < 18;
    }

    // Validate conditional fields
    if (isMinor && !guardianName) {
      return NextResponse.json(
        { error: 'guardian_required_for_minor' },
        { status: 400 }
      );
    }

    if (sourceOfPatient === 'Referral' && (!referralName || !referralPhone)) {
      return NextResponse.json(
        { error: 'referral_details_required' },
        { status: 400 }
      );
    }

    if (maritalStatus === 'Married' && !spouseName) {
      return NextResponse.json(
        { error: 'spouse_name_required_for_married' },
        { status: 400 }
      );
    }

    // Build present address JSONB
    const presentAddress = (addressLine1 || addressLine2 || city || state || postalCode || country) ? {
      line1: addressLine1 || '',
      line2: addressLine2 || '',
      city: city || '',
      state: state || '',
      postalCode: postalCode || '',
      country: country || 'India'
    } : null;

    // Build permanent address JSONB
    const permanentAddress = (permanentAddressLine1 || permanentAddressLine2 || permanentCity || permanentState || permanentPostalCode || permanentCountry) ? {
      line1: permanentAddressLine1 || '',
      line2: permanentAddressLine2 || '',
      city: permanentCity || '',
      state: permanentState || '',
      postalCode: permanentPostalCode || '',
      country: permanentCountry || 'India'
    } : null;

    // Update patient record with all profile data
    await db
      .update(patient)
      .set({
        title: title || null,
        firstName: firstName || null,
        middleName: middleName || null,
        lastName: lastName || null,
        fullName: fullName || null,
        dob: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        mobile: mobile || null,
        email: email || null,
        patientType: patientType || null,
        guardianName: isMinor ? (guardianName || null) : null,
        bloodGroup: bloodGroup || null,
        sourceOfPatient: sourceOfPatient || null,
        referralName: sourceOfPatient === 'Referral' ? (referralName || null) : null,
        referralPhone: sourceOfPatient === 'Referral' ? (referralPhone || null) : null,
        occupation: occupation || null,
        maritalStatus: maritalStatus || null,
        spouseName: maritalStatus === 'Married' ? (spouseName || null) : null,
        addresses: presentAddress ? JSON.stringify([presentAddress]) : null,
        permanentAddress: permanentAddress ? JSON.stringify(permanentAddress) : null,
        updatedAt: new Date(),
      })
      .where(eq(patient.patientId, patientId));

    // Log the profile update
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Build list of updated fields for audit log
    const updatedFields = ['fullName'];
    if (title) updatedFields.push('title');
    if (firstName) updatedFields.push('firstName');
    if (middleName) updatedFields.push('middleName');
    if (lastName) updatedFields.push('lastName');
    if (dateOfBirth) updatedFields.push('dob');
    if (gender) updatedFields.push('gender');
    if (mobile) updatedFields.push('mobile');
    if (email) updatedFields.push('email');
    if (patientType) updatedFields.push('patientType');
    if (guardianName) updatedFields.push('guardianName');
    if (bloodGroup) updatedFields.push('bloodGroup');
    if (sourceOfPatient) updatedFields.push('sourceOfPatient');
    if (referralName) updatedFields.push('referralName');
    if (referralPhone) updatedFields.push('referralPhone');
    if (occupation) updatedFields.push('occupation');
    if (maritalStatus) updatedFields.push('maritalStatus');
    if (spouseName) updatedFields.push('spouseName');
    if (presentAddress) updatedFields.push('addresses');
    if (permanentAddress) updatedFields.push('permanentAddress');

    await db.insert(hipaaAuditLog).values({
      patientId,
      action: 'patient_profile_updated',
      actorId: patientId,
      actorType: 'patient',
      ipAddress: clientIp,
      userAgent,
      accessedData: {
        fields_updated: updatedFields,
        profile_completion: isMinor ? 'minor_with_guardian' : 'adult',
      },
      hipaaComplianceNote: 'Patient profile information updated during signup with CDC-compliant demographic data',
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Save profile error:', error);
    return NextResponse.json(
      { error: 'service_error' },
      { status: 500 }
    );
  }
}

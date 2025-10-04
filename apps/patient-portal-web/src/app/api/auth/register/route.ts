import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { patient, duplicateCandidates, hipaaAuditLog } from '../../../../../lib/schema';
import { eq, sql } from 'drizzle-orm';
import crypto from 'crypto';
import {
  standardizeName,
  standardizePhone,
  standardizeAddress,
  generateBlockingKey,
} from '../../../../../src/lib/deduplication/standardization';
import { 
  rankDuplicateCandidates, 
  calculateTotalMatchScore,
  type PatientData 
} from '../../../../../src/lib/deduplication/matching';

// Validate link token against database (matches temp-auth-service format)
async function validateLinkToken(token: string, phone: string): Promise<boolean> {
  try {
    const secret = process.env.LINK_TOKEN_HMAC_SECRET || process.env.OTP_HMAC_SECRET;
    if (!secret) {
      console.error('LINK_TOKEN_HMAC_SECRET not configured');
      return false;
    }

    // Generate hash of provided token (matches temp-auth-service logic)
    const tokenHash = crypto.createHmac('sha256', secret).update(token).digest('hex');

    // Check if patient exists with this phone
    const patientResult = await db.select()
      .from(patient)
      .where(eq(patient.phone, phone))
      .limit(1);

    if (patientResult.length === 0) {
      console.error('[REGISTER] Patient not found for phone:', phone);
      return false;
    }

    const patientId = patientResult[0].patientId;

    // Check link_token table using raw SQL (temp-auth-service uses token_hash column)
    const linkTokenResult = await db.execute(sql`
      SELECT * FROM link_token 
      WHERE patient_id = ${patientId}
      AND token_hash = ${tokenHash}
      AND used = false
      AND expires_at > NOW()
      LIMIT 1
    `);

    return linkTokenResult.rows.length > 0;
  } catch (error) {
    console.error('Link token validation error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, linkToken, profile, email } = body;

    // Validate required fields
    if (!phone || !linkToken || !profile) {
      return NextResponse.json(
        { error: 'Missing required fields: phone, linkToken, and profile' },
        { status: 400 }
      );
    }

    // CRITICAL SECURITY: Validate link token to ensure caller is authorized
    const isValidToken = await validateLinkToken(linkToken, phone);
    if (!isValidToken) {
      console.error(`[REGISTER] Invalid or expired link token for phone ${phone}`);
      return NextResponse.json(
        { error: 'Invalid or expired authorization token' },
        { status: 401 }
      );
    }

    // Validate profile required fields
    if (!profile.firstName || !profile.lastName || !profile.dateOfBirth) {
      return NextResponse.json(
        { error: 'Missing required profile fields: firstName, lastName, dateOfBirth' },
        { status: 400 }
      );
    }

    // Get IP address for audit trail (HIPAA requirement)
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if patient already exists with this phone
    const existingPatient = await db.select()
      .from(patient)
      .where(eq(patient.phone, phone))
      .limit(1);

    if (existingPatient.length > 0) {
      console.log(`[REGISTER] Patient already exists with phone ${phone}`);
      return NextResponse.json({
        status: 'existing_patient',
        patientId: existingPatient[0].patientId,
        message: 'Patient record already exists for this phone number',
      });
    }

    // Standardize data for CDC de-duplication
    const phoneStandardized = standardizePhone(phone);
    const fullName = `${profile.firstName} ${profile.middleName || ''} ${profile.lastName}`.trim();
    const fullNameStandardized = standardizeName(fullName);

    // Build address string if provided
    let addressString = null;
    let addressStandardized = null;
    if (profile.addressLine1 && profile.city && profile.state) {
      addressString = `${profile.addressLine1}, ${profile.addressLine2 || ''}, ${profile.city}, ${profile.state} ${profile.postalCode || ''}`.trim();
      addressStandardized = standardizeAddress(addressString);
    }

    // Calculate Soundex and blocking key for CDC matching
    const blockingKey = generateBlockingKey(
      profile.firstName,
      profile.lastName,
      new Date(profile.dateOfBirth)
    );
    
    const soundexLastName = standardizeName(profile.lastName).substring(0, 10);

    // Generate system email for phone-only users
    const systemEmail = email || `${phone.replace(/\D/g, '')}@patients.eyehospital.com`;

    // Create patient record in database
    const newPatient = await db.insert(patient).values({
      phone: phoneStandardized,
      email: email || null,
      systemEmail,
      emailVerifiedAt: email ? sql`NOW()` : null,
      firstName: profile.firstName.trim(),
      middleName: profile.middleName?.trim() || null,
      lastName: profile.lastName.trim(),
      nameSuffix: profile.nameSuffix?.trim() || null,
      fullName,
      fullNameStandardized,
      dob: new Date(profile.dateOfBirth),
      gender: profile.gender || null,
      addressLine1: profile.addressLine1?.trim() || null,
      addressLine2: profile.addressLine2?.trim() || null,
      city: profile.city?.trim() || null,
      state: profile.state?.trim() || null,
      postalCode: profile.postalCode?.trim() || null,
      country: profile.country || 'India',
      address: addressString,
      addressStandardized,
      emergencyContact: profile.emergencyContact?.trim() || null,
      emergencyPhone: profile.emergencyPhone?.trim() || null,
      // CDC de-duplication fields
      phoneStandardized,
      soundexLastName,
      blockingKey,
      // Trust and verification
      trustLevel: 'low', // Will upgrade to 'medium' after ID verification, 'high' after in-person
      status: 'active',
    }).returning();

    const patientId = newPatient[0].patientId;

    console.log(`[REGISTER] Created new patient record: ${patientId}`);

    // Run CDC de-duplication algorithm to find potential duplicates
    try {
      // Fetch all existing patients for comparison
      const allPatients = await db.select().from(patient).where(sql`${patient.patientId} != ${patientId}`);

      if (allPatients.length > 0) {
        const newPatientData: PatientData = {
          firstName: profile.firstName,
          lastName: profile.lastName,
          dateOfBirth: profile.dateOfBirth,
          phone: phoneStandardized,
          address: addressStandardized || undefined,
        };

        // Calculate match scores for all candidates
        const candidateScores = allPatients.map(p => 
          calculateTotalMatchScore(newPatientData, {
            patientId: p.patientId,
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            dateOfBirth: p.dob || null,
            phone: p.phoneStandardized || p.phone,
            address: p.addressStandardized || undefined,
          })
        );

        const duplicates = rankDuplicateCandidates(candidateScores);

        // Store duplicate candidates if any found (only high-score matches)
        const highScoreDuplicates = duplicates.filter(d => d.totalScore >= 70);
        
        if (highScoreDuplicates.length > 0) {
          console.log(`[CDC] Found ${highScoreDuplicates.length} potential duplicates for patient ${patientId}`);
          
          for (const dup of highScoreDuplicates) {
            await db.insert(duplicateCandidates).values({
              patientAId: patientId,
              patientBId: dup.candidatePatientId,
              similarityScore: Math.round(dup.totalScore),
              blockingKey,
              matchDetails: {
                nameScore: dup.nameScore,
                phoneticScore: dup.phoneticScore,
                dobScore: dup.dobScore,
                phoneScore: dup.phoneScore,
                addressScore: dup.addressScore,
                matchType: dup.matchType,
                confidenceLevel: dup.confidenceLevel,
              },
              status: 'pending',
            });
          }
        } else {
          console.log(`[CDC] No duplicate candidates found for patient ${patientId}`);
        }
      }
    } catch (cdcError) {
      // Don't fail registration if CDC matching fails
      console.error('[CDC] Duplicate detection failed:', cdcError);
    }

    // Create HIPAA audit log for patient creation
    await db.insert(hipaaAuditLog).values({
      patientId,
      action: 'patient_registration',
      actorId: patientId,
      actorType: 'patient',
      ipAddress,
      userAgent,
      accessedData: {
        phone: phoneStandardized,
        email: systemEmail,
        registrationMethod: 'sms_otp',
        profileComplete: true,
      },
      hipaaComplianceNote: 'New patient registered via SMS OTP authentication',
    });

    console.log(`[REGISTER] Patient registration complete: ${patientId}`);

    return NextResponse.json({
      status: 'registration_complete',
      patientId,
      email: systemEmail,
      message: 'Patient registration successful',
    });
  } catch (error) {
    console.error('[REGISTER] Registration error:', error);
    return NextResponse.json(
      { 
        error: 'Registration failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

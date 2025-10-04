import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { patient } from '../../../../../lib/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number required' },
        { status: 400 }
      );
    }

    // Check if patient exists with this phone and has profile data
    const existingPatient = await db.select({
      patientId: patient.patientId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dob: patient.dob,
      hasProfile: patient.firstName,
    })
      .from(patient)
      .where(eq(patient.phone, phone))
      .limit(1);

    if (existingPatient.length > 0 && existingPatient[0].firstName) {
      // Patient exists with profile data
      return NextResponse.json({
        exists: true,
        hasProfile: true,
        patientId: existingPatient[0].patientId,
      });
    } else if (existingPatient.length > 0) {
      // Patient exists but no profile data
      return NextResponse.json({
        exists: true,
        hasProfile: false,
        patientId: existingPatient[0].patientId,
      });
    } else {
      // Patient does not exist
      return NextResponse.json({
        exists: false,
        hasProfile: false,
      });
    }
  } catch (error) {
    console.error('Check patient error:', error);
    return NextResponse.json(
      { error: 'Failed to check patient status' },
      { status: 500 }
    );
  }
}

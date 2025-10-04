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

    const allPatients = await db.select({
      patientId: patient.patientId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      fullName: patient.fullName,
      dob: patient.dob,
      email: patient.email,
      hasProfile: patient.firstName,
    })
      .from(patient)
      .where(eq(patient.phone, phone));

    if (allPatients.length === 0) {
      return NextResponse.json({
        exists: false,
        hasProfile: false,
        multipleAccounts: false,
      });
    }

    if (allPatients.length === 1) {
      const singlePatient = allPatients[0];
      if (singlePatient.firstName) {
        return NextResponse.json({
          exists: true,
          hasProfile: true,
          multipleAccounts: false,
          patientId: singlePatient.patientId,
        });
      } else {
        return NextResponse.json({
          exists: true,
          hasProfile: false,
          multipleAccounts: false,
          patientId: singlePatient.patientId,
        });
      }
    }

    return NextResponse.json({
      exists: true,
      multipleAccounts: true,
      accounts: allPatients.map(p => ({
        patientId: p.patientId,
        name: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Unnamed Account',
        hasProfile: !!p.firstName,
      })),
    });
  } catch (error) {
    console.error('Check patient error:', error);
    return NextResponse.json(
      { error: 'Failed to check patient status' },
      { status: 500 }
    );
  }
}

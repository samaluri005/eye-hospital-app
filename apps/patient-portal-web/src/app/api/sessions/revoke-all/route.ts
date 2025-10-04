import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '../../../../../lib/sessionService';
import { requireAuth } from '../../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const patient = await requireAuth(request);

    await sessionService.invalidateAllPatientSessions(patient.patientId);

    return NextResponse.json({
      success: true,
      message: 'All sessions revoked successfully',
    });
  } catch (error: any) {
    console.error('Revoke all sessions error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to revoke all sessions' },
      { status: 500 }
    );
  }
}

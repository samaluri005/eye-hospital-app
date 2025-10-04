import { NextRequest, NextResponse } from 'next/server';
import { sessionService } from '../../../../../lib/sessionService';
import { requireAuth } from '../../../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    const patient = await requireAuth(request);
    
    const sessions = await sessionService.getActiveSessionsForPatient(patient.patientId);

    return NextResponse.json({
      success: true,
      sessions,
    });
  } catch (error: any) {
    console.error('List sessions error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

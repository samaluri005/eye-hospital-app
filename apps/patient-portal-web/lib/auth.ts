import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { sessionService } from './sessionService';

export interface AuthenticatedPatient {
  patientId: string;
  phone?: string;
  email?: string;
}

export async function getAuthenticatedPatient(request: NextRequest): Promise<AuthenticatedPatient | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    
    if (!sessionToken) {
      return null;
    }

    const session = await sessionService.getSession(sessionToken, 'authenticated');
    
    if (!session) {
      return null;
    }

    return {
      patientId: session.patientId,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<AuthenticatedPatient> {
  const patient = await getAuthenticatedPatient(request);
  if (!patient) {
    throw new Error('Unauthorized');
  }
  return patient;
}

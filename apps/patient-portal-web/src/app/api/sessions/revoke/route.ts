import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { patientSessions } from '../../../../../lib/schema';
import { eq, and } from 'drizzle-orm';
import { getRedisClient } from '../../../../../lib/redis';
import { requireAuth } from '../../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const patient = await requireAuth(request);
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = await db
      .select()
      .from(patientSessions)
      .where(
        and(
          eq(patientSessions.id, sessionId),
          eq(patientSessions.patientId, patient.patientId)
        )
      )
      .limit(1);

    if (session.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or unauthorized' },
        { status: 404 }
      );
    }

    await db
      .update(patientSessions)
      .set({ isActive: false })
      .where(eq(patientSessions.id, sessionId));

    const redis = getRedisClient();
    await redis.connect();
    await redis.del(`session:auth:${session[0].sessionToken}`);

    return NextResponse.json({
      success: true,
      message: 'Session revoked successfully',
    });
  } catch (error: any) {
    console.error('Revoke session error:', error);
    
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to revoke session' },
      { status: 500 }
    );
  }
}

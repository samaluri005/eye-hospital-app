import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { familyAccess } from '../../../../../lib/schema';
import { eq, and, or } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { familyAccessId, patientId } = body;

    if (!familyAccessId || !patientId) {
      return NextResponse.json(
        { error: 'Family access ID and patient ID are required' },
        { status: 400 }
      );
    }

    const accessRecord = await db
      .select()
      .from(familyAccess)
      .where(
        and(
          eq(familyAccess.id, familyAccessId),
          or(
            eq(familyAccess.guardianPatientId, patientId),
            eq(familyAccess.patientId, patientId)
          )
        )
      )
      .limit(1);

    if (accessRecord.length === 0) {
      return NextResponse.json(
        { error: 'Family access record not found or unauthorized' },
        { status: 404 }
      );
    }

    await db
      .update(familyAccess)
      .set({ isActive: false })
      .where(eq(familyAccess.id, familyAccessId));

    return NextResponse.json({
      success: true,
      message: 'Family access revoked successfully',
    });
  } catch (error) {
    console.error('Revoke family access error:', error);
    return NextResponse.json(
      { error: 'Failed to revoke family access' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { toPublicUser } from '@/lib/server/administration';

export async function GET(request: NextRequest) {
  try {
    const user = await db.getUserBySessionToken(request.cookies.get('asr_session')?.value);
    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
    }

    // The session bootstrap is also the first permission read for staff users.
    // Returning the persisted matrix here keeps navigation and initial data
    // loading aligned with the server before any protected page is rendered.
    const [permissionMatrix, roles] = await Promise.all([
      db.getPermissionMatrix(),
      db.getRoles(),
    ]);
    return NextResponse.json({
      success: true,
      data: toPublicUser(user),
      permissionMatrix,
      roles,
    });
  } catch (error) {
    console.error('Session bootstrap failed:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication service is temporarily unavailable. Please retry.' },
      { status: 503 },
    );
  }
}

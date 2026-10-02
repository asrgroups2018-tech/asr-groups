import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { toPublicUser } from '@/lib/server/administration';

export async function GET(request: NextRequest) {
  const user = await db.getUserBySessionToken(request.cookies.get('asr_session')?.value);
  if (!user) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  return NextResponse.json({ success: true, data: toPublicUser(user) });
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function POST(request: NextRequest) {
  try {
    await db.revokeAuthSession(request.cookies.get('asr_session')?.value);
  } catch (error) {
    console.error('Logout error:', error);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('asr_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}

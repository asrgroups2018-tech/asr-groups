import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      identifier?: string;
      password?: string;
    };
    const identifier = body.identifier?.trim() || '';
    const password = body.password || '';

    if (!identifier || !password) {
      return NextResponse.json(
        { success: false, error: 'Username/email and password are required.' },
        { status: 400 },
      );
    }

    const user = await db.authenticateUser(identifier, password);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password. Please verify your credentials.' },
        { status: 401 },
      );
    }

    const token = randomUUID();
    const configuredMaxAge = Number(process.env.ASR_SESSION_MAX_AGE_SECONDS || 8 * 60 * 60);
    const maxAge = Number.isFinite(configuredMaxAge) && configuredMaxAge > 0
      ? Math.floor(configuredMaxAge)
      : 8 * 60 * 60;
    await db.createAuthSession(
      user.id,
      token,
      new Date(Date.now() + maxAge * 1000).toISOString(),
    );

    const response = NextResponse.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          role: String(user.primaryRoleId),
        },
      },
    });

    response.cookies.set('asr_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge,
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to sign in right now. Please try again.' },
      { status: 500 },
    );
  }
}

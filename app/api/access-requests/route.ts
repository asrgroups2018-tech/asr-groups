import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

async function actor(request: NextRequest) {
  return db.getUserBySessionToken(request.cookies.get('asr_session')?.value);
}

export async function GET(request: NextRequest) {
  const user = await actor(request);
  if (!user) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  const data = await db.getAccessRequests(user.assignedRoleIds.includes(0) ? undefined : user.id);
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const user = await actor(request);
  if (!user) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  const body = await request.json();
  if (!body.moduleId || !body.action || !body.reason?.trim()) return NextResponse.json({ success: false, error: 'Page, action, and reason are required.' }, { status: 400 });
  const data = await db.createAccessRequest({ userId: user.id, userName: user.name, roleId: user.primaryRoleId, moduleId: String(body.moduleId), action: body.action, reason: String(body.reason) });
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const user = await actor(request);
  if (!user || !user.assignedRoleIds.includes(0)) return NextResponse.json({ success: false, error: 'Super Admin access required.' }, { status: 403 });
  const body = await request.json();
  if (!body.id || !['Approved', 'Rejected'].includes(body.status)) return NextResponse.json({ success: false, error: 'Request id and a valid decision are required.' }, { status: 400 });
  const data = await db.reviewAccessRequest(body.id, body.status, user.id, user.name, body.reviewerNotes);
  return NextResponse.json({ success: Boolean(data), data }, { status: data ? 200 : 404 });
}

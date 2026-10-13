import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authorizeRequest, isSuperAdmin } from '@/lib/server/authorization';

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.ok) return auth.response;
  const data = await db.getAccessRequests(isSuperAdmin(auth.user) ? undefined : auth.user.id);
  return NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.ok) return auth.response;
  const body = await request.json();
  if (!body.moduleId || !body.action || !body.reason?.trim()) return NextResponse.json({ success: false, error: 'Page, action, and reason are required.' }, { status: 400 });
  const data = await db.createAccessRequest({ userId: auth.user.id, userName: auth.user.name, roleId: auth.user.primaryRoleId, moduleId: String(body.moduleId), action: body.action, reason: String(body.reason) });
  return NextResponse.json({ success: true, data }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'approve');
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    if (!body.id || !['Approved', 'Rejected'].includes(body.status)) {
      return NextResponse.json({ success: false, error: 'Request id and a valid decision are required.' }, { status: 400 });
    }
    const data = await db.reviewAccessRequest(body.id, body.status, auth.user.id, auth.user.name, auth.user.primaryRoleId, body.reviewerNotes);
    return NextResponse.json({ success: Boolean(data), data }, { status: data ? 200 : 404 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to review access request.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

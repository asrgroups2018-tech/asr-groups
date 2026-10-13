import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authorizeRequest } from '@/lib/server/authorization';

// GET /api/admin/permissions
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'view');
  if (!auth.ok) return auth.response;
  try {
    const matrix = await db.getPermissionMatrix();
    return NextResponse.json({ success: true, data: matrix });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/permissions
export async function PUT(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'edit');
  if (!auth.ok) return auth.response;
  try {
    const matrix = await request.json();
    const updated = await db.updatePermissionMatrix(matrix);
    await db.logAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRoleId: auth.user.primaryRoleId,
      action: 'Edited Permission',
      target: 'Global module permission matrix',
      afterVal: JSON.stringify(updated),
      isSensitive: true,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

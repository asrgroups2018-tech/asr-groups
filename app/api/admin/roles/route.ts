import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authorizeRequest } from '@/lib/server/authorization';

// GET /api/admin/roles
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'view');
  if (!auth.ok) return auth.response;
  try {
    const roles = await db.getRoles();
    return NextResponse.json({ success: true, data: roles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/roles
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'create');
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    if (!body.name || !body.code) {
      return NextResponse.json(
        { success: false, error: 'Role name and role code are required.' },
        { status: 400 }
      );
    }

    const newRole = await db.createRole({
      name: body.name,
      code: body.code,
      description: body.description || '',
      colorName: body.colorName || 'blue',
      bgClass: body.bgClass || 'bg-blue-50',
      textClass: body.textClass || 'text-blue-700',
      borderClass: body.borderClass || 'border-blue-200',
      hexColor: body.hexColor || '#2563EB',
      isSystemProtected: false,
      hierarchyLevel: body.hierarchyLevel || 7,
    });
    await db.logAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRoleId: auth.user.primaryRoleId,
      action: 'Assigned Role',
      target: `Role ${newRole.name} (${newRole.id})`,
      afterVal: JSON.stringify(newRole),
      isSensitive: true,
    });

    return NextResponse.json({ success: true, data: newRole }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/roles
export async function PUT(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'edit');
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    if (body.id === undefined) {
      return NextResponse.json(
        { success: false, error: 'Role id is required.' },
        { status: 400 }
      );
    }

    const updated = await db.updateRole(Number(body.id), body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Role not found.' }, { status: 404 });
    }
    await db.logAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRoleId: auth.user.primaryRoleId,
      action: 'Updated Access',
      target: `Role ${updated.name} (${updated.id})`,
      afterVal: JSON.stringify(body),
      isSensitive: true,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'delete');
  if (!auth.ok) return auth.response;
  try {
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isInteger(id)) return NextResponse.json({ success: false, error: 'Role id is required.' }, { status: 400 });
    const deleted = await db.deleteRole(id);
    if (deleted) {
      await db.logAudit({
        actorId: auth.user.id,
        actorName: auth.user.name,
        actorRoleId: auth.user.primaryRoleId,
        action: 'Updated Access',
        target: `Role ${id}`,
        afterVal: 'Deleted',
        isSensitive: true,
      });
    }
    return NextResponse.json({ success: deleted }, { status: deleted ? 200 : 404 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 409 });
  }
}

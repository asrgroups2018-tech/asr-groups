import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { toPublicUser } from '@/lib/server/administration';
import { CUSTOMER_ROLE_ID } from '@/lib/types';
import { authorizeRequest } from '@/lib/server/authorization';

// GET /api/admin/users
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'view');
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const roleIdParam = searchParams.get('roleId');
    const statusParam = searchParams.get('status');
    const queryParam = searchParams.get('query');

    const users = await db.getUsers({
      roleId: roleIdParam ? Number(roleIdParam) : undefined,
      status: statusParam || undefined,
      query: queryParam || undefined,
    });

    return NextResponse.json({ success: true, data: users.map(toPublicUser), total: users.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/users
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'create');
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    const isCustomerAccount = Array.isArray(body.assignedRoleIds) && body.assignedRoleIds.length === 1 && Number(body.assignedRoleIds[0]) === CUSTOMER_ROLE_ID;
    if (!body.name || (!body.email && (!isCustomerAccount || !body.customerId)) || !body.assignedRoleIds?.length) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and at least one role are required.' },
        { status: 400 }
      );
    }

    const newUser = await db.createUser({
      ...body,
      email: typeof body.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : body.customerId,
      phone: typeof body.phone === 'string' ? body.phone : '',
      department: typeof body.department === 'string' ? body.department : '',
      designation: typeof body.designation === 'string' ? body.designation : '',
    });
    await db.logAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRoleId: auth.user.primaryRoleId,
      action: 'Created User',
      target: `${newUser.name} (${newUser.id})`,
      afterVal: JSON.stringify({ email: newUser.email, roles: newUser.assignedRoleIds }),
      isSensitive: true,
    });
    return NextResponse.json({ success: true, data: toPublicUser(newUser) }, { status: 201 });
  } catch (error: any) {
    console.error('Create user error:', error);
    const message = error instanceof Error ? error.message : 'Unable to create the account.';
    const status = /unique|constraint/i.test(message) ? 409 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

// PUT /api/admin/users
export async function PUT(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'edit');
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
    }

    const before = await db.getUserById(body.id);
    const updated = await db.updateUser(body.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    const passwordChanged = typeof body.tempPassword === 'string' && body.tempPassword.trim().length > 0;
    const roleChanged = Array.isArray(body.assignedRoleIds) || body.primaryRoleId !== undefined;
    const statusChanged = body.status && body.status !== before?.status;
    await db.logAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRoleId: auth.user.primaryRoleId,
      action: passwordChanged
        ? 'Changed Password'
        : statusChanged
          ? (body.status === 'Suspended' ? 'Suspended User' : 'Activated User')
          : roleChanged ? 'Assigned Role' : 'Updated User',
      target: `${updated.name} (${updated.id})`,
      beforeVal: passwordChanged ? undefined : JSON.stringify({
        name: before?.name,
        email: before?.email,
        username: before?.username,
        status: before?.status,
        roles: before?.assignedRoleIds,
      }),
      afterVal: passwordChanged ? 'Password updated; existing sessions revoked.' : JSON.stringify({
        name: updated.name,
        email: updated.email,
        username: updated.username,
        status: updated.status,
        roles: updated.assignedRoleIds,
      }),
      isSensitive: true,
    });
    return NextResponse.json({ success: true, data: toPublicUser(updated) });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/users
export async function DELETE(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'delete');
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID parameter is required.' }, { status: 400 });
    }

    // Check if trying to delete a Super Admin — only allow if another Super Admin exists
    const allUsers = await db.getUsers({});
    const targetUser = allUsers.find((u) => u.id === id);

    if (targetUser && targetUser.assignedRoleIds.includes(0)) {
      const otherSuperAdmins = allUsers.filter(
        (u) => u.id !== id && u.assignedRoleIds.includes(0)
      );
      if (otherSuperAdmins.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete the last Super Admin. Assign another user as Super Admin first.' },
          { status: 403 }
        );
      }
    }

    const deleted = await db.deleteUser(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    await db.logAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRoleId: auth.user.primaryRoleId,
      action: 'Deleted User',
      target: `${targetUser?.name || id} (${id})`,
      beforeVal: JSON.stringify({ email: targetUser?.email, roles: targetUser?.assignedRoleIds }),
      isSensitive: true,
    });
    return NextResponse.json({ success: true, message: 'User deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

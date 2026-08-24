import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

// GET /api/admin/users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roleIdParam = searchParams.get('roleId');
    const statusParam = searchParams.get('status');
    const queryParam = searchParams.get('query');

    const users = db.getUsers({
      roleId: roleIdParam ? Number(roleIdParam) : undefined,
      status: statusParam || undefined,
      query: queryParam || undefined,
    });

    return NextResponse.json({ success: true, data: users, total: users.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/users
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.email || !body.assignedRoleIds?.length) {
      return NextResponse.json(
        { success: false, error: 'Name, email, and at least one role are required.' },
        { status: 400 }
      );
    }

    const newUser = db.createUser(body);
    return NextResponse.json({ success: true, data: newUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/users
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'User ID is required.' }, { status: 400 });
    }

    const updated = db.updateUser(body.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/users
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'User ID parameter is required.' }, { status: 400 });
    }

    if (id === 'USR-1001') {
      return NextResponse.json(
        { success: false, error: 'Root Super Admin cannot be deleted.' },
        { status: 403 }
      );
    }

    const deleted = db.deleteUser(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'User deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

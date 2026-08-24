import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

// GET /api/admin/roles
export async function GET() {
  try {
    const roles = db.getRoles();
    return NextResponse.json({ success: true, data: roles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/roles
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.code) {
      return NextResponse.json(
        { success: false, error: 'Role name and role code are required.' },
        { status: 400 }
      );
    }

    const newRole = db.createRole({
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

    return NextResponse.json({ success: true, data: newRole }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

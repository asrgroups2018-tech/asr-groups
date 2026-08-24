import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

// GET /api/admin/permissions
export async function GET() {
  try {
    const matrix = db.getPermissionMatrix();
    return NextResponse.json({ success: true, data: matrix });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/permissions
export async function PUT(request: NextRequest) {
  try {
    const matrix = await request.json();
    const updated = db.updatePermissionMatrix(matrix);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

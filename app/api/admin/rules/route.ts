import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

// GET /api/admin/rules
export async function GET() {
  try {
    const rules = db.getApprovalRules();
    return NextResponse.json({ success: true, data: rules });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/rules
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.changeType || !body.whoCanRaise?.length || body.whoMustApprove === undefined) {
      return NextResponse.json(
        { success: false, error: 'Change type, initiators, and approver are required.' },
        { status: 400 }
      );
    }

    const newRule = db.createApprovalRule({
      changeType: body.changeType,
      description: body.description || '',
      whoCanRaise: body.whoCanRaise,
      whoMustApprove: body.whoMustApprove,
      amountThreshold: Number(body.amountThreshold) || 0,
      autoApproveBelow: !!body.autoApproveBelow,
      isActive: body.isActive !== undefined ? !!body.isActive : true,
    });

    return NextResponse.json({ success: true, data: newRule }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/rules
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Rule ID is required.' }, { status: 400 });
    }

    const updated = db.updateApprovalRule(body.id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Rule not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/rules
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Rule ID parameter is required.' }, { status: 400 });
    }

    const deleted = db.deleteApprovalRule(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Rule not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Rule deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

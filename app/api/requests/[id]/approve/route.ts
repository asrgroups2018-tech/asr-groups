import { NextRequest, NextResponse } from 'next/server';
import { approveApprovalRequest } from '@/lib/server/requests';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await approveApprovalRequest(id, {
      id: body.reviewerId,
      name: body.reviewerName,
      roleId: body.reviewerRoleId,
      notes: body.notes,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.request });
  } catch (err: any) {
    console.error('Error approving request:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

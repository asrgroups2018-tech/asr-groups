import { NextRequest, NextResponse } from 'next/server';
import { approveApprovalRequest } from '@/lib/server/requests';
import { authorizeRequest, isSuperAdmin } from '@/lib/server/authorization';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRequest(req, 'requests', 'approve');
  if (!auth.ok) return auth.response;
  try {
    const { id } = await params;
    const body = await req.json();
    const result = await approveApprovalRequest(id, {
      id: auth.user.id,
      name: auth.user.name,
      roleId: isSuperAdmin(auth.user) ? 0 : auth.user.primaryRoleId,
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

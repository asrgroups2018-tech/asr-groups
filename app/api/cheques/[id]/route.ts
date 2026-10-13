import { NextRequest, NextResponse } from 'next/server';
import { getChequeById, deleteCheque } from '@/lib/server/cheques';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { queueMutationForApproval } from '@/lib/server/approvalWorkflow';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const cheque = await getChequeById(id);
    if (!cheque) {
      return NextResponse.json({ success: false, error: 'Cheque not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: cheque });
  } catch (err: any) {
    console.error('Error fetching cheque:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const existing = await getChequeById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Cheque not found.' }, { status: 404 });
    }
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Cheque Deletion',
      title: `Delete cheque: ${existing.chequeNumber}`,
      entityType: 'cheque',
      entityId: id,
      amount: existing.amount,
      beforePayload: existing,
      proposedPayload: { chequeId: id },
    });
    if (queued) return queued;
    const success = await deleteCheque(id, auth.user);
    return NextResponse.json({ success });
  } catch (err: any) {
    console.error('Error deleting cheque:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

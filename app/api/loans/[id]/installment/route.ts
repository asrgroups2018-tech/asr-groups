import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { queueMutationForApproval } from '@/lib/server/approvalWorkflow';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const { id: loanId } = await context.params;
    const body = await req.json();
    const { installmentId, status, recdDate, amountDue, dueDate, chqNo, depName, place, remarks, companySplits } = body;

    if (!installmentId) {
      return NextResponse.json(
        { success: false, error: 'Installment ID is required.' },
        { status: 400 }
      );
    }

    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Collection Correction',
      title: `Update installment: ${installmentId}`,
      entityType: 'historical_receipt',
      entityId: installmentId,
      beforePayload: null,
      proposedPayload: { installmentId, updates: { status, recdDate, amountDue, dueDate, chqNo, depName, place, remarks, companySplits } },
    });
    if (queued) return queued;

    const updated = await db.updateLoanInstallment(installmentId, {
      status,
      recdDate,
      amountDue: amountDue !== undefined ? Number(amountDue) : undefined,
      dueDate,
      chqNo,
      depName,
      place,
      remarks,
      companySplits,
    }, auth.user);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Installment not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated, loanId });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { mergeLoans } from '@/lib/server/loans';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { queueMutationForApproval } from '@/lib/server/approvalWorkflow';
import { db } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const { targetLoanId, sourceLoanId } = body;

    if (!targetLoanId || !sourceLoanId) {
      return NextResponse.json({ success: false, error: 'Target and Source Loan IDs required.' }, { status: 400 });
    }

    if (targetLoanId === sourceLoanId) {
      return NextResponse.json({ success: false, error: 'Cannot merge a loan into itself.' }, { status: 400 });
    }

    const targetLoan = await db.getLoanById(targetLoanId);
    const sourceLoan = await db.getLoanById(sourceLoanId);
    if (!targetLoan || !sourceLoan) {
      return NextResponse.json({ success: false, error: 'Target or source loan not found.' }, { status: 404 });
    }
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Loan Merge',
      title: `Merge ${sourceLoanId} into ${targetLoanId}`,
      entityType: 'loan',
      entityId: targetLoanId,
      amount: targetLoan.totalAmount + sourceLoan.totalAmount,
      beforePayload: { targetLoan, sourceLoan },
      proposedPayload: { targetLoanId, sourceLoanId },
    });
    if (queued) return queued;

    const merged = await mergeLoans(targetLoanId, sourceLoanId, auth.user);
    return NextResponse.json({ success: true, data: merged });
  } catch (err: any) {
    console.error('Merge error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

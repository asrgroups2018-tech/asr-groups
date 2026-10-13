import { NextRequest, NextResponse } from 'next/server';
import { splitLoan } from '@/lib/server/loans';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { queueMutationForApproval } from '@/lib/server/approvalWorkflow';
import { db } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const { loanId, installmentIdsToExtract } = body;

    if (!loanId || !Array.isArray(installmentIdsToExtract) || installmentIdsToExtract.length === 0) {
      return NextResponse.json({ success: false, error: 'Loan ID and list of installments to extract required.' }, { status: 400 });
    }

    const loan = await db.getLoanById(loanId);
    if (!loan) {
      return NextResponse.json({ success: false, error: 'Loan not found.' }, { status: 404 });
    }
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Loan Split',
      title: `Split loan: ${loanId}`,
      entityType: 'loan',
      entityId: loanId,
      amount: loan.totalAmount,
      beforePayload: loan,
      proposedPayload: { parentLoanId: loanId, installmentIdsToExtract },
    });
    if (queued) return queued;

    const result = await splitLoan(loanId, installmentIdsToExtract, auth.user);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Split error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

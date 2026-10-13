import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { CUSTOMER_ROLE_ID } from '@/lib/types';
import { updateFullLoan, deleteLoan } from '@/lib/server/loans';
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
    const user = auth.user;
    const isCustomer = user?.isCustomer || user?.primaryRoleId === CUSTOMER_ROLE_ID;
    if (isCustomer && !user?.customerId) {
      return NextResponse.json({ error: 'This customer account is not mapped to a customer record.' }, { status: 403 });
    }
    const loan = await db.getLoanById(id, isCustomer ? user?.customerId : undefined);
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    return NextResponse.json(loan);
  } catch (err: any) {
    console.error('Error fetching loan:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const user = auth.user;
    if (user?.isCustomer || user?.primaryRoleId === CUSTOMER_ROLE_ID) {
      return NextResponse.json({ error: 'Customer accounts cannot edit loan records.' }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();

    const existing = await db.getLoanById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Loan Update',
      title: `Update loan: ${id}`,
      entityType: 'loan',
      entityId: id,
      amount: existing.totalAmount,
      beforePayload: existing,
      proposedPayload: { loanId: id, updateData: body },
    });
    if (queued) return queued;

    const updatedLoan = await updateFullLoan(id, body, auth.user);
    if (!updatedLoan) {
      return NextResponse.json({ error: 'Loan not found or update failed' }, { status: 404 });
    }

    return NextResponse.json(updatedLoan);
  } catch (err: any) {
    console.error(`[API PUT /api/loans/[id]] Error updating loan:`, err);
    return NextResponse.json({ error: err.message, stack: err.stack, message: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const user = auth.user;
    if (user?.isCustomer || user?.primaryRoleId === CUSTOMER_ROLE_ID) {
      return NextResponse.json({ error: 'Customer accounts cannot delete loan records.' }, { status: 403 });
    }
    const { id } = await context.params;
    const existing = await db.getLoanById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Loan Deletion',
      title: `Delete loan: ${id}`,
      entityType: 'loan',
      entityId: id,
      amount: existing.totalAmount,
      beforePayload: existing,
      proposedPayload: { loanId: id },
    });
    if (queued) return queued;
    const success = await deleteLoan(id, auth.user);
    return NextResponse.json({ success });
  } catch (err: any) {
    console.error('Error deleting loan:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

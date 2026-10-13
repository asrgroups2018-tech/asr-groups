import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { CUSTOMER_ROLE_ID } from '@/lib/types';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { queueMutationForApproval } from '@/lib/server/approvalWorkflow';

export async function GET(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;
    const user = auth.user;
    const isCustomer = user?.isCustomer || user?.primaryRoleId === CUSTOMER_ROLE_ID;
    if (isCustomer && !user?.customerId) {
      return NextResponse.json({ success: false, error: 'This customer account is not mapped to a customer record.' }, { status: 403 });
    }
    const loans = await db.getLoans(q, isCustomer ? user?.customerId : undefined);
    return NextResponse.json({ success: true, data: loans });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const user = auth.user;
    if (user?.isCustomer || user?.primaryRoleId === CUSTOMER_ROLE_ID) {
      return NextResponse.json({ success: false, error: 'Customer accounts can only view their loan records.' }, { status: 403 });
    }
    const body = await req.json();

    if (!body.customerId || !body.totalAmount || !body.installments?.length) {
      return NextResponse.json(
        { success: false, error: 'Customer, total amount, and installments are required.' },
        { status: 400 }
      );
    }

    const proposedPayload = {
      customerId: body.customerId,
      codeNo: body.codeNo,
      totalAmount: Number(body.totalAmount),
      disbursedAmount: body.disbursedAmount !== undefined ? Number(body.disbursedAmount) : null,
      interestAmount: body.interestAmount !== undefined ? Number(body.interestAmount) : null,
      startDate: body.startDate || new Date().toISOString().slice(0, 10),
      frequency: body.frequency || 'Monthly',
      splits: body.splits || [],
      installments: body.installments || [],
    };
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Loan Creation',
      title: `Create loan for customer ${body.customerId}`,
      entityType: 'loan',
      entityId: 'PENDING',
      amount: Number(body.totalAmount),
      beforePayload: null,
      proposedPayload: { loanData: proposedPayload },
    });
    if (queued) return queued;

    const created = await db.createLoan({
      customerId: body.customerId,
      codeNo: body.codeNo,
      totalAmount: Number(body.totalAmount),
      disbursedAmount: body.disbursedAmount !== undefined ? Number(body.disbursedAmount) : null,
      interestAmount: body.interestAmount !== undefined ? Number(body.interestAmount) : null,
      startDate: body.startDate || new Date().toISOString().slice(0, 10),
      frequency: body.frequency || 'Monthly',
      splits: body.splits || [],
      installments: body.installments || [],
    }, auth.user);

    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const user = auth.user;
    if (user?.isCustomer || user?.primaryRoleId === CUSTOMER_ROLE_ID) {
      return NextResponse.json({ success: false, error: 'Customer accounts cannot delete loan records.' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Loan ID required.' }, { status: 400 });
    }
    const existing = await db.getLoanById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Loan not found.' }, { status: 404 });
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
    const success = await db.deleteLoan(id, auth.user);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { CUSTOMER_ROLE_ID } from '@/lib/types';
import { updateFullLoan, deleteLoan } from '@/lib/server/loans';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const user = await db.getUserBySessionToken(request.cookies.get('asr_session')?.value);
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
  try {
    const user = await db.getUserBySessionToken(request.cookies.get('asr_session')?.value);
    if (user?.isCustomer || user?.primaryRoleId === CUSTOMER_ROLE_ID) {
      return NextResponse.json({ error: 'Customer accounts cannot edit loan records.' }, { status: 403 });
    }
    const { id } = await context.params;
    const body = await request.json();

    const updatedLoan = await updateFullLoan(id, body);
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
  try {
    const user = await db.getUserBySessionToken(request.cookies.get('asr_session')?.value);
    if (user?.isCustomer || user?.primaryRoleId === CUSTOMER_ROLE_ID) {
      return NextResponse.json({ error: 'Customer accounts cannot delete loan records.' }, { status: 403 });
    }
    const { id } = await context.params;
    const success = await deleteLoan(id);
    return NextResponse.json({ success });
  } catch (err: any) {
    console.error('Error deleting loan:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

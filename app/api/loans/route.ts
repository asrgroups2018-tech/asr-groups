import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { CUSTOMER_ROLE_ID } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;
    const user = await db.getUserBySessionToken(req.cookies.get('asr_session')?.value);
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
  try {
    const user = await db.getUserBySessionToken(req.cookies.get('asr_session')?.value);
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
    });

    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await db.getUserBySessionToken(req.cookies.get('asr_session')?.value);
    if (user?.isCustomer || user?.primaryRoleId === CUSTOMER_ROLE_ID) {
      return NextResponse.json({ success: false, error: 'Customer accounts cannot delete loan records.' }, { status: 403 });
    }
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Loan ID required.' }, { status: 400 });
    }
    const success = await db.deleteLoan(id);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

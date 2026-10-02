import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;
    const loans = await db.getLoans(q);
    return NextResponse.json({ success: true, data: loans });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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

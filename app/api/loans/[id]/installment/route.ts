import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { sNo, status, newDate, newDueDate, reason } = body;

    if (typeof sNo !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Installment sNo is required.' },
        { status: 400 }
      );
    }

    let updated = null;
    if (newDate) {
      updated = db.updateLoanInstallmentDate(id, sNo, newDate, newDueDate, reason);
    } else if (status) {
      updated = db.updateLoanInstallmentStatus(id, sNo, status);
    }

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Loan or installment not found.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
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
    });

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

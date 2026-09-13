import { NextRequest, NextResponse } from 'next/server';
import { updateLoanInstallment } from '@/lib/server/loans';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ installmentId: string }> }
) {
  try {
    const { installmentId } = await context.params;
    const body = await req.json();
    const { status, recdDate, amountDue, dueDate, chqNo, depName, place, remarks, companySplits } = body;

    if (!installmentId) {
      return NextResponse.json(
        { success: false, error: 'Installment ID is required.' },
        { status: 400 }
      );
    }

    const updated = await updateLoanInstallment(installmentId, {
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

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ installmentId: string }> }
) {
  return PATCH(req, context);
}

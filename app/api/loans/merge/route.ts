import { NextRequest, NextResponse } from 'next/server';
import { mergeLoans } from '@/lib/server/loans';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetLoanId, sourceLoanId } = body;

    if (!targetLoanId || !sourceLoanId) {
      return NextResponse.json({ success: false, error: 'Target and Source Loan IDs required.' }, { status: 400 });
    }

    if (targetLoanId === sourceLoanId) {
      return NextResponse.json({ success: false, error: 'Cannot merge a loan into itself.' }, { status: 400 });
    }

    const merged = await mergeLoans(targetLoanId, sourceLoanId);
    return NextResponse.json({ success: true, data: merged });
  } catch (err: any) {
    console.error('Merge error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

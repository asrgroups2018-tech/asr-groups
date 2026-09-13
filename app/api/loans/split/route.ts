import { NextRequest, NextResponse } from 'next/server';
import { splitLoan } from '@/lib/server/loans';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { loanId, installmentIdsToExtract } = body;

    if (!loanId || !Array.isArray(installmentIdsToExtract) || installmentIdsToExtract.length === 0) {
      return NextResponse.json({ success: false, error: 'Loan ID and list of installments to extract required.' }, { status: 400 });
    }

    const result = await splitLoan(loanId, installmentIdsToExtract);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Split error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

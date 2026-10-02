import { NextRequest, NextResponse } from 'next/server';
import { getHistoricalReceipts, updateLoanInstallment } from '@/lib/server/loans';

// GET /api/receipts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = (searchParams.get('category') as any) || 'ALL';
    const query = searchParams.get('q') || undefined;

    const result = await getHistoricalReceipts({
      outsideCategory: category,
      query,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// PUT /api/receipts — inline cell edit commit
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { installmentId, ...updates } = body;

    if (!installmentId) {
      return NextResponse.json({ success: false, error: 'Installment ID is required' }, { status: 400 });
    }

    // Build company splits object if individual company cols sent
    const companySplits: Record<string, number> = {};
    if (updates.pass !== undefined) companySplits['PASS'] = Number(updates.pass) || 0;
    if (updates.kars !== undefined) companySplits['KARS'] = Number(updates.kars) || 0;
    if (updates.infin !== undefined) companySplits['INFIN'] = Number(updates.infin) || 0;
    if (updates.ine !== undefined) companySplits['INE'] = Number(updates.ine) || 0;
    if (updates.ins !== undefined) companySplits['INS'] = Number(updates.ins) || 0;
    if (updates.ig !== undefined) companySplits['IG'] = Number(updates.ig) || 0;
    if (updates.mars !== undefined) companySplits['MARS'] = Number(updates.mars) || 0;
    if (updates.mm !== undefined) companySplits['MM'] = Number(updates.mm) || 0;
    if (updates.tg !== undefined) companySplits['TG'] = Number(updates.tg) || 0;
    if (updates.gs !== undefined) companySplits['GS'] = Number(updates.gs) || 0;
    if (updates.ala !== undefined) companySplits['ALA'] = Number(updates.ala) || 0;
    if (updates.fin !== undefined) companySplits['FIN'] = Number(updates.fin) || 0;
    if (updates.cs !== undefined) companySplits['CS'] = Number(updates.cs) || 0;
    if (updates.mc !== undefined) companySplits['MC'] = Number(updates.mc) || 0;
    if (updates.tatva !== undefined) companySplits['TATVA'] = Number(updates.tatva) || 0;
    if (updates.bhavna !== undefined) companySplits['BHAVNA'] = Number(updates.bhavna) || 0;
    if (updates.taSS !== undefined) companySplits['TA (SS)'] = Number(updates.taSS) || 0;

    const updated = await updateLoanInstallment(installmentId, {
      status: updates.status,
      recdDate: updates.recdDate !== undefined ? updates.recdDate : undefined,
      amountDue: updates.amount !== undefined ? Number(updates.amount) : undefined,
      dueDate: updates.date,
      chqNo: updates.chqNo,
      depName: updates.depName,
      place: updates.place,
      remarks: updates.remarks,
      companySplits: Object.keys(companySplits).length > 0 ? companySplits : undefined,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Installment not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

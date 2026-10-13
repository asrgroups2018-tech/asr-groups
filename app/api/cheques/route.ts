import { NextRequest, NextResponse } from 'next/server';
import { getCheques, createCheque } from '@/lib/server/cheques';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { queueMutationForApproval } from '@/lib/server/approvalWorkflow';

export async function GET(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const query = searchParams.get('q') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const cheques = await getCheques({
      status,
      query,
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, data: cheques });
  } catch (err: any) {
    console.error('Error fetching cheques:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();

    if (!body.chequeNumber || !body.customerName || !body.amount || !body.depositDate) {
      return NextResponse.json(
        { success: false, error: 'Cheque number, customer name, amount, and date to deposit are required.' },
        { status: 400 }
      );
    }

    const proposedPayload = {
      chequeNumber: body.chequeNumber,
      customerId: body.customerId || null,
      customerName: body.customerName,
      amount: Number(body.amount),
      depositDate: body.depositDate,
    };
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Cheque Creation',
      title: `Log cheque: ${body.chequeNumber}`,
      entityType: 'cheque',
      entityId: 'PENDING',
      amount: Number(body.amount),
      beforePayload: null,
      proposedPayload,
    });
    if (queued) return queued;

    const created = await createCheque({
      chequeNumber: body.chequeNumber,
      customerId: body.customerId || null,
      customerName: body.customerName,
      amount: Number(body.amount),
      depositDate: body.depositDate,
    }, auth.user);

    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    console.error('Error creating cheque:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

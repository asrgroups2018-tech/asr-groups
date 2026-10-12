import { NextRequest, NextResponse } from 'next/server';
import { markChequeDeposited } from '@/lib/server/cheques';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    let depositedAt: string | undefined;

    try {
      const body = await request.json();
      depositedAt = body?.depositedAt;
    } catch {
      // Body is optional
    }

    const updated = await markChequeDeposited(id, depositedAt);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Cheque not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error marking cheque deposited:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return POST(request, context);
}

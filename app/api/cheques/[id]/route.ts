import { NextRequest, NextResponse } from 'next/server';
import { getChequeById, deleteCheque } from '@/lib/server/cheques';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const cheque = await getChequeById(id);
    if (!cheque) {
      return NextResponse.json({ success: false, error: 'Cheque not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: cheque });
  } catch (err: any) {
    console.error('Error fetching cheque:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const success = await deleteCheque(id);
    return NextResponse.json({ success });
  } catch (err: any) {
    console.error('Error deleting cheque:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

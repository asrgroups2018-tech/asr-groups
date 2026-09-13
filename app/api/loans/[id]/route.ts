import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const loan = await db.getLoanById(id);
    if (!loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }
    return NextResponse.json(loan);
  } catch (err: any) {
    console.error('Error fetching loan:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    const updatedLoan = await db.updateFullLoan(id, body);
    if (!updatedLoan) {
      return NextResponse.json({ error: 'Loan not found or update failed' }, { status: 404 });
    }

    return NextResponse.json(updatedLoan);
  } catch (err: any) {
    console.error('Error updating loan:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const success = await db.deleteLoan(id);
    return NextResponse.json({ success });
  } catch (err: any) {
    console.error('Error deleting loan:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

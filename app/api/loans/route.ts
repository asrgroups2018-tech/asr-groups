import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || undefined;
  const loans = db.getLoans(q);
  return NextResponse.json({ success: true, data: loans });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.totalAmount || !body.customers?.length || !body.companies?.length) {
      return NextResponse.json(
        { success: false, error: 'Total amount, customer(s), and company split(s) are required.' },
        { status: 400 }
      );
    }
    const created = db.createLoan(body);
    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Loan ID required.' }, { status: 400 });
    }
    const updated = db.updateLoan(body.id, body.updates);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Loan not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Loan ID required.' }, { status: 400 });
    }
    const success = db.deleteLoan(id);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { commitReviewedImport } from '@/lib/server/loans';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const planRows = body.planRows || [];

    if (!Array.isArray(planRows) || planRows.length === 0) {
      return NextResponse.json({ success: false, error: 'No reviewed plan rows provided.' }, { status: 400 });
    }

    const result = await commitReviewedImport(planRows);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Import commit error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

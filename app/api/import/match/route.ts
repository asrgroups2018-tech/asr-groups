import { NextRequest, NextResponse } from 'next/server';
import { matchIncomingRows, RawIncomingRow } from '@/lib/server/continuationMatcher';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: RawIncomingRow[] = body.rows || [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No rows provided for matching.' }, { status: 400 });
    }

    const matchResult = await matchIncomingRows(rows);
    return NextResponse.json({ success: true, data: matchResult });
  } catch (err: any) {
    console.error('Import matching error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

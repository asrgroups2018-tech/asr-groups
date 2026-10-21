import { NextRequest, NextResponse } from 'next/server';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { getBalanceSheet, parseBalanceSheetPayload, updateBalanceSheet } from '@/lib/server/balanceSheet';

export async function GET(request: NextRequest) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ success: true, data: await getBalanceSheet() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to load balance sheet.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const document = parseBalanceSheetPayload(await request.json());
    if (!document) return NextResponse.json({ success: false, error: 'A valid balance sheet document is required.' }, { status: 400 });
    return NextResponse.json({ success: true, data: await updateBalanceSheet(document, auth.user) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to save balance sheet.' }, { status: 500 });
  }
}


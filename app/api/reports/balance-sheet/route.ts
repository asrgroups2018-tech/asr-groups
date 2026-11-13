import { NextRequest, NextResponse } from 'next/server';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { createBalanceSheet, getBalanceSheet, getBalanceSheets, parseBalanceSheetPayload, updateBalanceSheet } from '@/lib/server/balanceSheet';

export async function GET(request: NextRequest) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json({ success: true, data: await getBalanceSheet(searchParams.get('id') || undefined), documents: await getBalanceSheets() });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to load balance sheet.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ success: true, data: await createBalanceSheet(body, auth.user) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to create balance sheet.' }, { status: 400 });
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


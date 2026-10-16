import { NextRequest, NextResponse } from 'next/server';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { createManualReceipt, getManualReceipts } from '@/lib/server/manualReceipts';

export async function GET(request: NextRequest) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json({ success: true, data: await getManualReceipts() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load saved receipts.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const receipt = await createManualReceipt(body, auth.user);
    return NextResponse.json({ success: true, data: receipt }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to save receipt.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

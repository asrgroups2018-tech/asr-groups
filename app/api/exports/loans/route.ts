import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authorizeRequest } from '@/lib/server/authorization';

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'loans', 'export');
  if (!auth.ok) return auth.response;

  try {
    const loans = await db.getLoans(request.nextUrl.searchParams.get('q') || undefined);
    return NextResponse.json({ success: true, data: loans }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to prepare the export.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

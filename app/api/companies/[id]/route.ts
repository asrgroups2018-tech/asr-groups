import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authorizeRouteRequest } from '@/lib/server/authorization';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    const company = await db.getCompanyById(id);
    if (!company) {
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: company });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

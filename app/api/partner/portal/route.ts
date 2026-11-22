import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/server/authorization';
import { db } from '@/lib/server/db';

export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request);
  if (!auth.ok) return auth.response;
  if (!auth.user.partnerCompanyId) {
    return NextResponse.json({ success: false, error: 'A partner company account is required.' }, { status: 403 });
  }

  try {
    const data = await db.getPartnerPortalData(auth.user.partnerCompanyId);
    if (!data) return NextResponse.json({ success: false, error: 'The assigned partner company is unavailable.' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Partner portal data load failed:', error);
    return NextResponse.json({ success: false, error: 'Unable to load the company account right now.' }, { status: 500 });
  }
}

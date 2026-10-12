import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { CUSTOMER_ROLE_ID } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const user = await db.getUserBySessionToken(request.cookies.get('asr_session')?.value);
    const isCustomer = user?.isCustomer || user?.primaryRoleId === CUSTOMER_ROLE_ID;
    if (isCustomer && !user?.customerId) {
      return NextResponse.json({ success: false, error: 'This customer account is not mapped to a customer record.' }, { status: 403 });
    }
    const stats = await db.getDashboardStats(isCustomer ? user?.customerId : undefined);
    return NextResponse.json({ success: true, data: stats });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

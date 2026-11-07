import { NextRequest, NextResponse } from 'next/server';
import { CUSTOMER_ROLE_ID } from '@/lib/types';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { db } from '@/lib/server/db';

export async function POST(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;

  const user = auth.user;
  if (user.isCustomer || user.primaryRoleId === CUSTOMER_ROLE_ID) {
    return NextResponse.json(
      { success: false, error: 'Customer accounts cannot create borrowers.' },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required.' },
        { status: 400 },
      );
    }

    const created = await db.createCustomer({
      name,
      place: typeof body.place === 'string' ? body.place.trim() || undefined : undefined,
      codeNo: typeof body.codeNo === 'string' ? body.codeNo.trim() || undefined : undefined,
    }, user);

    return NextResponse.json({ success: true, data: created });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to create the borrower.' },
      { status: 500 },
    );
  }
}

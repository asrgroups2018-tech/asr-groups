import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

export async function GET() {
  try {
    const companies = await db.getCompanies();
    return NextResponse.json({ success: true, data: companies });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = body.name || body.companyName;
    const shortCode = body.shortCode || body.code || name;

    if (!name || !shortCode) {
      return NextResponse.json(
        { success: false, error: 'Company Name and Short Code are required.' },
        { status: 400 }
      );
    }
    const created = await db.createCompany({
      name,
      shortCode,
      isOutsideParty: !!body.isOutsideParty,
    });
    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

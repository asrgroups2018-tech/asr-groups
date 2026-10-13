import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { queueMutationForApproval } from '@/lib/server/approvalWorkflow';

export async function GET(request: NextRequest) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const companies = await db.getCompanies();
    return NextResponse.json({ success: true, data: companies });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
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
    const proposedPayload = {
      name,
      shortCode,
      isOutsideParty: !!body.isOutsideParty,
    };
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Company Creation',
      title: `Create company: ${shortCode}`,
      entityType: 'company',
      entityId: 'PENDING',
      beforePayload: null,
      proposedPayload,
    });
    if (queued) return queued;
    const created = await db.createCompany({
      name,
      shortCode,
      isOutsideParty: !!body.isOutsideParty,
    }, auth.user);
    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Company ID is required' }, { status: 400 });
    }
    const existing = await db.getCompanyById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Company not found.' }, { status: 404 });
    }
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Company Deletion',
      title: `Delete company: ${existing.name}`,
      entityType: 'company',
      entityId: id,
      beforePayload: existing,
      proposedPayload: { companyId: id },
    });
    if (queued) return queued;
    const deleted = await db.deleteCompany(id, auth.user);
    return NextResponse.json({ success: true, data: { id, deleted } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}


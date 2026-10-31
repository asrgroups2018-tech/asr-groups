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
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unable to load companies.' }, { status: 500 });
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
    const openingBalance = body.openingBalance === '' || body.openingBalance === null || body.openingBalance === undefined
      ? 0
      : Number(body.openingBalance);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      return NextResponse.json(
        { success: false, error: 'Opening Balance must be a valid non-negative amount.' },
        { status: 400 }
      );
    }
    const openingBalanceType = body.openingBalanceType === 'CREDIT' ? 'CREDIT' : 'DEBIT';
    const proposedPayload = {
      name,
      shortCode,
      isOutsideParty: !!body.isOutsideParty,
      openingBalance,
      openingBalanceType,
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
      openingBalance,
      openingBalanceType,
    }, auth.user);
    return NextResponse.json({ success: true, data: created });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unable to create company.' }, { status: 500 });
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
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unable to delete company.' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const id = String(body.id || '').trim();
    const openingBalance = body.openingBalance === '' || body.openingBalance === null || body.openingBalance === undefined
      ? 0
      : Number(body.openingBalance);
    if (!id || !Number.isFinite(openingBalance) || openingBalance < 0) {
      return NextResponse.json({ success: false, error: 'Company ID and a valid non-negative Opening Balance are required.' }, { status: 400 });
    }
    const existing = await db.getCompanyById(id);
    if (!existing) return NextResponse.json({ success: false, error: 'Company not found.' }, { status: 404 });
    const updated = await db.updateCompanyOpeningBalance(id, openingBalance, body.openingBalanceType === 'CREDIT' ? 'CREDIT' : 'DEBIT', auth.user);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Unable to update company opening balance.' }, { status: 500 });
  }
}


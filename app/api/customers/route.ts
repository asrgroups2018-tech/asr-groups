import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { queueMutationForApproval } from '@/lib/server/approvalWorkflow';

export async function GET(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || undefined;
    const customers = await db.getCustomers(q);
    return NextResponse.json({ success: true, data: customers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const name = body.name || body.fullName;
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Customer name is required.' },
        { status: 400 }
      );
    }
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Customer Creation',
      title: `Create customer: ${name}`,
      entityType: 'customer',
      entityId: 'PENDING',
      beforePayload: null,
      proposedPayload: { name, place: body.place || body.address, codeNo: body.codeNo || body.code, phone: body.phone },
    });
    if (queued) return queued;
    const created = await db.createCustomer({
      name,
      place: body.place || body.address,
      codeNo: body.codeNo || body.code,
      phone: body.phone,
    }, auth.user);
    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Customer ID required.' }, { status: 400 });
    }
    const existing = await db.getCustomerById(body.id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404 });
    }
    const updates = body.updates || body;
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Customer Update',
      title: `Update customer: ${existing.name}`,
      entityType: 'customer',
      entityId: body.id,
      beforePayload: existing,
      proposedPayload: { customerId: body.id, updates },
    });
    if (queued) return queued;
    const updated = await db.updateCustomer(body.id, updates, auth.user);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: updated });
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
      return NextResponse.json({ success: false, error: 'Customer ID required.' }, { status: 400 });
    }
    const existing = await db.getCustomerById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Customer not found.' }, { status: 404 });
    }
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Customer Deletion',
      title: `Delete customer: ${existing.name}`,
      entityType: 'customer',
      entityId: id,
      beforePayload: existing,
      proposedPayload: { customerId: id },
    });
    if (queued) return queued;
    const success = await db.deleteCustomer(id, auth.user);
    return NextResponse.json({ success });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

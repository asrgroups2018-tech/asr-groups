import { NextRequest, NextResponse } from 'next/server';
import { commitReviewedImport } from '@/lib/server/loans';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { queueMutationForApproval } from '@/lib/server/approvalWorkflow';

export async function POST(req: NextRequest) {
  const auth = await authorizeRouteRequest(req);
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const planRows = body.planRows || [];

    if (!Array.isArray(planRows) || planRows.length === 0) {
      return NextResponse.json({ success: false, error: 'No reviewed plan rows provided.' }, { status: 400 });
    }

    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Spreadsheet Import',
      title: `Commit spreadsheet import (${planRows.length} rows)`,
      entityType: 'historical_receipt',
      entityId: 'IMPORT-PENDING',
      beforePayload: null,
      proposedPayload: { planRows },
    });
    if (queued) return queued;

    const result = await commitReviewedImport(planRows, auth.user);
    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Import commit error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

// GET /api/admin/audit
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const actorId = searchParams.get('actorId');
    const action = searchParams.get('action');
    const sensitiveOnly = searchParams.get('sensitive') === 'true';

    let logs = db.getAuditLogs();

    if (actorId) {
      logs = logs.filter((l) => l.actorId === actorId || l.actorName.includes(actorId));
    }
    if (action) {
      logs = logs.filter((l) => l.action === action);
    }
    if (sensitiveOnly) {
      logs = logs.filter((l) => l.isSensitive);
    }

    return NextResponse.json({ success: true, data: logs, total: logs.length });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/admin/audit
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.action || !body.target) {
      return NextResponse.json(
        { success: false, error: 'Action and target are required.' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Browser Client';

    const newLog = db.logAudit({
      actorId: body.actorId || 'ADM-1001',
      actorName: body.actorName || 'System Administrator',
      actorRoleId: body.actorRoleId !== undefined ? body.actorRoleId : 0,
      action: body.action,
      target: body.target,
      beforeVal: body.beforeVal,
      afterVal: body.afterVal,
      ipAddress: ip,
      device: userAgent.slice(0, 40),
      isSensitive: !!body.isSensitive,
    });

    return NextResponse.json({ success: true, data: newLog }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authorizeRequest } from '@/lib/server/authorization';

// POST /api/admin/backup
export async function POST(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'create');
  if (!auth.ok) return auth.response;
  try {
    const timestamp = await db.triggerBackup();
    await db.logAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRoleId: auth.user.primaryRoleId,
      action: 'Triggered Backup',
      target: 'Database backup',
      afterVal: timestamp,
      isSensitive: true,
    });
    return NextResponse.json({
      success: true,
      message: 'Encrypted snapshot created successfully.',
      timestamp,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

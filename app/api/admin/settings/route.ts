import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';
import { authorizeRequest } from '@/lib/server/authorization';

// GET /api/admin/settings
export async function GET(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'view');
  if (!auth.ok) return auth.response;
  try {
    const settings = await db.getSystemSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/settings
export async function PUT(request: NextRequest) {
  const auth = await authorizeRequest(request, 'admin', 'edit');
  if (!auth.ok) return auth.response;
  try {
    const body = await request.json();

    // Validate shareholder split if provided
    if (body.shareholders) {
      const total = body.shareholders.reduce(
        (sum: number, sh: any) => sum + (Number(sh.percentage) || 0),
        0
      );
      if (Math.round(total) !== 100) {
        return NextResponse.json(
          {
            success: false,
            error: `Shareholder equity total equals ${total}%. It must equal exactly 100%.`,
          },
          { status: 400 }
        );
      }
    }

    const updated = await db.updateSystemSettings(body);
    await db.logAudit({
      actorId: auth.user.id,
      actorName: auth.user.name,
      actorRoleId: auth.user.primaryRoleId,
      action: 'Updated Settings',
      target: 'System settings',
      afterVal: JSON.stringify(body),
      isSensitive: true,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

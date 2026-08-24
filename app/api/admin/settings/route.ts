import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

// GET /api/admin/settings
export async function GET() {
  try {
    const settings = db.getSystemSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/settings
export async function PUT(request: NextRequest) {
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

    const updated = db.updateSystemSettings(body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

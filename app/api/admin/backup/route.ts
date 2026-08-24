import { NextResponse } from 'next/server';
import { db } from '@/lib/server/db';

// POST /api/admin/backup
export async function POST() {
  try {
    const timestamp = db.triggerBackup();
    return NextResponse.json({
      success: true,
      message: 'Encrypted snapshot created successfully.',
      timestamp,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

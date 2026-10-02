import { NextRequest, NextResponse } from 'next/server';
import { getApprovalRequests, createApprovalRequest } from '@/lib/server/requests';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const changeType = searchParams.get('changeType') || undefined;
    const query = searchParams.get('q') || undefined;

    const data = await getApprovalRequests({ status, changeType, query });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error fetching approval requests:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newRequest = await createApprovalRequest(body);
    return NextResponse.json({ success: true, data: newRequest });
  } catch (err: any) {
    console.error('Error creating approval request:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

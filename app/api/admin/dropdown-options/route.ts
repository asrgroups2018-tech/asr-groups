import { NextRequest, NextResponse } from 'next/server';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { createDropdownOption, deactivateDropdownOption, getDropdownOptions } from '@/lib/server/dropdownOptions';

function isAdministrator(user: { assignedRoleIds?: number[]; primaryRoleId?: number }) {
  return user.assignedRoleIds?.includes(0) || user.primaryRoleId === 0;
}

export async function GET(request: NextRequest) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(request.url);
    return NextResponse.json({
      success: true,
      data: await getDropdownOptions(searchParams.get('type') || undefined, searchParams.get('includeInactive') === 'true'),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to load dropdown options.' }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  if (!isAdministrator(auth.user)) return NextResponse.json({ success: false, error: 'Administrator access is required.' }, { status: 403 });
  try {
    const body = await request.json();
    return NextResponse.json({ success: true, data: await createDropdownOption(body) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to create dropdown option.' }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  if (!isAdministrator(auth.user)) return NextResponse.json({ success: false, error: 'Administrator access is required.' }, { status: 403 });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'Option ID is required.' }, { status: 400 });
    return NextResponse.json({ success: true, data: await deactivateDropdownOption(id) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to delete dropdown option.' }, { status: 400 });
  }
}

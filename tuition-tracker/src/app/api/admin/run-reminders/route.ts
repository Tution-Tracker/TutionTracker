export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAdminRequest } from '@/lib/serverAuth';
import { sendClassTomorrowReminders, sendUnpaidFeeReminders } from '@/lib/reminders';

export async function POST(request: NextRequest): Promise<NextResponse> {
  const admin = await verifyAdminRequest(request);
  if (!admin) {
    return NextResponse.json({ error: 'Not authorized.' }, { status: 401 });
  }

  let force = false;
  try {
    const body = await request.json();
    force = !!body.force;
  } catch (e) {
  }

  try {
    const [classReminders, feeReminders] = await Promise.all([
      sendClassTomorrowReminders(),
      sendUnpaidFeeReminders({ force }),
    ]);
    return NextResponse.json({ ok: true, classReminders, feeReminders });
  } catch (e) {
    console.error('run-reminders failed:', e);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
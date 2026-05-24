import { NextRequest, NextResponse } from 'next/server';
import { getRows, appendRow, updateRow, SHEETS } from '@/lib/sheets';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await getRows(SHEETS.SETTINGS);
    const setting = rows.find(r => r.userId === userId);
    return NextResponse.json(setting || { userId, monthlyCutoffDay: '1' });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const { monthlyCutoffDay } = await req.json();
    const rows = await getRows(SHEETS.SETTINGS);
    const idx = rows.findIndex(r => r.userId === userId);
    const data = { userId, monthlyCutoffDay: String(monthlyCutoffDay) };

    if (idx === -1) {
      await appendRow(SHEETS.SETTINGS, data);
    } else {
      await updateRow(SHEETS.SETTINGS, idx, data);
    }
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

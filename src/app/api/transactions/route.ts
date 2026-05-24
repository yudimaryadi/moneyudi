import { NextRequest, NextResponse } from 'next/server';
import { getRows, appendRow, SHEETS, generateId } from '@/lib/sheets';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await getRows(SHEETS.TRANSACTIONS);
    const limit = parseInt(new URL(req.url).searchParams.get('limit') || '500');
    const userRows = rows.filter(r => r.userId === userId).sort((a, b) => b.date.localeCompare(a.date));
    return NextResponse.json(userRows.slice(0, limit));
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const { amount, type, note, categoryId, date } = await req.json();
    const id = generateId();
    const row = {
      id, userId,
      amount: String(amount),
      type,
      note: note || '',
      categoryId,
      date: date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };
    await appendRow(SHEETS.TRANSACTIONS, row);
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

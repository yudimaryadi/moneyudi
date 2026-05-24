import { NextRequest, NextResponse } from 'next/server';
import { getRows, appendRow, SHEETS, generateId } from '@/lib/sheets';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await getRows(SHEETS.CATEGORIES);
    return NextResponse.json(rows.filter(r => r.userId === userId));
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const { name, icon, typeScope } = await req.json();
    const id = generateId();
    const row = { id, userId, name, icon: icon || '📦', typeScope: typeScope || 'both', createdAt: new Date().toISOString() };
    await appendRow(SHEETS.CATEGORIES, row);
    return NextResponse.json(row, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

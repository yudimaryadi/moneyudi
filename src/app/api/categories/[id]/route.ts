import { NextRequest, NextResponse } from 'next/server';
import { getRows, updateRow, deleteRow, SHEETS } from '@/lib/sheets';
import { verifyToken } from '@/lib/auth';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await getRows(SHEETS.CATEGORIES);
    const idx = rows.findIndex(r => r.id === params.id && r.userId === userId);
    if (idx === -1) return NextResponse.json({ message: 'Tidak ditemukan' }, { status: 404 });

    const body = await req.json();
    const updated = { ...rows[idx], ...body };
    await updateRow(SHEETS.CATEGORIES, idx, updated);
    return NextResponse.json(updated);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const rows = await getRows(SHEETS.CATEGORIES);
    const idx = rows.findIndex(r => r.id === params.id && r.userId === userId);
    if (idx === -1) return NextResponse.json({ message: 'Tidak ditemukan' }, { status: 404 });

    await deleteRow(SHEETS.CATEGORIES, idx);
    return NextResponse.json({ message: 'Berhasil dihapus' });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getRows, deleteRow, SHEETS } from '@/lib/sheets';
import { verifyToken } from '@/lib/auth';

async function deleteUserRows(sheet: string, userId: string) {
  const rows = await getRows(sheet);
  // Delete in reverse order to preserve indices
  const indices = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.userId === userId).map(({ i }) => i).reverse();
  for (const i of indices) await deleteRow(sheet, i);
}

export async function DELETE(req: NextRequest) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    await deleteUserRows(SHEETS.TRANSACTIONS, userId);
    await deleteUserRows(SHEETS.CATEGORIES, userId);
    await deleteUserRows(SHEETS.BUDGETS, userId);
    await deleteUserRows(SHEETS.SETTINGS, userId);

    const users = await getRows(SHEETS.USERS);
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) await deleteRow(SHEETS.USERS, idx);

    return NextResponse.json({ message: 'Akun berhasil dihapus' });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

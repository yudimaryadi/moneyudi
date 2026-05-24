import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getRows, updateRow, SHEETS } from '@/lib/sheets';
import { verifyToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await req.json();
    const users = await getRows(SHEETS.USERS);
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return NextResponse.json({ message: 'User tidak ditemukan' }, { status: 404 });

    if (!(await bcrypt.compare(currentPassword, users[idx].password))) {
      return NextResponse.json({ message: 'Password lama salah' }, { status: 400 });
    }

    users[idx].password = await bcrypt.hash(newPassword, 10);
    await updateRow(SHEETS.USERS, idx, users[idx]);
    return NextResponse.json({ message: 'Password berhasil diubah' });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

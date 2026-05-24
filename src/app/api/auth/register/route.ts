import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getRows, appendRow, initSheets, SHEETS, generateId } from '@/lib/sheets';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initSheets();
    const { email, password, name } = await req.json();
    const users = await getRows(SHEETS.USERS);

    if (users.find(u => u.email === email)) {
      return NextResponse.json({ message: 'Email sudah terdaftar' }, { status: 400 });
    }

    const id = generateId();
    const hashed = await bcrypt.hash(password, 10);
    await appendRow(SHEETS.USERS, { id, email, password: hashed, name: name || '', createdAt: new Date().toISOString() });

    const token = signToken(id);
    return NextResponse.json({ access_token: token, user: { id, email, name: name || '' } });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getRows, initSheets, SHEETS } from '@/lib/sheets';
import { signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await initSheets();
    const { email, password } = await req.json();
    const users = await getRows(SHEETS.USERS);
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ message: 'Email atau password salah' }, { status: 401 });
    }

    const token = signToken(user.id);
    return NextResponse.json({ access_token: token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

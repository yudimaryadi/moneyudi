import { NextRequest, NextResponse } from 'next/server';
import { getRows, SHEETS } from '@/lib/sheets';
import { verifyToken } from '@/lib/auth';

// Gemini free tier (aistudio.google.com/apikey). Model bisa diganti lewat env.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const FALLBACKS = ['gemini-3.5-flash-lite', 'gemini-flash-latest'];

export async function POST(req: NextRequest) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ message: 'GEMINI_API_KEY belum diset' }, { status: 500 });

  const { text } = await req.json();
  if (!text || typeof text !== 'string' || text.length > 500) {
    return NextResponse.json({ message: 'Teks tidak valid' }, { status: 400 });
  }

  try {
    const cats = (await getRows(SHEETS.CATEGORIES)).filter(c => c.userId === userId);
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD

    const prompt = `Kamu parser transaksi keuangan. Hari ini ${today}.
Ubah teks user menjadi JSON transaksi.
Aturan:
- amount dalam rupiah, angka bulat. "20K"/"20rb" = 20000, "1.5jt" = 1500000.
- type "income" untuk gaji/terima/dapat uang, selain itu "expense".
- categoryId WAJIB salah satu id dari daftar kategori di bawah yang paling cocok (sesuai typeScope).
- title singkat (maks 4 kata), description satu kalimat pendek, bahasa Indonesia.
- date format YYYY-MM-DD; "kemarin" = sehari sebelum hari ini; default hari ini.
Kategori: ${JSON.stringify(cats.map(c => ({ id: c.id, name: c.name, typeScope: c.typeScope })))}
Teks: ${JSON.stringify(text)}`;

    const body = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              amount: { type: 'NUMBER' },
              type: { type: 'STRING', enum: ['expense', 'income'] },
              categoryId: { type: 'STRING' },
              title: { type: 'STRING' },
              description: { type: 'STRING' },
              date: { type: 'STRING' },
            },
            required: ['amount', 'type', 'categoryId', 'title', 'date'],
          },
        },
      });

    // Free tier sering 503/429 saat ramai → coba model berikutnya
    let res: Response | null = null;
    for (const model of [MODEL, ...FALLBACKS]) {
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
          body,
          signal: AbortSignal.timeout(15000),
        });
      } catch {
        res = null; // timeout → coba model berikutnya
        continue;
      }
      if (res.status !== 503 && res.status !== 429) break;
    }
    if (!res) return NextResponse.json({ message: 'AI timeout, coba lagi' }, { status: 504 });
    if (!res.ok) return NextResponse.json({ message: `AI error ${res.status}` }, { status: 502 });

    const data = await res.json();
    const out = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');

    // Jangan percaya output AI mentah-mentah
    return NextResponse.json({
      amount: Math.max(0, Math.round(Number(out.amount) || 0)),
      type: out.type === 'income' ? 'income' : 'expense',
      categoryId: cats.some(c => c.id === out.categoryId) ? out.categoryId : '',
      title: String(out.title || '').slice(0, 60),
      description: String(out.description || '').slice(0, 200),
      date: /^\d{4}-\d{2}-\d{2}$/.test(out.date) ? out.date : today,
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

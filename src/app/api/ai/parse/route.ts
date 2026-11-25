import { NextRequest, NextResponse } from 'next/server';
import { getRows, SHEETS } from '@/lib/sheets';
import { verifyToken } from '@/lib/auth';

// Gemini free tier (aistudio.google.com/apikey). Model bisa diganti lewat env.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const FALLBACKS = ['gemini-3.5-flash-lite', 'gemini-flash-latest'];
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_B64 = 3_000_000; // ~2.2MB; client mengecilkan foto dulu

export async function POST(req: NextRequest) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ message: 'GEMINI_API_KEY belum diset' }, { status: 500 });

  const { text = '', image, mimeType } = await req.json();
  if (typeof text !== 'string' || text.length > 500) {
    return NextResponse.json({ message: 'Teks tidak valid' }, { status: 400 });
  }
  if (image && (typeof image !== 'string' || image.length > MAX_IMAGE_B64 || !IMAGE_TYPES.includes(mimeType))) {
    return NextResponse.json({ message: 'Gambar tidak valid / terlalu besar' }, { status: 400 });
  }
  if (!text.trim() && !image) return NextResponse.json({ message: 'Isi teks atau foto struk' }, { status: 400 });

  try {
    const cats = (await getRows(SHEETS.CATEGORIES)).filter(c => c.userId === userId);
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }); // YYYY-MM-DD

    const prompt = `Kamu parser transaksi keuangan. Hari ini ${today}.
Ubah input user menjadi daftar transaksi (items).
Aturan:
- Satu teks bisa berisi beberapa transaksi ("nasi 20k, kopi 15k" = 2 item). Satu barang/aktivitas = satu item.
- Jika ada foto struk/nota: buat SATU item dengan TOTAL yang dibayar, title = nama toko/jenis belanja, description = ringkasan barang, date = tanggal di struk (jika terbaca).
- amount dalam rupiah, angka bulat. "20K"/"20rb" = 20000, "1.5jt" = 1500000, "25 ribu" = 25000.
- type "income" untuk gaji/terima/dapat uang, selain itu "expense".
- categoryId WAJIB salah satu id dari daftar kategori di bawah yang paling cocok (sesuai typeScope).
- title singkat (maks 4 kata), description satu kalimat pendek, bahasa Indonesia.
- date format YYYY-MM-DD; "kemarin" = sehari sebelum hari ini; default hari ini.
Kategori: ${JSON.stringify(cats.map(c => ({ id: c.id, name: c.name, typeScope: c.typeScope })))}
Teks: ${JSON.stringify(text)}`;

    const parts: any[] = [{ text: prompt }];
    if (image) parts.push({ inlineData: { mimeType, data: image } });

    const body = JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            items: {
              type: 'ARRAY',
              items: {
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
          },
          required: ['items'],
        },
      },
    });

    // Free tier sering 5xx/429 saat ramai → coba model berikutnya
    let res: Response | null = null;
    for (const model of [MODEL, ...FALLBACKS]) {
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
          body,
          signal: AbortSignal.timeout(image ? 30000 : 15000),
        });
      } catch {
        res = null; // timeout → coba model berikutnya
        continue;
      }
      if (res.status < 500 && res.status !== 429) break;
    }
    if (!res) return NextResponse.json({ message: 'AI timeout, coba lagi' }, { status: 504 });
    if (!res.ok) return NextResponse.json({ message: `AI error ${res.status}` }, { status: 502 });

    const data = await res.json();
    const out = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');

    // Jangan percaya output AI mentah-mentah
    const items = (Array.isArray(out.items) ? out.items : [])
      .slice(0, 20)
      .map((o: any) => ({
        amount: Math.max(0, Math.round(Number(o.amount) || 0)),
        type: o.type === 'income' ? 'income' : 'expense',
        categoryId: cats.some(c => c.id === o.categoryId) ? o.categoryId : '',
        title: String(o.title || '').slice(0, 60),
        description: String(o.description || '').slice(0, 200),
        date: /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : today,
      }))
      .filter((o: any) => o.amount > 0);
    if (items.length === 0) return NextResponse.json({ message: 'Tidak ada transaksi terbaca' }, { status: 422 });

    return NextResponse.json({ items });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}

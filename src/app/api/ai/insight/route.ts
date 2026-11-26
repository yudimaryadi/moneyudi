import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { generateJson, AiError } from '@/lib/gemini';

// Body: aggregated numbers only (per-period totals per category + suggested budgets).
// No notes or line items leave the app.
export async function POST(req: NextRequest) {
  const userId = verifyToken(req);
  if (!userId) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

  const raw = await req.text();
  if (raw.length > 20000) return NextResponse.json({ message: 'Data terlalu besar' }, { status: 400 });
  let summary: any;
  try {
    summary = JSON.parse(raw);
  } catch {
    return NextResponse.json({ message: 'Data tidak valid' }, { status: 400 });
  }
  if (!Array.isArray(summary?.periods) || summary.periods.length === 0) {
    return NextResponse.json({ message: 'Belum ada data untuk dianalisa' }, { status: 400 });
  }

  const prompt = `Kamu penasihat keuangan pribadi yang ringkas dan praktis. Bahasa Indonesia santai, sapa dengan "kamu".
Data pengeluaran (rupiah) per periode gajian, dari yang terlama ke terbaru, plus saran anggaran periode depan yang sudah dihitung aplikasi:
${JSON.stringify(summary)}

Tugas:
- summary: 1-2 kalimat gambaran pola pengeluaran (tren naik/turun, kategori terbesar).
- tips: 3-4 saran konkret dan spesifik untuk periode depan, sebut nama kategori dan angka bila relevan. Jangan mengulang angka saran anggaran mentah-mentah; beri alasan/aksi.
Jangan mengarang data yang tidak ada.`;

  try {
    const out = await generateJson([{ text: prompt }], {
      type: 'OBJECT',
      properties: {
        summary: { type: 'STRING' },
        tips: { type: 'ARRAY', items: { type: 'STRING' } },
      },
      required: ['summary', 'tips'],
    });
    return NextResponse.json({
      summary: String(out.summary || '').slice(0, 500),
      tips: (Array.isArray(out.tips) ? out.tips : []).slice(0, 4).map((t: any) => String(t).slice(0, 300)),
    });
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: e instanceof AiError ? e.status : 500 });
  }
}

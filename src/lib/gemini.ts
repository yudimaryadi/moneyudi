// Gemini free tier (aistudio.google.com/apikey). Model bisa diganti lewat env.
const MODEL = process.env.GEMINI_MODEL || 'gemini-flash-lite-latest';
const FALLBACKS = ['gemini-3.5-flash-lite', 'gemini-flash-latest'];

export class AiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// Gemini status → message the user can act on
function friendly(status: number) {
  if (status === 429) return new AiError('Kuota AI sedang penuh. Tunggu sebentar atau isi manual.', 429);
  if (status === 400 || status === 401 || status === 403)
    return new AiError('Kunci AI tidak valid. Cek pengaturan GEMINI_API_KEY.', 502);
  return new AiError('Layanan AI sedang bermasalah. Coba lagi sebentar lagi.', 502);
}

/** Call Gemini with JSON output; tries fallback models on 5xx/429/timeout. Returns parsed JSON. */
export async function generateJson(parts: any[], responseSchema: object, timeoutMs = 15000): Promise<any> {
  if (!process.env.GEMINI_API_KEY) throw new AiError('GEMINI_API_KEY belum diset', 500);
  const body = JSON.stringify({
    contents: [{ parts }],
    generationConfig: { responseMimeType: 'application/json', responseSchema },
  });

  let res: Response | null = null;
  for (const model of [MODEL, ...FALLBACKS]) {
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
        body,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      res = null; // timeout → next model
      continue;
    }
    if (res.status < 500 && res.status !== 429) break;
  }
  if (!res) throw new AiError('AI tidak merespons. Coba lagi.', 504);
  if (!res.ok) throw friendly(res.status);

  const data = await res.json();
  try {
    return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
  } catch {
    return {};
  }
}

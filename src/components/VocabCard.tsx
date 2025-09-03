'use client'

import React, { useEffect, useMemo, useState } from 'react'

type VocabState = {
  word: string
  meaningId: string
  meaningEn: string
  example: string
  phonetic?: string
  updatedAt: string
}

const ONE_HOUR = 60 * 60 * 1000
const CACHE_KEY = 'moneyudi_vocab_cache_v1'

const exampleTemplates = [
  'I find {word} quite fascinating in many ways.',
  'The concept of {word} has always intrigued me.',
  'Nothing beats the feeling of being {word}.',
  'Her approach was remarkably {word} and effective.',
  'We witnessed something truly {word} yesterday.',
  'The {word} nature of this project impressed everyone.',
  'He spoke with such {word} that moved the audience.',
  'The garden looked absolutely {word} in spring.',
  'Their {word} performance earned a standing ovation.',
  'What makes this place {word} is its rich history.',
]

// ---- helpers
const createVariedExample = (word: string, originalExample?: string) => {
  if (originalExample && !originalExample.toLowerCase().includes('this is a')) {
    return originalExample
  }
  const t = exampleTemplates[Math.floor(Math.random() * exampleTemplates.length)]
  return t.replace('{word}', word.toLowerCase())
}

const speak = (text: string) => {
  if (!text || !window.speechSynthesis) return
  
  window.speechSynthesis.cancel()
  
  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.8
    u.volume = 1
    window.speechSynthesis.speak(u)
  }, 100)
}

const loadCache = (): VocabState | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as VocabState) : null
  } catch {
    return null
  }
}

const saveCache = (s: VocabState) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(s))
  } catch {}
}

// APIs: random word → definition/example → translate EN→ID
const fetchRandomWord = async (): Promise<string> => {
  try {
    // Gratis, tanpa key
    const r = await fetch('https://random-word-api.vercel.app/api?words=1', { cache: 'no-store' })
    const j = await r.json()
    const w = Array.isArray(j) ? j[0] : ''
    if (typeof w === 'string' && w.length > 1) return w
  } catch {}
  const fallback = ['amazing', 'beautiful', 'creative', 'elegant', 'fantastic', 'incredible', 'wonderful', 'brilliant', 'charming', 'delightful']
  return fallback[Math.floor(Math.random() * fallback.length)]
}

const fetchDefinition = async (
  word: string
): Promise<{ word: string; defEn: string; phonetic: string; example: string }> => {
  try {
    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`)
    const j = await r.json()
    const e = j?.[0]
    const phon = e?.phonetic || e?.phonetics?.[0]?.text || ''
    const defs = (e?.meanings || []).flatMap((m: any) => m.definitions || [])
    const defEn = defs?.[0]?.definition || 'Definition not available'
    const ex = defs?.find((d: any) => d.example)?.example || defs?.[0]?.example || ''
    return { word: e?.word || word, defEn, phonetic: phon, example: ex }
  } catch {
    return { word, defEn: 'Definition not available', phonetic: '', example: '' }
  }
}

const translateToId = async (text: string): Promise<string> => {
  if (!text) return ''
  try {
    const r = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|id`)
    const j = await r.json()
    const t = j?.responseData?.translatedText
    if (typeof t === 'string' && t.trim()) return t
  } catch {}
  return text // fallback ke EN jika gagal
}

// ======================= COMPONENT =======================
export function VocabCard() {
  const [state, setState] = useState<VocabState | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async (forceNew = true) => {
    setLoading(true)
    try {
      const word = forceNew ? await fetchRandomWord() : state?.word || (await fetchRandomWord())
      const { word: w, defEn, phonetic, example: ex } = await fetchDefinition(word)
      const example = createVariedExample(w, ex)
      const meaningId = await translateToId(defEn)
      const next: VocabState = {
        word: w,
        meaningId,
        meaningEn: defEn,
        example,
        phonetic,
        updatedAt: new Date().toISOString(),
      }
      setState(next)
      saveCache(next)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const cached = loadCache()
    if (cached && Date.now() - new Date(cached.updatedAt).getTime() < ONE_HOUR) {
      setState(cached)
      setLoading(false)
    } else {
      refresh(true)
    }

    // auto-refresh: cek tiap menit, jika >1 jam akan refresh
    const id = setInterval(() => {
      const cur = loadCache()
      if (!cur || Date.now() - new Date(cur.updatedAt).getTime() >= ONE_HOUR) {
        refresh(true)
      }
    }, 60 * 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const minutesLeft = useMemo(() => {
    if (!state?.updatedAt) return null
    const diff = ONE_HOUR - (Date.now() - new Date(state.updatedAt).getTime())
    return Math.max(0, Math.ceil(diff / (60 * 1000)))
  }, [state?.updatedAt])

  return (
    <div className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📚</span>
          <h3 className="font-medium text-gray-900">English Vocabulary</h3>
        </div>
        <button
          onClick={() => refresh(true)}
          className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          title="Refresh vocabulary"
          disabled={loading}
        >
          {loading ? <span className="text-sm text-gray-500">…</span> : <span className="text-lg">🔄</span>}
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
            <span className="ml-2 text-gray-600">Memuat vocabulary...</span>
          </div>
        ) : state ? (
          <>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-2xl font-bold text-indigo-900">{state.word}</div>
                {state.phonetic && <div className="text-sm text-gray-500 italic">{state.phonetic}</div>}
                <button
                  onClick={() => speak(state.word)}
                  className="text-xs rounded border border-gray-200 px-2 py-1 hover:bg-white/60"
                  title="Pronounce"
                >
                  🔊
                </button>
              </div>
              <div className="text-gray-700 font-medium">
                <span className="text-gray-600">Arti (ID): </span>
                {state.meaningId}
              </div>
              {state.meaningEn && (
                <div className="text-gray-500 text-sm mt-1">
                  <span className="font-medium">Definition (EN): </span>
                  {state.meaningEn}
                </div>
              )}
            </div>

            <div className="bg-white/60 rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-1">Contoh kalimat:</div>
              <div className="text-gray-800 italic">"{state.example}"</div>
            </div>

            <div className="text-xs text-gray-500">
              Terakhir diperbarui: {new Date(state.updatedAt).toLocaleTimeString('id-ID')}
              {minutesLeft !== null && <> · Auto refresh ~{minutesLeft} mnt</>}
              <div className="text-[10px] text-gray-400 mt-1">Sumber: DictionaryAPI.dev + MyMemory</div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">Gagal memuat vocabulary. Coba refresh.</div>
        )}
      </div>
    </div>
  )
}

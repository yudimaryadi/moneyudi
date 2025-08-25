'use client'

import { useEffect, useState } from 'react'
import { showToast } from './Toast'

interface VocabData {
  word: string
  meaning: string
  example: string
  phonetic?: string
}

// Template kalimat yang lebih variatif
const exampleTemplates = [
  "I find {word} quite fascinating in many ways.",
  "The concept of {word} has always intrigued me.",
  "Nothing beats the feeling of being {word}.",
  "Her approach was remarkably {word} and effective.",
  "We witnessed something truly {word} yesterday.",
  "The {word} nature of this project impressed everyone.",
  "He spoke with such {word} that moved the audience.",
  "The garden looked absolutely {word} in spring.",
  "Their {word} performance earned a standing ovation.",
  "What makes this place {word} is its rich history."
]

// Fungsi untuk membuat contoh kalimat yang variatif
const createVariedExample = (word: string, originalExample?: string): string => {
  if (originalExample && !originalExample.toLowerCase().includes('this is a')) {
    return originalExample
  }
  
  const template = exampleTemplates[Math.floor(Math.random() * exampleTemplates.length)]
  return template.replace('{word}', word.toLowerCase())
}

// Simple translation dictionary untuk kata-kata umum
const translationDict: Record<string, string> = {
  'amazing': 'menakjubkan', 'beautiful': 'indah', 'creative': 'kreatif', 'elegant': 'elegan',
  'fantastic': 'fantastis', 'incredible': 'luar biasa', 'wonderful': 'menakjubkan', 'brilliant': 'cemerlang',
  'charming': 'menawan', 'delightful': 'menyenangkan', 'extraordinary': 'luar biasa', 'graceful': 'anggun',
  'inspiring': 'menginspirasi', 'magnificent': 'megah', 'outstanding': 'luar biasa', 'remarkable': 'luar biasa',
  'stunning': 'memukau', 'unique': 'unik', 'vibrant': 'bersemangat', 'wisdom': 'kebijaksanaan'
}

// Fungsi translate sederhana
const translateToIndonesian = async (text: string): Promise<string> => {
  // Cek apakah ada terjemahan langsung untuk kata tunggal
  const lowerText = text.toLowerCase().trim()
  if (translationDict[lowerText]) {
    return translationDict[lowerText]
  }
  
  // Coba cari kata kunci dalam definisi
  for (const [eng, ind] of Object.entries(translationDict)) {
    if (lowerText.includes(eng)) {
      return `${ind} (${text})`
    }
  }
  
  // Fallback: return original text
  return text
}

export function VocabCard() {
  const [currentVocab, setCurrentVocab] = useState<VocabData | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [loading, setLoading] = useState(true)

  const fetchRandomWord = async (): Promise<string> => {
    try {
      // Menggunakan API untuk mendapatkan kata random
      const response = await fetch('https://api.wordnik.com/v4/words.json/randomWord?hasDictionaryDef=true&minCorpusCount=1000&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=4&maxLength=12&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5')
      
      if (response.ok) {
        const data = await response.json()
        return data.word
      }
    } catch (error) {
      console.log('Random word API failed, using fallback')
    }
    
    // Fallback words jika API gagal
    const fallbackWords = ['amazing', 'beautiful', 'creative', 'elegant', 'fantastic', 'incredible', 'wonderful', 'brilliant', 'charming', 'delightful']
    return fallbackWords[Math.floor(Math.random() * fallbackWords.length)]
  }

  const fetchVocabFromAPI = async (): Promise<VocabData | null> => {
    try {
      const randomWord = await fetchRandomWord()
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${randomWord}`)
      
      if (!response.ok) throw new Error('Dictionary API request failed')
      
      const data = await response.json()
      const entry = data[0]
      
      if (!entry) throw new Error('No data found')
      
      const englishMeaning = entry.meanings?.[0]?.definitions?.[0]?.definition || 'Definition not available'
      const originalExample = entry.meanings?.[0]?.definitions?.[0]?.example
      const phonetic = entry.phonetic || entry.phonetics?.[0]?.text || ''
      
      // Translate meaning to Indonesian
      const indonesianMeaning = await translateToIndonesian(englishMeaning)
      
      // Create varied example sentence
      const example = createVariedExample(entry.word, originalExample)
      
      return {
        word: entry.word,
        meaning: indonesianMeaning,
        example: example,
        phonetic: phonetic
      }
    } catch (error) {
      console.error('Error fetching vocabulary:', error)
      return null
    }
  }

  const getRandomVocab = async (): Promise<VocabData> => {
    const apiVocab = await fetchVocabFromAPI()
    
    if (apiVocab) {
      return apiVocab
    }
    
    // Fallback ke data lokal jika API gagal
    const fallbackVocabs: VocabData[] = [
      { word: "Serendipity", meaning: "Keberuntungan yang tidak terduga", example: "Finding this book was pure serendipity." },
      { word: "Resilience", meaning: "Ketahanan, kemampuan pulih", example: "Her resilience helped her overcome difficulties." },
      { word: "Eloquent", meaning: "Fasih berbicara", example: "The speaker was eloquent and persuasive." }
    ]
    const randomIndex = Math.floor(Math.random() * fallbackVocabs.length)
    return fallbackVocabs[randomIndex]
  }

  const refreshVocab = async () => {
    try {
      setLoading(true)
      const newVocab = await getRandomVocab()
      setCurrentVocab(newVocab)
      setLastUpdate(new Date())
      showToast('Vocabulary baru telah dimuat!', 'success')
    } catch (error) {
      showToast('Gagal memuat vocabulary baru', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Initial load
    const loadInitialVocab = async () => {
      try {
        const vocab = await getRandomVocab()
        setCurrentVocab(vocab)
      } catch (error) {
        console.error('Failed to load initial vocab:', error)
      } finally {
        setLoading(false)
      }
    }
    loadInitialVocab()

    // Auto refresh every hour
    const interval = setInterval(() => {
      refreshVocab()
    }, 60 * 60 * 1000) // 1 hour

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-2xl border border-gray-100 shadow-sm p-4 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">📚</span>
          <h3 className="font-medium text-gray-900">English Vocabulary</h3>
        </div>
        <button
          onClick={refreshVocab}
          className="p-2 rounded-lg hover:bg-white/50 transition-colors"
          title="Refresh vocabulary"
        >
          <span className="text-lg">🔄</span>
        </button>
      </div>
      
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Memuat vocabulary...</span>
          </div>
        ) : currentVocab ? (
          <>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="text-2xl font-bold text-indigo-900">
                  {currentVocab.word}
                </div>
                {currentVocab.phonetic && (
                  <div className="text-sm text-gray-500 italic">
                    {currentVocab.phonetic}
                  </div>
                )}
              </div>
              <div className="text-gray-700 font-medium">
                {currentVocab.meaning}
              </div>
            </div>
            
            <div className="bg-white/60 rounded-lg p-3">
              <div className="text-sm text-gray-600 mb-1">Contoh kalimat:</div>
              <div className="text-gray-800 italic">
                "{currentVocab.example}"
              </div>
            </div>
            
            <div className="text-xs text-gray-500">
              Terakhir diperbarui: {lastUpdate.toLocaleTimeString('id-ID')}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Gagal memuat vocabulary. Coba refresh.
          </div>
        )}
      </div>
    </div>
  )
}
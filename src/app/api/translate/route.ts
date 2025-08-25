import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Try LibreTranslate API
    const response = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: 'id',
        format: 'text'
      })
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({ translatedText: data.translatedText })
    }

    // Fallback: return original text if translation fails
    return NextResponse.json({ translatedText: text })
    
  } catch (error) {
    console.error('Translation error:', error)
    // Return original text as fallback
    const { text } = await request.json().catch(() => ({ text: 'Translation failed' }))
    return NextResponse.json({ translatedText: text })
  }
}
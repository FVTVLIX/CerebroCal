import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createOpenAISession } from './logic'

export async function POST(request: Request) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // First preferred locale from the browser's Accept-Language header, e.g. "es-MX"
  const acceptLanguage = request.headers.get('accept-language') ?? 'en'
  const locale = acceptLanguage.split(',')[0].trim()

  try {
    const token = await createOpenAISession(locale)
    return NextResponse.json({ token })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { error: 'openai_session_failed', detail: message },
      { status: 500 }
    )
  }
}

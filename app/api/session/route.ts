import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createOpenAISession } from './logic'

export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const token = await createOpenAISession()
    return NextResponse.json({ token })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { error: 'openai_session_failed', detail: message },
      { status: 500 }
    )
  }
}

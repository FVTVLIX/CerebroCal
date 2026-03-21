import { NextResponse } from 'next/server'
import { createOpenAISession } from './logic'

export async function POST() {
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

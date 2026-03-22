import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createCalendarEvent } from './logic'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { name, date, time, title, timezone } = body

  if (!name || !date || !time) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  try {
    const result = await createCalendarEvent({
      name,
      date,
      time,
      title,
      timezone,
      accessToken: session.access_token!,
    })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { success: false, error: 'insert_failed', detail: message },
      { status: 500 }
    )
  }
}

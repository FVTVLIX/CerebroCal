import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent } from './logic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, date, time, title, timezone } = body

  if (!name || !date || !time) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  try {
    const result = await createCalendarEvent({ name, date, time, title, timezone })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'

    if (message === 'calendar_not_configured') {
      return NextResponse.json(
        {
          error: 'calendar_not_configured',
          setup: 'Set GOOGLE_SERVICE_ACCOUNT_JSON in env vars. See SETUP.md.',
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'insert_failed', detail: message },
      { status: 500 }
    )
  }
}

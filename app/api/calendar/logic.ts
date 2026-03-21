import { google } from 'googleapis'
import { fromZonedTime } from 'date-fns-tz'

interface CalendarEventInput {
  name: string
  date: string        // YYYY-MM-DD
  time: string        // HH:MM 24h
  title?: string
  timezone?: string   // IANA, e.g. "America/Chicago"
}

interface CalendarEventResult {
  success: true
  eventId: string
  htmlLink: string
}

export async function createCalendarEvent(
  input: CalendarEventInput
): Promise<CalendarEventResult> {
  const { name, date, time, title, timezone = 'UTC' } = input

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('calendar_not_configured')
  }

  let key: { client_email: string; private_key: string }
  try {
    key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  } catch {
    throw new Error('calendar_not_configured: invalid service account JSON')
  }

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })

  // Pass bare local-time string — do NOT wrap in new Date() first
  // (that would parse as UTC on Vercel, compounding the offset)
  const startUtc = fromZonedTime(`${date}T${time}:00`, timezone)
  const endUtc = new Date(startUtc.getTime() + 30 * 60 * 1000)

  const calendar = google.calendar({ version: 'v3', auth })
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'

  const res = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: title ?? `Meeting with ${name}`,
      description: `Scheduled via Cerebrocal for ${name}`,
      start: { dateTime: startUtc.toISOString(), timeZone: timezone },
      end: { dateTime: endUtc.toISOString(), timeZone: timezone },
    },
  })

  return {
    success: true,
    eventId: res.data.id!,
    htmlLink: res.data.htmlLink!,
  }
}

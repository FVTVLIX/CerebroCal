import { google } from 'googleapis'
import { fromZonedTime } from 'date-fns-tz'

interface CalendarEventInput {
  name: string
  date: string        // YYYY-MM-DD
  time: string        // HH:MM 24h
  title?: string
  timezone?: string   // IANA, e.g. "America/Chicago"
  accessToken: string
}

interface CalendarEventResult {
  success: true
  eventId: string
  htmlLink: string
}

export async function createCalendarEvent(
  input: CalendarEventInput
): Promise<CalendarEventResult> {
  const { name, date, time, title, timezone = 'UTC', accessToken } = input

  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oAuth2Client.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })

  // Pass bare local-time string — do NOT wrap in new Date() first
  // (that would parse as UTC on Vercel, compounding the offset)
  const startUtc = fromZonedTime(`${date}T${time}:00`, timezone)
  const endUtc = new Date(startUtc.getTime() + 30 * 60 * 1000)

  const res = await calendar.events.insert({
    calendarId: 'primary',
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

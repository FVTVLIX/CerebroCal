/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({ auth: mockAuth }))

const mockCreateCalendarEvent = jest.fn()
jest.mock('@/app/api/calendar/logic', () => ({
  createCalendarEvent: mockCreateCalendarEvent,
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/calendar', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  mockAuth.mockReset()
  mockCreateCalendarEvent.mockReset()
})

describe('POST /api/calendar', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const { POST } = await import('@/app/api/calendar/route')
    const res = await POST(makeRequest({ name: 'Alice', date: '2026-06-15', time: '14:00' }))
    const json = await res.json()
    expect(res.status).toBe(401)
    expect(json.error).toBe('unauthorized')
  })

  it('passes accessToken from session to createCalendarEvent', async () => {
    mockAuth.mockResolvedValueOnce({ access_token: 'ya29.test-token' })
    mockCreateCalendarEvent.mockResolvedValueOnce({
      success: true,
      eventId: 'evt_123',
      htmlLink: 'https://calendar.google.com/evt_123',
    })

    const { POST } = await import('@/app/api/calendar/route')
    const res = await POST(makeRequest({ name: 'Alice', date: '2026-06-15', time: '14:00' }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(mockCreateCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'ya29.test-token' })
    )
  })

  it('returns 400 when required fields are missing', async () => {
    mockAuth.mockResolvedValueOnce({ access_token: 'ya29.test-token' })
    const { POST } = await import('@/app/api/calendar/route')
    const res = await POST(makeRequest({ name: 'Alice' }))
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toBe('missing_fields')
  })
})

// @jest-environment node
// Mock googleapis before importing logic
jest.mock('googleapis', () => {
  const mockInsert = jest.fn()
  const mockSetCredentials = jest.fn()
  const mockOAuth2Instance = { setCredentials: mockSetCredentials }
  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => mockOAuth2Instance),
      },
      calendar: jest.fn().mockReturnValue({
        events: { insert: mockInsert },
      }),
    },
    __mockInsert: mockInsert,
    __mockSetCredentials: mockSetCredentials,
  }
})

const { __mockInsert, __mockSetCredentials } = jest.requireMock('googleapis') as {
  __mockInsert: jest.Mock
  __mockSetCredentials: jest.Mock
}

beforeEach(() => {
  __mockInsert.mockReset()
  __mockSetCredentials.mockReset()
  process.env.GOOGLE_CLIENT_ID = 'test-client-id'
  process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
})

afterEach(() => {
  delete process.env.GOOGLE_CLIENT_ID
  delete process.env.GOOGLE_CLIENT_SECRET
})

describe('createCalendarEvent', () => {
  it('sets credentials with the provided accessToken', async () => {
    __mockInsert.mockResolvedValueOnce({
      data: { id: 'evt_123', htmlLink: 'https://calendar.google.com/evt_123' },
    })

    const { createCalendarEvent } = await import('@/app/api/calendar/logic')
    await createCalendarEvent({
      name: 'Alice',
      date: '2026-06-15',
      time: '14:00',
      timezone: 'America/Chicago',
      accessToken: 'ya29.test-token',
    })

    expect(__mockSetCredentials).toHaveBeenCalledWith({ access_token: 'ya29.test-token' })
  })

  it('inserts a 30-minute event and returns success', async () => {
    __mockInsert.mockResolvedValueOnce({
      data: { id: 'evt_123', htmlLink: 'https://calendar.google.com/evt_123' },
    })

    const { createCalendarEvent } = await import('@/app/api/calendar/logic')
    const result = await createCalendarEvent({
      name: 'Alice',
      date: '2026-06-15',
      time: '14:00',
      timezone: 'America/Chicago',
      accessToken: 'ya29.test-token',
    })

    expect(result.success).toBe(true)
    expect(result.eventId).toBe('evt_123')
    expect(__mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        calendarId: 'primary',
        requestBody: expect.objectContaining({
          summary: 'Meeting with Alice',
          description: 'Scheduled via Cerebrocal for Alice',
        }),
      })
    )
  })

  it('uses the provided title as summary', async () => {
    __mockInsert.mockResolvedValueOnce({
      data: { id: 'evt_456', htmlLink: 'https://calendar.google.com/evt_456' },
    })

    const { createCalendarEvent } = await import('@/app/api/calendar/logic')
    await createCalendarEvent({
      name: 'Bob',
      date: '2026-06-15',
      time: '10:00',
      title: 'Product Review',
      timezone: 'UTC',
      accessToken: 'ya29.test-token',
    })

    expect(__mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({ summary: 'Product Review' }),
      })
    )
  })
})

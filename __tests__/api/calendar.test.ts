// Mock googleapis before importing logic
jest.mock('googleapis', () => {
  const mockInsert = jest.fn()
  return {
    google: {
      auth: {
        JWT: jest.fn().mockImplementation(() => ({ authorize: jest.fn() })),
      },
      calendar: jest.fn().mockReturnValue({
        events: { insert: mockInsert },
      }),
    },
    __mockInsert: mockInsert,
  }
})

const { __mockInsert } = jest.requireMock('googleapis') as {
  __mockInsert: jest.Mock
}

beforeEach(() => {
  __mockInsert.mockReset()
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    type: 'service_account',
    client_email: 'test@test.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
  })
  process.env.GOOGLE_CALENDAR_ID = 'primary'
})

afterEach(() => {
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  delete process.env.GOOGLE_CALENDAR_ID
})

describe('createCalendarEvent', () => {
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
    })

    expect(result.success).toBe(true)
    expect(result.eventId).toBe('evt_123')
    expect(__mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
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
    })

    expect(__mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({ summary: 'Product Review' }),
      })
    )
  })

  it('throws calendar_not_configured when env var is missing', async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    const { createCalendarEvent } = await import('@/app/api/calendar/logic')
    await expect(
      createCalendarEvent({ name: 'X', date: '2026-01-01', time: '09:00' })
    ).rejects.toThrow('calendar_not_configured')
  })
})

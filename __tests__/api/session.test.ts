// We test the business logic function, not the Route Handler directly.
// The Route Handler is a thin wrapper — if the logic is correct, the route is correct.

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  process.env.OPENAI_API_KEY = 'sk-test-key'
})

afterEach(() => {
  delete process.env.OPENAI_API_KEY
})

describe('createOpenAISession', () => {
  it('returns the ephemeral token from client_secret.value', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ client_secret: { value: 'eph_abc123' } }),
    })

    const { createOpenAISession } = await import('@/app/api/session/logic')
    const token = await createOpenAISession()

    expect(token).toBe('eph_abc123')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/realtime/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test-key',
        }),
      })
    )
  })

  it('throws when OpenAI returns a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'invalid key' } }),
    })

    const { createOpenAISession } = await import('@/app/api/session/logic')
    await expect(createOpenAISession()).rejects.toThrow('openai_session_failed')
  })
})

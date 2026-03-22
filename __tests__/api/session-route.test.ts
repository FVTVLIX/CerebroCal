/**
 * @jest-environment node
 */

const mockAuth = jest.fn()
jest.mock('@/auth', () => ({ auth: mockAuth }))

const mockCreateOpenAISession = jest.fn()
jest.mock('@/app/api/session/logic', () => ({
  createOpenAISession: mockCreateOpenAISession,
}))

beforeEach(() => {
  mockAuth.mockReset()
  mockCreateOpenAISession.mockReset()
})

describe('POST /api/session', () => {
  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValueOnce(null)
    const { POST } = await import('@/app/api/session/route')
    const res = await POST()
    const json = await res.json()
    expect(res.status).toBe(401)
    expect(json.error).toBe('unauthorized')
  })

  it('returns token when authenticated', async () => {
    mockAuth.mockResolvedValueOnce({ user: { name: 'Test' } })
    mockCreateOpenAISession.mockResolvedValueOnce('eph_abc')
    const { POST } = await import('@/app/api/session/route')
    const res = await POST()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.token).toBe('eph_abc')
  })
})

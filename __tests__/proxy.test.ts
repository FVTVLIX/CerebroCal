import { NextResponse } from 'next/server'

// auth wraps the handler — mock it to call handler directly
jest.mock('@/auth', () => ({
  auth: (handler: Function) => handler,
}))

// Mock next/server to avoid Web API dependency in jsdom environment
jest.mock('next/server', () => {
  return {
    NextResponse: {
      redirect: jest.fn((url) => ({ type: 'redirect', url })),
      next: jest.fn(() => ({ type: 'next' })),
    },
  }
})

const mockRedirect = NextResponse.redirect as jest.Mock
const mockNext = NextResponse.next as jest.Mock

function makeReq(pathname: string, auth: object | null) {
  return {
    auth,
    nextUrl: { pathname },
    url: `http://localhost${pathname}`,
  }
}

beforeEach(() => {
  mockRedirect.mockClear()
  mockNext.mockClear()
})

describe('proxy', () => {
  it('redirects authenticated user from / to /chat', async () => {
    const proxy = (await import('@/proxy')).default
    await proxy(makeReq('/', { user: { name: 'Test' } }) as any)
    expect(mockRedirect).toHaveBeenCalledWith(new URL('/chat', 'http://localhost/'))
  })

  it('redirects unauthenticated user from /chat to /', async () => {
    const proxy = (await import('@/proxy')).default
    await proxy(makeReq('/chat', null) as any)
    expect(mockRedirect).toHaveBeenCalledWith(new URL('/', 'http://localhost/chat'))
  })

  it('redirects token-errored user from /chat to /', async () => {
    const proxy = (await import('@/proxy')).default
    await proxy(makeReq('/chat', { error: 'RefreshTokenError' }) as any)
    expect(mockRedirect).toHaveBeenCalledWith(new URL('/', 'http://localhost/chat'))
  })

  it('allows unauthenticated user to reach /', async () => {
    const proxy = (await import('@/proxy')).default
    await proxy(makeReq('/', null) as any)
    expect(mockNext).toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('passes /api/auth/* through without redirect', async () => {
    const proxy = (await import('@/proxy')).default
    await proxy(makeReq('/api/auth/callback/google', null) as any)
    expect(mockNext).toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })

  it('passes /signin through without redirect', async () => {
    const proxy = (await import('@/proxy')).default
    await proxy(makeReq('/signin', null) as any)
    expect(mockNext).toHaveBeenCalled()
    expect(mockRedirect).not.toHaveBeenCalled()
  })
})

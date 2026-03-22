# Auth + Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Google OAuth authentication (NextAuth v5), replace service account calendar auth with user OAuth tokens, and restructure routes so `/` is a public landing page and `/chat` is the protected chat interface.

**Architecture:** NextAuth v5 handles Google sign-in with `calendar.events` scope. Access and refresh tokens are stored in a signed JWT session cookie. The calendar API route reads the user's `access_token` from session and passes it to the calendar logic, replacing the service account approach entirely. A new public landing page lives at `/`, the existing chat interface moves to `/chat`, and `proxy.ts` (Next.js 16's name for middleware) routes traffic based on auth state.

**Tech Stack:** NextAuth v5 (`next-auth@beta`), `googleapis`, `next-auth/react` (SessionProvider), React Testing Library, Jest

**Specs:**
- `docs/superpowers/specs/2026-03-21-authentication-design.md`
- `docs/superpowers/specs/2026-03-22-landing-page-design.md`

> **AGENTS.md reminder:** Before writing any code, read the relevant guide in `node_modules/next/dist/docs/`. The `proxy.ts` guide is at `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `auth.ts` | Create | NextAuth v5 config — Google provider, calendar scope, JWT token storage + refresh |
| `types/next-auth.d.ts` | Create | TypeScript augmentation — `access_token` and `error` on Session and JWT |
| `app/api/auth/[...nextauth]/route.ts` | Create | NextAuth catch-all handler (GET + POST) |
| `proxy.ts` | Create | Next.js 16 Proxy — protects `/chat`, redirects authed users away from `/` |
| `app/providers.tsx` | Create | `'use client'` wrapper for SessionProvider |
| `app/layout.tsx` | Modify | Wrap children with `<Providers>` |
| `app/signin/page.tsx` | Create | Sign-in error fallback page (server component) |
| `app/signin/SignInButton.tsx` | Create | `'use client'` — calls `signIn('google', { redirectTo: '/chat' })` |
| `app/api/session/route.ts` | Modify | Add `auth()` guard — 401 if no session |
| `app/api/calendar/logic.ts` | Modify | Replace service account JWT with user OAuth2 client using `accessToken` param |
| `app/api/calendar/route.ts` | Modify | Add `auth()` guard — pass `session.access_token` to logic |
| `app/chat/page.tsx` | Create | Verbatim move of current `app/page.tsx` content |
| `app/page.tsx` | Replace | Landing page — server component, four sections |
| `components/landing/HeroSignInButton.tsx` | Create | `'use client'` — calls `signIn('google', { redirectTo: '/chat' })` |
| `__tests__/api/calendar.test.ts` | Modify | Rewrite: mock `OAuth2` + `setCredentials`, accept `accessToken` param |
| `__tests__/api/session-route.test.ts` | Create | Auth guard tests for `/api/session` route handler |
| `__tests__/api/calendar-route.test.ts` | Create | Auth guard tests for `/api/calendar` route handler |
| `__tests__/components/HeroSignInButton.test.tsx` | Create | Clicks → `signIn('google', { redirectTo: '/chat' })` |
| `__tests__/components/SignInButton.test.tsx` | Create | Clicks → `signIn('google', { redirectTo: '/chat' })` |
| `.env.example` | Modify | Remove service account vars; add `AUTH_SECRET`, `AUTH_URL`, OAuth vars |
| `SETUP.md` | Modify | Replace service account section with Google OAuth app setup |

---

## Task 1: Install next-auth@beta

**Files:**
- No file changes — package installation only

- [ ] **Step 1: Install the package**

```bash
npm install next-auth@beta
```

- [ ] **Step 2: Verify it installed**

```bash
cat package.json | grep next-auth
```

Expected: `"next-auth": "^5.x.x"` (beta version)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install next-auth@beta"
```

---

## Task 2: Create auth.ts + types/next-auth.d.ts

**Files:**
- Create: `auth.ts`
- Create: `types/next-auth.d.ts`

No unit tests for these — they are NextAuth configuration and TypeScript declarations. TypeScript compilation catches type errors.

- [ ] **Step 1: Create `auth.ts`**

```ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    }),
  ],
  pages: {
    signIn: '/signin',
  },
  callbacks: {
    async jwt({ token, account }) {
      // Initial sign-in — store tokens from the OAuth response
      if (account) {
        return {
          ...token,
          access_token: account.access_token,
          refresh_token: account.refresh_token,
          expires_at: account.expires_at,
        }
      }
      // Token still valid
      if (Date.now() < (token.expires_at as number) * 1000) {
        return token
      }
      // Token expired — refresh it
      try {
        const response = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            grant_type: 'refresh_token',
            refresh_token: token.refresh_token as string,
          }),
        })
        const tokens = await response.json()
        if (!response.ok) throw tokens
        return {
          ...token,
          access_token: tokens.access_token,
          expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
          refresh_token: tokens.refresh_token ?? token.refresh_token,
          error: undefined,
        }
      } catch {
        return { ...token, error: 'RefreshTokenError' }
      }
    },
    async session({ session, token }) {
      session.access_token = token.access_token as string
      if (token.error) session.error = token.error as string
      return session
    },
  },
})
```

- [ ] **Step 2: Create `types/next-auth.d.ts`**

```ts
import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session extends DefaultSession {
    access_token?: string
    error?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    access_token: string
    refresh_token: string
    expires_at: number
    error?: string
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `auth.ts` or `types/next-auth.d.ts`

- [ ] **Step 4: Commit**

```bash
git add auth.ts types/next-auth.d.ts
git commit -m "feat: add NextAuth v5 config with Google OAuth and calendar scope"
```

---

## Task 3: Create app/api/auth/[...nextauth]/route.ts

**Files:**
- Create: `app/api/auth/[...nextauth]/route.ts`

This is a required NextAuth catch-all handler. Without it, all `/api/auth/*` URLs return 404.

- [ ] **Step 1: Create the directory and file**

```ts
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 2: Verify it compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/api/auth/[...nextauth]/route.ts"
git commit -m "feat: add NextAuth catch-all route handler"
```

---

## Task 4: Create proxy.ts

**Files:**
- Create: `proxy.ts`
- Create: `__tests__/proxy.test.ts`

> Read `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md` before writing this file. Next.js 16 renamed Middleware to Proxy. The file must be named `proxy.ts`.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/proxy.test.ts
import { NextResponse } from 'next/server'

// auth wraps the handler — mock it to call handler directly
jest.mock('@/auth', () => ({
  auth: (handler: Function) => handler,
}))

// Mock NextResponse static methods
const mockRedirect = jest.fn((url) => ({ type: 'redirect', url }))
const mockNext = jest.fn(() => ({ type: 'next' }))
jest.spyOn(NextResponse, 'redirect').mockImplementation(mockRedirect as any)
jest.spyOn(NextResponse, 'next').mockImplementation(mockNext as any)

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/proxy.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/proxy'`

- [ ] **Step 3: Create proxy.ts**

```ts
import { auth } from './auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAuthed = !!req.auth
  const hasTokenError = req.auth?.error === 'RefreshTokenError'
  const pathname = req.nextUrl.pathname
  const isAuthRoute = pathname.startsWith('/api/auth')
  const isSignIn = pathname === '/signin'
  const isLanding = pathname === '/'
  const isChat = pathname.startsWith('/chat')

  // Redirect authenticated users away from landing page to the app
  if (isAuthed && !hasTokenError && isLanding) {
    return NextResponse.redirect(new URL('/chat', req.url))
  }

  // Protect /chat — unauthenticated or token-errored users go to landing page
  if (isChat && (!isAuthed || hasTokenError)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // All other routes pass through
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/proxy.test.ts --no-coverage
```

Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add proxy.ts __tests__/proxy.test.ts
git commit -m "feat: add Next.js 16 proxy with auth-based routing"
```

---

## Task 5: Create app/providers.tsx + update app/layout.tsx

**Files:**
- Create: `app/providers.tsx`
- Modify: `app/layout.tsx`

`SessionProvider` cannot be used directly in a Server Component. `Providers` is a `'use client'` wrapper.

- [ ] **Step 1: Create app/providers.tsx**

No tests needed — this is a thin wrapper around a library component.

```tsx
'use client'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

- [ ] **Step 2: Modify app/layout.tsx**

Current layout wraps children in `<body>`. Add `Providers` around children:

```tsx
import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
import { Providers } from './providers'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Cerebrocal',
  description: 'AI Scheduling Concierge',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${GeistSans.variable}`}>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add app/providers.tsx app/layout.tsx
git commit -m "feat: add SessionProvider wrapper and update layout"
```

---

## Task 6: Create app/signin/page.tsx + app/signin/SignInButton.tsx

**Files:**
- Create: `app/signin/SignInButton.tsx`
- Create: `app/signin/page.tsx`
- Create: `__tests__/components/SignInButton.test.tsx`

> **Spec override note:** The auth spec (`2026-03-21`) listed `redirectTo: '/'` for `SignInButton`. The landing page spec (`2026-03-22`) overrides this to `redirectTo: '/chat'` — because `/` is now the landing page and redirecting there would create a loop for already-authenticated users. The correct value is `'/chat'`.

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/SignInButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { SignInButton } from '@/app/signin/SignInButton'

const mockSignIn = jest.fn()
jest.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

beforeEach(() => mockSignIn.mockReset())

describe('SignInButton', () => {
  it('calls signIn with google and redirectTo /chat on click', () => {
    render(<SignInButton />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockSignIn).toHaveBeenCalledWith('google', { redirectTo: '/chat' })
  })

  it('displays "Continue with Google"', () => {
    render(<SignInButton />)
    expect(screen.getByRole('button')).toHaveTextContent('Continue with Google')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/components/SignInButton.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/signin/SignInButton'`

- [ ] **Step 3: Create app/signin/SignInButton.tsx**

```tsx
'use client'
import { signIn } from 'next-auth/react'

export function SignInButton() {
  return (
    <button
      onClick={() => signIn('google', { redirectTo: '/chat' })}
      className="flex items-center gap-3 px-8 py-3 rounded-full border border-white/20 bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
    >
      Continue with Google
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/components/SignInButton.test.tsx --no-coverage
```

Expected: PASS

- [ ] **Step 5: Create app/signin/page.tsx**

No separate unit test — tested implicitly via the SignInButton tests.

```tsx
import { SignInButton } from './SignInButton'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          Cerebrocal
        </h1>
        <p className="text-sm text-zinc-400">Sign in to continue</p>
        {error && (
          <p className="text-sm text-red-400">Sign-in failed — please try again.</p>
        )}
        <SignInButton />
      </div>
    </main>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add app/signin/page.tsx app/signin/SignInButton.tsx __tests__/components/SignInButton.test.tsx
git commit -m "feat: add sign-in page with Google OAuth button"
```

---

## Task 7: Add auth guard to app/api/session/route.ts

**Files:**
- Modify: `app/api/session/route.ts`
- Create: `__tests__/api/session-route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/api/session-route.test.ts
import { NextResponse } from 'next/server'

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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/api/session-route.test.ts --no-coverage
```

Expected: FAIL — the "returns 401" test fails because the current route has no auth guard and calls `createOpenAISession()` (which is mocked to return `undefined`), so it returns 200 with `{ token: undefined }` instead of 401.

- [ ] **Step 3: Update app/api/session/route.ts**

```ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createOpenAISession } from './logic'

export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const token = await createOpenAISession()
    return NextResponse.json({ token })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { error: 'openai_session_failed', detail: message },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/api/session-route.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Run all tests to verify nothing broke**

```bash
npx jest --no-coverage
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add app/api/session/route.ts __tests__/api/session-route.test.ts
git commit -m "feat: add auth guard to session route"
```

---

## Task 8: Rewrite app/api/calendar/logic.ts + tests

**Files:**
- Modify: `app/api/calendar/logic.ts`
- Modify: `__tests__/api/calendar.test.ts`

Replace service account JWT auth with user OAuth2 client using `accessToken` param. The existing calendar tests must be completely rewritten.

- [ ] **Step 1: Rewrite __tests__/api/calendar.test.ts**

```ts
// __tests__/api/calendar.test.ts
// Mock googleapis before importing logic
jest.mock('googleapis', () => {
  const mockInsert = jest.fn()
  const mockSetCredentials = jest.fn()
  return {
    google: {
      auth: {
        OAuth2: jest.fn().mockImplementation(() => ({
          setCredentials: mockSetCredentials,
        })),
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/api/calendar.test.ts --no-coverage
```

Expected: FAIL — old logic uses `JWT`, `setCredentials` never called, `accessToken` param not accepted

- [ ] **Step 3: Rewrite app/api/calendar/logic.ts**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/api/calendar.test.ts --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/api/calendar/logic.ts __tests__/api/calendar.test.ts
git commit -m "feat: replace service account auth with user OAuth2 token in calendar logic"
```

---

## Task 9: Add auth guard + accessToken to app/api/calendar/route.ts

**Files:**
- Modify: `app/api/calendar/route.ts`
- Create: `__tests__/api/calendar-route.test.ts`

> **Intentional removal:** The existing `route.ts` has a `calendar_not_configured` catch branch (503 with service account setup instructions). This branch is intentionally dropped — the new `logic.ts` no longer throws that error because it no longer checks for `GOOGLE_SERVICE_ACCOUNT_JSON`. The replacement code in Step 3 is a full file rewrite, so this dead branch is removed implicitly.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/api/calendar-route.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/api/calendar-route.test.ts --no-coverage
```

Expected: FAIL — no auth guard, accessToken not passed

- [ ] **Step 3: Update app/api/calendar/route.ts**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/api/calendar-route.test.ts --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add app/api/calendar/route.ts __tests__/api/calendar-route.test.ts
git commit -m "feat: add auth guard and user access token to calendar route"
```

---

## Task 10: Move app/page.tsx to app/chat/page.tsx

**Files:**
- Create: `app/chat/page.tsx` (verbatim copy of current `app/page.tsx`)
- Modify: `app/page.tsx` (emptied here — will be replaced in Task 12)

The existing `Home` component content moves unchanged. Only the file path changes.

- [ ] **Step 1: Create app/chat/page.tsx**

Copy the entire current `app/page.tsx` content verbatim:

```tsx
'use client'

import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AiCore } from '@/components/AiCore'
import { TranscriptPanel } from '@/components/TranscriptPanel'
import { StatusToast } from '@/components/StatusToast'
import { useWebRTC } from '@/hooks/useWebRTC'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'
import { AppError } from '@/lib/types'

export default function Home() {
  const { status, transcript, error: rtcError, remoteStream, connect, disconnect } = useWebRTC()
  const { amplitude } = useAudioAnalyzer(status === 'speaking' ? remoteStream : null)
  const [dismissedError, setDismissedError] = useState<AppError | null>(null)

  const isActive = status !== 'idle'
  const visibleError = rtcError !== dismissedError ? rtcError : null

  const handleDismiss = useCallback(() => {
    setDismissedError(rtcError)
  }, [rtcError])

  const handleSessionToggle = useCallback(() => {
    if (isActive) {
      disconnect()
    } else {
      connect()
    }
  }, [isActive, connect, disconnect])

  const statusLabel: Record<typeof status, string> = {
    idle: 'Ready',
    connecting: 'Connecting…',
    listening: 'Listening',
    speaking: 'Speaking',
    processing: 'Booking…',
  }

  return (
    <main className="flex h-screen overflow-hidden">
      {/* LEFT PANEL — AI Core */}
      <div className="w-80 shrink-0 flex flex-col items-center justify-center gap-6 border-r border-white/5 px-6">
        {/* App name */}
        <div className="text-center">
          <h1
            className="text-2xl font-bold tracking-tight text-white"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            Cerebrocal
          </h1>
          <p className="text-xs text-zinc-500 mt-1">AI Scheduling Concierge</p>
        </div>

        {/* Orb */}
        <AiCore status={status} amplitude={amplitude} />

        {/* Status label */}
        <AnimatePresence mode="wait">
          <motion.p
            key={status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className={`text-xs font-medium tracking-widest uppercase ${
              status === 'listening'
                ? 'text-cyan-400'
                : status === 'speaking'
                ? 'text-purple-400'
                : status === 'processing'
                ? 'text-green-400'
                : status === 'connecting'
                ? 'text-amber-400'
                : 'text-zinc-600'
            }`}
          >
            {statusLabel[status]}
          </motion.p>
        </AnimatePresence>

        {/* Session button */}
        <motion.button
          onClick={handleSessionToggle}
          disabled={status === 'connecting' || status === 'processing'}
          whileTap={{ scale: 0.96 }}
          className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all
            ${isActive
              ? 'bg-white/5 border border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-300'
              : 'bg-white/8 border border-white/12 text-white hover:bg-white/12 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)]'
            }
            disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          {isActive ? 'End Session' : 'Initialize Session'}
        </motion.button>
      </div>

      {/* RIGHT PANEL — Transcript */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5">
          <span className="text-xs text-zinc-600 uppercase tracking-widest">Conversation</span>
          {isActive && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="ml-auto flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-xs text-zinc-500">Live</span>
            </motion.span>
          )}
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-hidden">
          <TranscriptPanel messages={transcript} isActive={isActive} />
        </div>
      </div>

      {/* Toast */}
      <StatusToast error={visibleError} onDismiss={handleDismiss} />
    </main>
  )
}
```

- [ ] **Step 2: Run existing tests to verify nothing broke**

```bash
npx jest --no-coverage
```

Expected: all pass (chat page has no direct tests — components it uses are tested separately)

- [ ] **Step 3: Commit (before deleting page.tsx)**

```bash
git add app/chat/page.tsx
git commit -m "feat: add /chat route — chat interface moved from /"
```

---

## Task 11: Create components/landing/HeroSignInButton.tsx

**Files:**
- Create: `components/landing/HeroSignInButton.tsx`
- Create: `__tests__/components/HeroSignInButton.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/HeroSignInButton.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { HeroSignInButton } from '@/components/landing/HeroSignInButton'

const mockSignIn = jest.fn()
jest.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

beforeEach(() => mockSignIn.mockReset())

describe('HeroSignInButton', () => {
  it('calls signIn with google and redirectTo /chat on click', () => {
    render(<HeroSignInButton />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockSignIn).toHaveBeenCalledWith('google', { redirectTo: '/chat' })
  })

  it('displays "Sign in with Google"', () => {
    render(<HeroSignInButton />)
    expect(screen.getByRole('button')).toHaveTextContent('Sign in with Google')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/components/HeroSignInButton.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/landing/HeroSignInButton'`

- [ ] **Step 3: Create components/landing/HeroSignInButton.tsx**

```tsx
'use client'
import { signIn } from 'next-auth/react'

export function HeroSignInButton() {
  return (
    <button
      onClick={() => signIn('google', { redirectTo: '/chat' })}
      className="flex items-center gap-3 px-8 py-3 rounded-full bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 transition-colors shadow-[0_0_30px_rgba(34,211,238,0.2)]"
    >
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
      </svg>
      Sign in with Google
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/components/HeroSignInButton.test.tsx --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/landing/HeroSignInButton.tsx __tests__/components/HeroSignInButton.test.tsx
git commit -m "feat: add HeroSignInButton for landing page"
```

---

## Task 12: Replace app/page.tsx with landing page

**Files:**
- Modify: `app/page.tsx` (full replacement — server component landing page)
- Create: `__tests__/components/LandingPage.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// __tests__/components/LandingPage.test.tsx
import { render, screen } from '@testing-library/react'
import LandingPage from '@/app/page'

// HeroSignInButton is a client component — mock it
jest.mock('@/components/landing/HeroSignInButton', () => ({
  HeroSignInButton: () => <button>Sign in with Google</button>,
}))

describe('LandingPage', () => {
  it('renders the app name', () => {
    render(<LandingPage />)
    expect(screen.getByText('Cerebrocal')).toBeInTheDocument()
  })

  it('renders the tagline', () => {
    render(<LandingPage />)
    expect(screen.getByText('Your AI scheduling concierge')).toBeInTheDocument()
  })

  it('renders the description section heading', () => {
    render(<LandingPage />)
    expect(screen.getByText('What is Cerebrocal?')).toBeInTheDocument()
  })

  it('renders all four use case cards', () => {
    render(<LandingPage />)
    expect(screen.getByText('Schedule a meeting')).toBeInTheDocument()
    expect(screen.getByText('Find a free slot')).toBeInTheDocument()
    expect(screen.getByText('Add full details')).toBeInTheDocument()
    expect(screen.getByText('Confirm instantly')).toBeInTheDocument()
  })

  it('renders the footer copyright', () => {
    render(<LandingPage />)
    expect(screen.getByText('© 2026 Cerebrocal')).toBeInTheDocument()
  })

  it('renders the sign in button', () => {
    render(<LandingPage />)
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/components/LandingPage.test.tsx --no-coverage
```

Expected: FAIL — `app/page.tsx` is still the old client component with WebRTC hooks

- [ ] **Step 3: Replace app/page.tsx with landing page**

```tsx
import { HeroSignInButton } from '@/components/landing/HeroSignInButton'

const USE_CASES = [
  {
    icon: '🗓',
    title: 'Schedule a meeting',
    description: 'Tell the AI who, when, and why — done.',
  },
  {
    icon: '🔍',
    title: 'Find a free slot',
    description: "Just ask and it'll suggest the next available time.",
  },
  {
    icon: '📋',
    title: 'Add full details',
    description: 'Title, time, attendee — all captured by voice.',
  },
  {
    icon: '✅',
    title: 'Confirm instantly',
    description: "Hear confirmation the moment it's booked.",
  },
]

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 min-h-screen gap-6 px-6 text-center">
        <h1
          className="text-5xl font-bold text-white"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          Cerebrocal
        </h1>
        <p className="text-sm text-zinc-400">Your AI scheduling concierge</p>
        <p className="text-sm text-zinc-500 max-w-sm">
          Speak naturally. Book instantly. No typing required.
        </p>
        <HeroSignInButton />
      </section>

      {/* Description */}
      <section className="flex flex-col items-center gap-4 px-6 py-16 border-t border-white/5">
        <div className="max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-white mb-4">What is Cerebrocal?</h2>
          <p className="text-zinc-400 leading-relaxed">
            Cerebrocal is a real-time voice assistant that books Google Calendar events through
            natural conversation. Just say who you want to meet, when, and what it&apos;s about —
            the AI handles the rest, live in your calendar.
          </p>
        </div>
      </section>

      {/* Use Cases */}
      <section className="flex flex-col items-center gap-8 px-6 py-16 border-t border-white/5">
        <h2 className="text-xl font-semibold text-white">What you can do</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
          {USE_CASES.map(({ icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col gap-2 p-6 rounded-2xl bg-white/5 border border-white/10"
            >
              <span className="text-2xl">{icon}</span>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="text-xs text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center px-6 py-4 border-t border-white/5">
        <span className="text-xs text-zinc-600">© 2026 Cerebrocal</span>
      </footer>
    </main>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest __tests__/components/LandingPage.test.tsx --no-coverage
```

Expected: PASS (6 tests)

- [ ] **Step 5: Run all tests**

```bash
npx jest --no-coverage
```

Expected: all pass

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx __tests__/components/LandingPage.test.tsx
git commit -m "feat: add public landing page at / with hero, description, use cases, and footer"
```

---

## Task 13: Update .env.example + SETUP.md

**Files:**
- Modify: `.env.example`
- Modify: `SETUP.md` (if exists)

Remove service account variables. Document the new OAuth variables.

- [ ] **Step 1: Replace .env.example**

```bash
# .env.example — copy to .env.local and fill in values

# ─── OpenAI ───────────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ─── NextAuth ─────────────────────────────────────────────────────────────────
# Generate with: openssl rand -base64 32
AUTH_SECRET=your-secret-here

# Full URL of this deployment (used for OAuth callback construction)
# Local dev: http://localhost:3000
# Production: https://your-domain.vercel.app
AUTH_URL=http://localhost:3000

# ─── Google OAuth ─────────────────────────────────────────────────────────────
# One OAuth app — used for both sign-in AND Google Calendar access.
# See SETUP.md for how to create this in Google Cloud Console.
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

- [ ] **Step 2: Update SETUP.md Google section**

Find the Google Calendar / service account section in SETUP.md and replace it with:

```markdown
## Google OAuth Setup

One OAuth app handles both sign-in and Google Calendar access — no service account needed.

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create a new **OAuth 2.0 Client ID** — Application type: **Web application**
3. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://your-domain.vercel.app/api/auth/callback/google` (production)
4. Enable the **Google Calendar API**: APIs & Services → Library → search "Google Calendar API" → Enable
5. Copy **Client ID** and **Client Secret** into `.env.local`
6. Generate `AUTH_SECRET`: `openssl rand -base64 32`

The app requests `calendar.events` scope at sign-in. Users grant access once — no additional setup required.
```

- [ ] **Step 3: Verify TypeScript still compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Run all tests one final time**

```bash
npx jest --no-coverage
```

Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add .env.example SETUP.md
git commit -m "docs: update env vars and setup guide for Google OAuth (remove service account)"
```

---

## Done

All tasks complete. Run full test suite:

```bash
npx jest --no-coverage
```

Then invoke `superpowers:finishing-a-development-branch` to merge or create a PR.

# Authentication & Calendar OAuth Design Spec

**Date:** 2026-03-21
**Feature:** Google OAuth sign-in with automatic Google Calendar access
**Status:** Approved for implementation

---

## Goal

Users sign in with their Google account once. During that sign-in, they grant Google Calendar access. The app can then immediately create events on their personal calendar — no service account, no setup steps, no environment variables beyond the OAuth app credentials.

Replacing: the service account approach (`GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CALENDAR_ID`) is removed entirely. `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` serve double duty — they authenticate the user AND authorize calendar access.

---

## Approach

NextAuth.js v5 (Auth.js) with Google-only OAuth. The Google provider requests the `calendar.events` scope in addition to the standard profile scopes. NextAuth stores the user's `access_token` and `refresh_token` in the signed JWT session cookie. The calendar API route retrieves the access token from the session and uses it with the Google Calendar API directly — no service account involved.

Token refresh is handled transparently in the NextAuth JWT callback: if the access token has expired, it is refreshed using the stored refresh token before the session is returned to any caller. If refresh fails, the session is marked with an error and the middleware redirects the user to re-authenticate.

**Package installation required:** `npm install next-auth@beta`

---

## Architecture

### New / Modified Files

| File | Action | Responsibility |
|------|--------|---------------|
| `auth.ts` | Create | NextAuth v5 config — Google-only, calendar scope, JWT token storage + refresh |
| `types/next-auth.d.ts` | Create | TypeScript session/JWT type augmentation for `access_token` and `error` fields |
| `app/api/auth/[...nextauth]/route.ts` | Create | NextAuth route handler — exports `GET` and `POST` from `handlers` |
| `proxy.ts` | Create | Next.js 16 Proxy (formerly Middleware) — redirects unauthenticated or token-errored requests to `/signin` |
| `app/providers.tsx` | Create | `'use client'` wrapper — renders `SessionProvider` for client session access |
| `app/signin/page.tsx` | Create | Async server component sign-in page — single "Continue with Google" button |
| `app/signin/SignInButton.tsx` | Create | `'use client'` — calls `signIn('google', { redirectTo: '/' })` |
| `app/layout.tsx` | Modify | Import and render `Providers` wrapper around children |
| `app/page.tsx` | Modify | Add `SignOutButton` client component to right panel header |
| `app/api/session/route.ts` | Modify | Add `auth()` guard — return 401 if no session |
| `app/api/calendar/route.ts` | Modify | Add `auth()` guard — pass `access_token` to logic |
| `app/api/calendar/logic.ts` | Modify | Replace service account auth with user OAuth2 client using `access_token` |
| `.env.example` | Modify | Remove service account vars; document OAuth vars; add `AUTH_URL` |
| `SETUP.md` | Modify | Replace service account section with simplified Google OAuth app setup |

### Removed Env Vars

`GOOGLE_SERVICE_ACCOUNT_JSON` and `GOOGLE_CALENDAR_ID` are no longer needed. Delete from `.env.example` and any `.env.local`.

### Session Strategy

- **JWT sessions** — no database. Session encoded as a signed JWT in an httpOnly cookie.
- **Tokens stored in JWT:** `access_token`, `refresh_token`, `expires_at`
- **Token refresh:** Handled in the NextAuth `jwt` callback — transparent to callers
- **CSRF protection:** NextAuth built-in double-submit cookie pattern
- **Secret:** `AUTH_SECRET` (or `NEXTAUTH_SECRET`) — app will not start if missing

---

## Components

### `auth.ts` (project root)

Google-only provider with calendar scope. `access_type: 'offline'` and `prompt: 'consent'` ensure a refresh token is always issued. The JWT callback stores tokens on first sign-in and handles refresh on subsequent calls. The session callback exposes `access_token` and `error` to server-side `auth()` callers.

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
          // Keep existing refresh_token if a new one wasn't issued
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

### `types/next-auth.d.ts` (project root)

TypeScript module augmentation so that `session.access_token` and `session.error` are typed correctly everywhere `auth()` is called.

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

### `app/api/auth/[...nextauth]/route.ts`

Required NextAuth route handler. Without this file all `/api/auth/*` URLs 404.

```ts
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

### `proxy.ts` (project root)

> **Next.js 16 note:** Middleware is now called Proxy. The file must be named `proxy.ts`. The function can be a default export or named `proxy` export. The proxy defaults to the Node.js runtime — the edge runtime config option is not available.

Redirects unauthenticated requests to `/signin`. Also redirects if the session carries a `RefreshTokenError` — forcing re-authentication when the refresh token is revoked or expired. Returns `NextResponse.next()` explicitly for all allowed requests.

```ts
import { auth } from './auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAuthed = !!req.auth
  const hasTokenError = req.auth?.error === 'RefreshTokenError'
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')
  const isSignIn = req.nextUrl.pathname === '/signin'

  if ((!isAuthed || hasTokenError) && !isAuthRoute && !isSignIn) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### `app/providers.tsx`

`'use client'` wrapper for `SessionProvider`. Required because `app/layout.tsx` is a Server Component and exports `metadata` — `SessionProvider` cannot be used directly inside a Server Component.

```tsx
'use client'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

### `app/signin/page.tsx`

Async server component. `searchParams` is a `Promise` in Next.js 15+ and must be awaited.

```ts
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  // render centered dark card with app name, SignInButton, and error message if !!error
}
```

Displays a generic "Sign-in failed — please try again" message when `error` is present. Does not expose raw error codes.

### `app/signin/SignInButton.tsx`

`'use client'` component. Single button: "Continue with Google". Calls `signIn('google', { redirectTo: '/' })`.

### `app/layout.tsx` (modified)

Import `Providers` and wrap `{children}`. Layout remains a Server Component.

### `app/page.tsx` (modified)

`page.tsx` is already `'use client'`. Add a `SignOutButton` — small client component calling `signOut({ redirectTo: '/signin' })` from `next-auth/react`. Rendered in the right panel header next to "Conversation".

### `app/api/session/route.ts` (modified)

```ts
import { auth } from '@/auth'

export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // existing logic unchanged
}
```

### `app/api/calendar/route.ts` (modified)

```ts
import { auth } from '@/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // pass session.access_token to logic
  const body = await req.json()
  const { name, date, time, title, timezone } = body
  if (!name || !date || !time) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }
  try {
    const result = await createCalendarEvent({
      name, date, time, title, timezone,
      accessToken: session.access_token,
    })
    return NextResponse.json(result)
  } catch (err) {
    // existing error handling unchanged
  }
}
```

### `app/api/calendar/logic.ts` (modified)

Replace the service account `JWT` auth with a user `OAuth2` client using the session's `access_token`. Remove the `GOOGLE_SERVICE_ACCOUNT_JSON` / `GOOGLE_CALENDAR_ID` env var references entirely.

```ts
import { google } from 'googleapis'
import { fromZonedTime } from 'date-fns-tz'

interface CalendarEventInput {
  name: string
  date: string
  time: string
  title?: string
  timezone?: string
  accessToken: string
}

export async function createCalendarEvent({
  name, date, time, title, timezone, accessToken,
}: CalendarEventInput) {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oAuth2Client.setCredentials({ access_token: accessToken })

  const calendar = google.calendar({ version: 'v3', auth: oAuth2Client })
  const startUtc = fromZonedTime(`${date}T${time}:00`, timezone ?? 'UTC')
  const endUtc = new Date(startUtc.getTime() + 30 * 60 * 1000)

  const res = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: {
      summary: title ?? `Meeting with ${name}`,
      description: `Scheduled via Cerebrocal for ${name}`,
      start: { dateTime: startUtc.toISOString(), timeZone: timezone ?? 'UTC' },
      end: { dateTime: endUtc.toISOString(), timeZone: timezone ?? 'UTC' },
    },
  })

  return {
    success: true,
    eventId: res.data.id!,
    htmlLink: res.data.htmlLink!,
  }
}
```

---

## Data Flow

### First Visit (unauthenticated)

```
GET / → middleware.ts
  → req.auth is null
  → redirect to /signin
  → user clicks "Continue with Google"
  → signIn('google') → Google consent screen (profile + calendar.events scope)
  → user approves → Google callback to /api/auth/callback/google
  → NextAuth stores access_token + refresh_token in JWT session cookie
  → redirect to /
  → middleware.ts → req.auth is valid → allow
```

### AI Books a Meeting

```
AI tool call → useWebRTC POSTs to /api/calendar
  → auth() → session valid, access_token present
  → createCalendarEvent({ ..., accessToken: session.access_token })
  → Google Calendar API creates event on user's primary calendar
  → AI verbally confirms booking
```

### Token Refresh (transparent)

```
User returns after access_token expires (1 hour)
  → any request triggers middleware → auth() called
  → JWT callback: expires_at < now → fetch oauth2.googleapis.com/token
  → new access_token stored in JWT → session returned normally
  → user never sees interruption
```

### Refresh Token Revoked

```
User revokes app access in Google Account settings
  → next auth() call → refresh fails → token.error = 'RefreshTokenError'
  → middleware detects session.error === 'RefreshTokenError'
  → redirect to /signin → user re-authenticates
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Unauthenticated visit to `/` | Middleware redirects to `/signin` |
| Unauthenticated POST to API routes | `401 { error: 'unauthorized' }` |
| OAuth error / user denies consent | Redirect to `/signin?error=OAuthCallback` → generic error shown |
| Access token expired | JWT callback refreshes transparently — user unaffected |
| Refresh token revoked | Middleware detects `RefreshTokenError` → redirect to `/signin` |
| `AUTH_SECRET` missing | App does not start |
| Calendar insert fails | `500 { error: 'insert_failed' }` — AI informs user verbally |

---

## Environment Variables

| Variable | Description |
|---|---|
| `AUTH_SECRET` | `openssl rand -base64 32` — NextAuth v5 canonical name; `NEXTAUTH_SECRET` is also accepted as an alias |
| `AUTH_URL` | Full deployment URL, e.g. `https://cerebrocal.vercel.app` (v5 canonical; `NEXTAUTH_URL` also accepted) |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID — used for both sign-in and Calendar API |
| `GOOGLE_CLIENT_SECRET` | Same |

**Removed:** `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CALENDAR_ID` — no longer needed.

---

## Google OAuth App Setup

One OAuth app, two purposes: sign-in + calendar.

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Application type: Web application
3. Authorized redirect URIs:
   - `https://<your-domain>/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google` (local dev)
4. APIs & Services → Library → Enable **Google Calendar API** for the project
5. No service account needed

**Scopes requested at sign-in:** `openid`, `email`, `profile`, `https://www.googleapis.com/auth/calendar.events`

The `calendar.events` scope allows reading and creating events on the user's primary calendar. It does not grant access to other users' calendars.

---

## Testing Strategy

- Unit tests for API route guards: mock `auth()` returning null → 401; mock with valid session → logic runs
- Unit tests for `createCalendarEvent`: mock `google.calendar` events.insert → assert correct payload
- Sign-in page renders "Continue with Google" button
- Manual: sign in with Google, start a session, ask AI to book a meeting → verify event appears in Google Calendar

---

## Security Properties

- **No admin credentials:** No service account or shared API key — each user's own OAuth token is used
- **Minimal scope:** `calendar.events` only — cannot read email, contacts, or other data
- **Token isolation:** Each user's access token is in their own signed session cookie — one user cannot access another's calendar
- **httpOnly cookies:** Session cookie inaccessible to JavaScript — immune to XSS token theft
- **CSRF protection:** NextAuth built-in
- **Token refresh:** Handled server-side — refresh token never sent to the browser
- **Revocation handled:** If user revokes app access in Google settings, next request forces re-auth

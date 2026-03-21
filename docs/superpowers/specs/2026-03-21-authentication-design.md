# Authentication Design Spec

**Date:** 2026-03-21
**Feature:** User authentication for Cerebrocal
**Status:** Approved for implementation

---

## Goal

Add secure authentication to Cerebrocal so that only signed-in users can access the app and its API routes (`/api/session`, `/api/calendar`). Any unauthenticated request — browser visit or direct API call — is rejected before any protected logic runs.

## Approach

NextAuth.js v5 (Auth.js) with Google and GitHub OAuth providers. JWT sessions stored in signed, httpOnly cookies. No database required. Next.js edge middleware enforces authentication at the routing layer; API routes add a server-side `auth()` check as defense in depth.

**Package installation required:** `npm install next-auth@beta`

---

## Architecture

### New / Modified Files

| File | Action | Responsibility |
|------|--------|---------------|
| `auth.ts` | Create | NextAuth v5 config — Google + GitHub providers, JWT strategy |
| `app/api/auth/[...nextauth]/route.ts` | Create | NextAuth route handler — exports `GET` and `POST` from `handlers` |
| `middleware.ts` | Create | Edge middleware — redirects unauthenticated requests to `/signin` |
| `app/providers.tsx` | Create | `'use client'` wrapper — renders `SessionProvider` for client session access |
| `app/signin/page.tsx` | Create | Server component sign-in page — Google + GitHub buttons, error display |
| `app/signin/SignInButtons.tsx` | Create | `'use client'` — interactive sign-in buttons calling `signIn()` |
| `app/layout.tsx` | Modify | Import and render `Providers` wrapper around children |
| `app/page.tsx` | Modify | Add `SignOutButton` client component to right panel header |
| `app/api/session/route.ts` | Modify | Add `auth()` guard — return 401 if no session |
| `app/api/calendar/route.ts` | Modify | Add `auth()` guard — return 401 if no session |
| `.env.example` | Modify | Add NextAuth env vars with documentation |
| `SETUP.md` | Modify | Add OAuth setup instructions for Google and GitHub |

### Session Strategy

- **JWT sessions** — no database. The session is encoded as a signed JWT stored in an httpOnly `__Secure-next-auth.session-token` cookie.
- **Default session duration:** 30 days (configurable via `session.maxAge` in `auth.ts`)
- **CSRF protection:** NextAuth handles this automatically via the double-submit cookie pattern.
- **Secret:** `NEXTAUTH_SECRET` — a random 32-byte base64 string used to sign session JWTs and CSRF tokens. App will not start if missing.

---

## Components

### `auth.ts` (project root)

The central NextAuth config. Exports `{ auth, handlers, signIn, signOut }`.

```ts
import NextAuth from 'next-auth'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/signin',
  },
})
```

### `middleware.ts` (project root)

Next.js edge middleware. Runs on every request. Uses NextAuth's exported `auth` as middleware directly. Protected: all routes. Public: `/signin`, `/api/auth/*`.

```ts
import { auth } from './auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAuthed = !!req.auth
  const isAuthRoute = req.nextUrl.pathname.startsWith('/api/auth')
  const isSignIn = req.nextUrl.pathname === '/signin'

  if (!isAuthed && !isAuthRoute && !isSignIn) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### `app/signin/page.tsx`

Async server component. `searchParams` is a `Promise` in Next.js 15+ and must be awaited before accessing properties. The page destructures `error` from the resolved value.

```ts
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  // render sign-in card; show generic error if !!error
}
```

Renders `SignInButtons` for client interactivity. Matches Cerebrocal's dark aesthetic — centered card with app name and two provider buttons. Displays a generic "Sign-in failed — please try again" message when `error` is present. Does not expose raw NextAuth error codes to users.

### `app/signin/SignInButtons.tsx`

`'use client'` component. Renders:
- "Continue with Google" button — calls `signIn('google', { redirectTo: '/' })`
- "Continue with GitHub" button — calls `signIn('github', { redirectTo: '/' })`

Both buttons match the existing Cerebrocal button style (rounded-full, glass border, dark background).

### `app/api/auth/[...nextauth]/route.ts` (new)

Required by NextAuth v5. The catch-all route handler that receives all OAuth callbacks, sign-in/sign-out requests, and CSRF token requests. Without this file, all `/api/auth/*` URLs 404.

```ts
import { handlers } from '@/auth'
export const { GET, POST } = handlers
```

### `app/providers.tsx` (new)

A thin `'use client'` wrapper that renders `SessionProvider` from `next-auth/react`. Required because `app/layout.tsx` is a Server Component and exports `metadata` — adding `SessionProvider` directly would force the entire layout client-side and break `metadata` exports.

```tsx
'use client'
import { SessionProvider } from 'next-auth/react'

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>
}
```

### `app/layout.tsx` (modified)

Import `Providers` and wrap `{children}` with it. No other changes — layout remains a Server Component.

### `app/page.tsx` (modified)

`page.tsx` is already `'use client'` (uses `useWebRTC`, `useAudioAnalyzer`). Add a `SignOutButton` — a small client component that calls `signOut({ redirectTo: '/signin' })` from `next-auth/react`. Rendered in the right panel header next to "Conversation", visible at all times (user is always signed in if they reach this page).

### API Route Guards

Both API routes get an `auth()` guard added at the top of their `POST` handler. Note: `/api/session/route.ts` currently takes no `req` parameter — that signature is preserved.

```ts
import { auth } from '@/auth'

// In /api/session/route.ts (no req parameter):
export async function POST() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // existing logic continues...
}

// In /api/calendar/route.ts (req: NextRequest preserved):
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  // existing logic continues...
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
  → signIn('google') → Google OAuth consent screen
  → Google callback to /api/auth/callback/google
  → NextAuth validates code → creates signed JWT session cookie
  → redirect to /
  → middleware.ts → req.auth is valid → allow
```

### API Call (authenticated)

```
POST /api/session
  → auth() → session valid
  → createOpenAISession() → return token

POST /api/calendar
  → auth() → session valid
  → createCalendarEvent() → return result
```

### API Call (unauthenticated — external attacker)

```
POST /api/calendar (no cookie)
  → auth() → null
  → return 401 { error: 'unauthorized' }
  → calendar logic never runs
```

### Sign Out

```
User clicks "Sign out"
  → signOut({ redirectTo: '/signin' })
  → session cookie cleared
  → redirect to /signin
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Unauthenticated visit to `/` | Middleware redirects to `/signin` |
| Unauthenticated POST to API routes | `401 { error: 'unauthorized' }` |
| OAuth provider returns error | Redirect to `/signin?error=OAuthCallback` → generic error message shown |
| Session cookie expired or tampered | `auth()` returns null → treated as unauthenticated |
| `NEXTAUTH_SECRET` missing | NextAuth throws at startup — app does not start |
| User denies OAuth consent | Redirect to `/signin?error=OAuthCallback` → generic error message shown |

---

## Environment Variables

Added to `.env.example` and documented in `SETUP.md`:

| Variable | Description |
|---|---|
| `NEXTAUTH_SECRET` | Random 32-byte secret: `openssl rand -base64 32` |
| `AUTH_URL` | Full deployment URL, e.g. `https://cerebrocal.vercel.app` (NextAuth v5 uses `AUTH_URL`; `NEXTAUTH_URL` is also accepted but `AUTH_URL` is the v5 canonical name) |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Same |
| `GITHUB_CLIENT_ID` | GitHub → Settings → Developer settings → OAuth Apps → New OAuth App |
| `GITHUB_CLIENT_SECRET` | Same |

---

## OAuth App Setup Requirements

### Google
1. Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client ID
2. Application type: Web application
3. Authorized redirect URI: `https://<your-domain>/api/auth/callback/google`
4. Also add `http://localhost:3000/api/auth/callback/google` for local dev

### GitHub
1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Homepage URL: `https://<your-domain>`
3. Authorization callback URL: `https://<your-domain>/api/auth/callback/github`
4. Also register a separate OAuth app for local dev with `http://localhost:3000/api/auth/callback/github`

---

## Testing Strategy

- Unit tests for API route guards: mock `auth()` returning null → assert 401; mock returning a session → assert logic proceeds
- Sign-in page renders both provider buttons (React Testing Library)
- Middleware logic tested via Next.js middleware test utilities or integration tests
- Manual verification: unauthenticated direct POST to `/api/calendar` returns 401

---

## Security Properties

- **API key never exposed:** OpenAI and Google service account credentials remain server-only — unchanged from the existing implementation
- **Session integrity:** JWTs are signed with `NEXTAUTH_SECRET`; tampering invalidates the signature
- **httpOnly cookies:** Session cookie is not accessible via JavaScript — immune to XSS token theft
- **CSRF protection:** NextAuth's built-in double-submit cookie pattern
- **No credential storage:** No passwords are stored anywhere — OAuth providers handle all credential management
- **Redirect URI validation:** OAuth providers only accept callbacks to the registered URIs, preventing open redirect attacks

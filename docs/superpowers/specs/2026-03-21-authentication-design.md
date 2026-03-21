# Authentication Design Spec

**Date:** 2026-03-21
**Feature:** User authentication for Cerebrocal
**Status:** Approved for implementation

---

## Goal

Add secure authentication to Cerebrocal so that only signed-in users can access the app and its API routes (`/api/session`, `/api/calendar`). Any unauthenticated request — browser visit or direct API call — is rejected before any protected logic runs.

## Approach

NextAuth.js v5 (Auth.js) with Google and GitHub OAuth providers. JWT sessions stored in signed, httpOnly cookies. No database required. Next.js edge middleware enforces authentication at the routing layer; API routes add a server-side `auth()` check as defense in depth.

---

## Architecture

### New / Modified Files

| File | Action | Responsibility |
|------|--------|---------------|
| `auth.ts` | Create | NextAuth v5 config — Google + GitHub providers, JWT strategy |
| `middleware.ts` | Create | Edge middleware — redirects unauthenticated requests to `/signin` |
| `app/signin/page.tsx` | Create | Server component sign-in page — Google + GitHub buttons, error display |
| `app/signin/SignInButtons.tsx` | Create | `'use client'` — interactive sign-in buttons calling `signIn()` |
| `app/layout.tsx` | Modify | Wrap with `SessionProvider` for client-side session access |
| `app/page.tsx` | Modify | Add sign-out button to right panel header |
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

Server component. Reads `searchParams.error` to show error messages. Renders `SignInButtons` for client interactivity. Matches Cerebrocal's dark aesthetic — centered card with app name and two provider buttons.

Displays a generic "Sign-in failed — please try again" message when `?error=` is present. Does not expose raw NextAuth error codes to users.

### `app/signin/SignInButtons.tsx`

`'use client'` component. Renders:
- "Continue with Google" button — calls `signIn('google', { redirectTo: '/' })`
- "Continue with GitHub" button — calls `signIn('github', { redirectTo: '/' })`

Both buttons match the existing Cerebrocal button style (rounded-full, glass border, dark background).

### `app/layout.tsx` (modified)

Wrap children with `SessionProvider` from `next-auth/react` so client components can access session state (needed for sign-out in the page header).

### `app/page.tsx` (modified)

Add a sign-out control to the right panel header. A small "Sign out" button (or link) next to the "Conversation" label. Calls `signOut({ redirectTo: '/signin' })` as a server action. Visible only when a session exists.

Because `page.tsx` is `'use client'`, the sign-out will be triggered via a `<form action={...}>` server action pattern or a small `SignOutButton` client component that calls the imported `signOut` action.

### API Route Guards

Both `/api/session/route.ts` and `/api/calendar/route.ts` get the same guard added at the top of their `POST` handler:

```ts
import { auth } from '@/auth'

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
| `NEXTAUTH_URL` | Full deployment URL, e.g. `https://cerebrocal.vercel.app` |
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

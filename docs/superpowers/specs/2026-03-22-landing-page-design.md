# Landing Page & Route Restructuring Design Spec

**Date:** 2026-03-22
**Feature:** Public landing page at `/`, chat interface moved to `/chat`
**Status:** Approved for implementation
**Depends on:** `2026-03-21-authentication-design.md` (implement together)

---

## Goal

Add a public-facing landing page at `/` that introduces Cerebrocal and lets users sign in with Google. The main chat interface moves from `/` to `/chat`. Authenticated users who land on `/` are redirected to `/chat` automatically.

---

## Route Structure

| Route | Auth | Component |
|---|---|---|
| `/` | Public | Landing page — hero, description, use cases, footer |
| `/chat` | Required (redirect to `/`) | Main chat interface (moved from `/`) |
| `/signin` | Public | OAuth error fallback — kept for `?error=` states |
| `/api/auth/*` | Public | NextAuth callbacks |

---

## Architecture

### New / Modified Files

| File | Action | Responsibility |
|------|--------|---------------|
| `app/page.tsx` | Replace | Landing page — server component, dark aesthetic, four sections |
| `app/chat/page.tsx` | Create | Chat interface — move existing `app/page.tsx` content here |
| `app/landing/HeroSignInButton.tsx` | Create | `'use client'` — calls `signIn('google', { redirectTo: '/chat' })` |
| `proxy.ts` | Modify | Protect `/chat` instead of `/`; redirect authenticated users from `/` to `/chat` |

### What moves

The current `app/page.tsx` (the `Home` component with `useWebRTC`, `useAudioAnalyzer`, split-panel layout) moves verbatim to `app/chat/page.tsx`. No logic changes — only the file location changes.

---

## Components

### `app/page.tsx` — Landing Page

Server component. No `'use client'` directive. Renders four sections in sequence within the existing dark background (`#09090B`) established by `app/globals.css`.

#### Hero Section

Full-viewport-height section, vertically and horizontally centered.

- **Logo/wordmark:** "Cerebrocal" in Space Grotesk, large (text-5xl or text-6xl), bold, white
- **Tagline:** One line below — "Your AI scheduling concierge" — small, `text-zinc-400`
- **Subtext:** Two lines — "Speak naturally. Book instantly. No typing required." — `text-zinc-500`, small
- **CTA button:** `<HeroSignInButton />` — "Sign in with Google" — styled to match existing button aesthetic (rounded-full, glass border, white text, cyan glow on hover). Includes Google's `G` icon (SVG inline or from `lucide-react` if available; otherwise a simple coloured circle placeholder).
- **Ambient background:** Inherits the existing radial gradient animation from `globals.css`

#### Description Section

Centered, max-width container (~`max-w-2xl`).

- **Heading:** "What is Cerebrocal?" — `text-2xl`, white
- **Body:** 2–3 sentences explaining the product. Example:
  > Cerebrocal is a real-time voice assistant that books Google Calendar events through natural conversation. Just say who you want to meet, when, and what it's about — the AI handles the rest, live in your calendar.
- **Visual separator:** Subtle horizontal rule or spacing — `border-white/5`

#### Use Cases Section

4-card grid (`grid-cols-2` on desktop, `grid-cols-1` on mobile). Each card: glass panel (`bg-white/5 border border-white/10 rounded-2xl`), icon + title + one-line description.

| Icon | Title | Description |
|---|---|---|
| 🗓 | Schedule a meeting | "Tell the AI who, when, and why — done." |
| 🔍 | Find a free slot | "Just ask and it'll suggest the next available time." |
| 📋 | Add full details | "Title, time, attendee — all captured by voice." |
| ✅ | Confirm instantly | "Hear confirmation the moment it's booked." |

#### Footer

Single row, `border-t border-white/5`, small text.

- Left: `© 2026 Cerebrocal`
- Right: nothing (keep minimal)

---

### `app/landing/HeroSignInButton.tsx`

`'use client'` component. Calls `signIn('google', { redirectTo: '/chat' })` on click.

```tsx
'use client'
import { signIn } from 'next-auth/react'

export function HeroSignInButton() {
  return (
    <button
      onClick={() => signIn('google', { redirectTo: '/chat' })}
      className="flex items-center gap-3 px-8 py-3 rounded-full bg-white text-zinc-900 font-semibold text-sm hover:bg-zinc-100 transition-colors shadow-[0_0_30px_rgba(34,211,238,0.2)]"
    >
      {/* Inline Google G SVG */}
      <svg width="18" height="18" viewBox="0 0 18 18">
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

---

### `proxy.ts` — Updated Logic

Two changes from the auth spec version:

1. **`/chat` is the protected route** — not `/`
2. **Authenticated users visiting `/` are redirected to `/chat`** (so they skip the landing page)

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

  // All other routes (/, /signin, /api/auth/*) pass through
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

Note: unauthenticated users who reach `/chat` are redirected to `/` (the landing page) rather than `/signin`, since the landing page IS the sign-in entry point.

---

### `app/chat/page.tsx`

The existing `app/page.tsx` content moved verbatim. The `'use client'` directive, all imports, the `Home` component — unchanged. Only the file path changes.

---

## Data Flow

### New User

```
GET / → proxy.ts → not authed → NextResponse.next() → landing page renders
  → user clicks "Sign in with Google"
  → signIn('google', { redirectTo: '/chat' })
  → Google consent screen
  → /api/auth/callback/google → session cookie set
  → redirect to /chat
  → proxy.ts → authed → NextResponse.next() → chat renders
```

### Returning User (valid session)

```
GET / → proxy.ts → authed → redirect to /chat → chat renders
```

### Returning User (expired/revoked token)

```
GET /chat → proxy.ts → hasTokenError → redirect to /
  → landing page → user clicks "Sign in with Google" → re-auth
```

---

## Design Constraints

- **Dark background:** Landing page inherits `#09090B` from `app/globals.css` body — no extra setup needed
- **Font:** Space Grotesk (already loaded in `app/layout.tsx`) for headings; Geist for body
- **Responsive:** Use-cases grid collapses from 2 columns to 1 on mobile (`grid-cols-1 md:grid-cols-2`)
- **No external images:** All icons are emoji or inline SVG — no image dependencies
- **Server component:** Landing page has zero client-side JavaScript (except `HeroSignInButton`) — fast initial load

---

## Testing Strategy

- Landing page renders all four sections (React Testing Library)
- `HeroSignInButton` calls `signIn` with correct args on click
- `proxy.ts` logic: authenticated user on `/` → redirect `/chat`; unauthenticated on `/chat` → redirect `/`
- Existing chat tests in `__tests__/` remain unaffected (component paths don't change, only file locations)

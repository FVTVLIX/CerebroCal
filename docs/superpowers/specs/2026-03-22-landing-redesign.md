# Landing Page Redesign + Sign-in Flow Simplification

## Overview

Replace the current landing page with a premium editorial/typographic design and remove the `/signin` route entirely. Sign-out sends users to `/` where the sign-in CTA lives.

---

## Design Direction

**Aesthetic:** Editorial/typographic — inspired by Linear, Stripe, NYT.

**Palette:**
- Background: `#09090b` (near-black)
- Body text: `#fff`
- Muted text: `#52525b`, `#3f3f46`, `#71717a`, `#a1a1aa`
- Borders/dividers: `rgba(255,255,255,0.04–0.07)`
- CSS noise texture: SVG fractal noise data URI applied as a `::after` pseudo-element on `<body>` or a wrapper div, `opacity: 0.03`, `pointer-events: none`, `position: fixed`, `inset: 0`, `z-index: 0`. Data URI:
  ```
  url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")
  ```
  Background-size: `200px`.

**Typography:**
- Headings: `Georgia, 'Times New Roman', serif` — system font stack, no import needed.
- Body / UI: `Space Grotesk` — already loaded via `next/font/google` in `app/layout.tsx`. No change needed to `layout.tsx`. Apply via `font-family` CSS or Tailwind `font-[Space_Grotesk]` / className from layout.
- Hero heading: 82px, weight 400, letter-spacing -3px
- Italic portion of heading: color `#71717a`

**Layout:**
- Centered, max-width `860px`, `margin: 0 auto`
- Section padding: `0 40px`
- Hero: `130px` top padding, `110px` bottom
- Between sections: `100px` bottom margin
- Section dividers: `56px` margin-bottom
- **Responsive:** At `< 640px` (Tailwind `sm` breakpoint), the 3-col steps grid collapses to 1 col and the 2-col features grid collapses to 1 col. Hero heading font-size drops to ~48px. Section padding reduces to `0 20px`.

---

## Page Structure

### Nav
- Left: `Cerebrocal` logo (14px, weight 600)
- Right: `AI Scheduling` badge (10px, letter-spacing 1.5px, uppercase, color `#3f3f46`)
- Bottom border: `1px solid rgba(255,255,255,0.05)`
- Padding: `28px 40px`

### Hero (centered)
- Eyebrow: `Voice · Calendar · AI` with decorative 28px horizontal rules either side, color `#52525b`
- Heading: `Schedule anything,` / `*just by asking.*` — Georgia 82px, italic portion in `#71717a`
- Subtext: 15px, color `#52525b`, max-width 380px, line-height 1.75
- CTA button: white background, black text, label `Continue with Google`, Google G SVG inline. This is `components/landing/HeroSignInButton.tsx` — update its label from `Sign in with Google` to `Continue with Google` and apply the new white-pill style.
- Footnote: `Free to use · No credit card required`, 11px, color `#27272a`
- **OAuth error state:** When NextAuth redirects back with `?error=...` in the URL (e.g., after a failed OAuth), `app/page.tsx` reads `searchParams.error` (it is a Server Component so `searchParams` is a prop) and renders an error banner above the CTA: `Sign-in failed — please try again.` in red/muted text. No change needed to any auth callback; just read the param and conditionally render.

### Section Dividers
Reusable pattern: horizontal line + floating uppercase label + horizontal line.
Labels: `How it works`, `See it in action`, `Everything you need`.

### How It Works (3-col grid)
Grid container: `border: 1px solid rgba(255,255,255,0.04)`, `border-radius: 12px`, `gap: 1px`, `background: rgba(255,255,255,0.04)`. Each cell: `background: #09090b`.
- Step 01 🔐: Sign in with Google — `Grant calendar access once. No setup required.`
- Step 02 🎙: Talk naturally — `Say who, when, and what. No forms, no typing.`
- Step 03 ✅: Event booked instantly — `Hear confirmation the moment it lands on your calendar.`
Each step: muted Georgia numeral (`01`/`02`/`03`), emoji icon, title, description.

### Conversation Demo
Terminal-style card (`border: 1px solid rgba(255,255,255,0.05)`, `border-radius: 12px`).
Header: three 6px dots + `Live session` label.
Two bubbles:
- User (right-aligned, `rgba(255,255,255,0.04)` bg): `Schedule a meeting with Sarah tomorrow at 2pm`
- AI (left-aligned, `rgba(34,211,238,0.05)` bg, `#a1f0f8` text): small `Cerebrocal` label above, then response text.

### Features (2-col grid)
Same border treatment as steps grid.
- 🎙 Real-time voice — `No typing. Just talk.`
- 🌍 Timezone-aware — `Works wherever you are.`
- 📅 Google Calendar native — `Books to your primary calendar directly.`
- ⚡ Instant confirmation — `Hear the result immediately.`

### Privacy Note
Slim bordered row (`border: 1px solid rgba(255,255,255,0.04)`, `border-radius: 8px`): 🔒 icon + `Privacy first. We request calendar access only to create events on your behalf. We don't read your existing events or store your data.`

### Footer
Space-between: `© 2026 Cerebrocal` | `Voice-powered scheduling`

---

## Sign-in Flow Changes

### Remove `/signin` route
- Delete `app/signin/page.tsx`
- Delete `app/signin/SignInButton.tsx`
- The root `/` page IS the sign-in page (CTA button triggers Google OAuth via `HeroSignInButton.tsx`)

### Auth config (`auth.ts`)
- **Remove** `pages: { signIn: '/signin' }` entirely. Do not replace it with `'/'`. Without this key, NextAuth uses the `redirectTo` value passed in `signIn()` calls (already set to `'/chat'` in `HeroSignInButton.tsx`). Removing the key is cleaner than overriding it.

### Sign-out (`components/SignOutButton.tsx`)
- Change `redirectTo: '/signin'` → `redirectTo: '/'`

### Middleware (`proxy.ts`)
- No changes needed. The current `proxy.ts` already has no `/signin` passthrough logic — it only handles `isLanding` and `isChat` routes. Verify, but expect no edits.

### Route protection (already working, verify only)
- `/chat` is protected — unauthenticated → redirect to `/`
- `/` is public — authenticated → redirect to `/chat` (existing behavior)
- `/signin` no longer exists — any 404 hits will redirect naturally since `proxy.ts` only intercepts `/` and `/chat`

---

## Testing

### Unit / component tests
- `__tests__/components/LandingPage.test.tsx` — **Rewrite** to test the new design: hero heading text, eyebrow text, CTA button label (`Continue with Google`), How It Works step descriptions, feature labels, privacy text.
- `__tests__/components/SignInButton.test.tsx` — **Delete** (imports `app/signin/SignInButton` which will no longer exist).
- `__tests__/components/HeroSignInButton.test.tsx` — **Update** to reflect label change from `Sign in with Google` to `Continue with Google` and any style assertions.

### Integration
- Sign-out from `/chat` → lands on `/` (not 404 or `/signin`)
- Clicking CTA on `/` triggers Google OAuth flow (redirectTo `/chat`)
- Unauthenticated request to `/chat` → redirects to `/`
- OAuth failure (`?error=OAuthCallback`) → `/` shows error banner

### Visual regression (manual)
- Open `/` at 1440px, 1024px, 375px widths
- Verify Georgia heading renders, sections are spaced, CTA button works
- Verify 3-col steps and 2-col features collapse to 1-col at mobile

---

## Files Affected

| Action | File |
|--------|------|
| Complete rewrite | `app/page.tsx` |
| Modify (label + style) | `components/landing/HeroSignInButton.tsx` |
| Delete | `app/signin/page.tsx` |
| Delete | `app/signin/SignInButton.tsx` |
| Modify (remove `pages.signIn`) | `auth.ts` |
| Modify (`redirectTo: '/'`) | `components/SignOutButton.tsx` |
| No change (verify only) | `proxy.ts` |
| Rewrite | `__tests__/components/LandingPage.test.tsx` |
| Delete | `__tests__/components/SignInButton.test.tsx` |
| Update | `__tests__/components/HeroSignInButton.test.tsx` |
| No change needed | `app/layout.tsx` (Space Grotesk already loaded) |

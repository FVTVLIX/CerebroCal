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
- CSS noise texture overlay at 3% opacity

**Typography:**
- Headings: `Georgia` serif
- Body / UI: `Space Grotesk` (Google Fonts import)
- Hero heading: 82px, weight 400, letter-spacing -3px
- Italic portion of heading: color `#71717a`

**Layout:**
- Centered, max-width `860px`, `margin: 0 auto`
- Section padding: `0 40px`
- Hero: `130px` top padding, `110px` bottom
- Between sections: `100px` bottom margin
- Section dividers: `56px` margin-bottom

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
- Subtext: 15px, color `#52525b`, max-width 380px
- CTA button: white pill, black text, `Continue with Google` with Google G SVG inline
- Footnote: `Free to use · No credit card required`, 11px, color `#27272a`

### Section Dividers
Reusable pattern: horizontal line + floating uppercase label + horizontal line.
Labels: `How it works`, `See it in action`, `Everything you need`.

### How It Works (3-col grid)
Cards share `1px solid rgba(255,255,255,0.04)` border on the grid container, `border-radius: 12px`, gap `1px`, `background: rgba(255,255,255,0.04)` to create hairline separators between cells.
- Step 01: Sign in with Google
- Step 02: Talk naturally
- Step 03: Event booked instantly
Each step: muted Georgia numeral (`01`/`02`/`03`), emoji icon, title, description.

### Conversation Demo
Terminal-style card with `•••` header dots + `Live session` label.
Two bubbles:
- User (right-aligned, `rgba(255,255,255,0.04)` bg)
- AI (left-aligned, `rgba(34,211,238,0.05)` bg, `#a1f0f8` text, `Cerebrocal` label above)

### Features (2-col grid)
Same border treatment as steps.
- Real-time voice
- Timezone-aware
- Google Calendar native
- Instant confirmation

### Privacy Note
Slim bordered row: lock icon + privacy statement.

### Footer
Space-between: `© 2026 Cerebrocal` | `Voice-powered scheduling`

---

## Sign-in Flow Changes

### Remove `/signin` route
- Delete `app/signin/page.tsx`
- Delete `app/signin/SignInButton.tsx`
- The root `/` page IS the sign-in page (CTA button triggers Google OAuth)

### Auth config (`auth.ts`)
- Remove `pages: { signIn: '/signin' }` (or point to `'/'`)
- NextAuth will redirect unauthenticated users to `/` by default

### Sign-out (`components/SignOutButton.tsx`)
- Change `redirectTo: '/signin'` → `redirectTo: '/'`

### Middleware (`proxy.ts`)
- Remove `isSignIn` passthrough logic (no longer needed)

### Route protection
- `/chat` remains protected — unauthenticated → redirect to `/`
- `/` remains public
- `/signin` no longer exists; any lingering links to it → update to `/`

---

## Testing

### Unit / component tests
- `app/__tests__/page.test.tsx` — verify hero heading, CTA button, How It Works steps, features grid render correctly
- `app/signin/` test file (if any) — delete alongside the route

### Integration
- Sign-out from `/chat` → lands on `/` (not 404 or `/signin`)
- Clicking CTA on `/` triggers Google OAuth flow
- Unauthenticated request to `/chat` → redirects to `/`

### Visual regression (manual)
- Open `/` at 1440px, 1024px, 375px widths
- Verify Georgia heading renders, sections are spaced, CTA button works

---

## Files Affected

| Action | File |
|--------|------|
| Complete rewrite | `app/page.tsx` |
| Delete | `app/signin/page.tsx` |
| Delete | `app/signin/SignInButton.tsx` |
| Modify | `auth.ts` |
| Modify | `components/SignOutButton.tsx` |
| Modify | `proxy.ts` |
| Modify | `app/__tests__/page.test.tsx` |
| Delete (if exists) | `app/signin/__tests__/` or related test file |

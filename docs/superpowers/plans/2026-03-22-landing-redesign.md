# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page with a premium editorial/typographic design and remove the `/signin` route entirely, consolidating sign-in onto the root page.

**Architecture:** Three sequential tasks — auth cleanup first (smallest blast radius), then update the sign-in button component, then rewrite the landing page with TDD throughout. The landing page (`app/page.tsx`) is a Next.js async Server Component; tests call it as a function (`await LandingPage(...)`) and `render()` the returned JSX, which is the correct pattern for React 19 async Server Components in Jest.

**Tech Stack:** Next.js 16 App Router (React 19), NextAuth v5 (Auth.js), Jest + React Testing Library, inline styles (design uses specific pixel values from the approved mockup).

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Delete | `app/signin/page.tsx` | Removed — sign-in moves to `/` |
| Delete | `app/signin/SignInButton.tsx` | Removed — replaced by `HeroSignInButton` |
| Modify | `auth.ts` | Remove `pages.signIn` key |
| Modify | `components/SignOutButton.tsx` | Change `redirectTo` from `/signin` to `/` |
| Modify | `components/landing/HeroSignInButton.tsx` | Label + style update |
| Rewrite | `app/page.tsx` | Editorial design, async for `searchParams` |
| Delete | `__tests__/components/SignInButton.test.tsx` | Removed with the component it tests |
| Update | `__tests__/components/HeroSignInButton.test.tsx` | Update label assertion |
| Rewrite | `__tests__/components/LandingPage.test.tsx` | Tests for new page design |
| No change | `proxy.ts` | Already correct — verify only |
| No change | `app/layout.tsx` | Space Grotesk already loaded |

---

## Task 1: Auth Cleanup — Remove `/signin` Route

**Files:**
- Delete: `app/signin/page.tsx`
- Delete: `app/signin/SignInButton.tsx`
- Delete: `__tests__/components/SignInButton.test.tsx`
- Modify: `auth.ts` (lines 18–20)
- Modify: `components/SignOutButton.tsx` (line 7)

> No TDD here — these are deletions and one-line config changes. Run tests after to verify nothing breaks.

- [ ] **Step 1: Delete the signin route files**

Run from the project root (where `package.json` lives):

```bash
rm app/signin/page.tsx app/signin/SignInButton.tsx && rmdir app/signin
```

- [ ] **Step 2: Delete the stale test file**

```bash
rm __tests__/components/SignInButton.test.tsx
```

- [ ] **Step 3: Remove `pages.signIn` from auth.ts**

In `auth.ts`, remove this block (currently lines 18–20):

```ts
  pages: {
    signIn: '/signin',
  },
```

The file should go directly from the `providers` array to `callbacks`. Do not replace this with a `'/'` value — removing the key entirely lets NextAuth use the `redirectTo` option passed in `signIn()` calls (already set to `'/chat'` in `HeroSignInButton`).

- [ ] **Step 4: Fix sign-out redirect in SignOutButton.tsx**

In `components/SignOutButton.tsx`, change line 7 from:

```ts
      onClick={() => signOut({ redirectTo: '/signin' })}
```

to:

```ts
      onClick={() => signOut({ redirectTo: '/' })}
```

- [ ] **Step 5: Verify proxy.ts needs no changes**

Open `proxy.ts` and confirm it only references `isLanding` and `isChat`. There should be no `isSignIn` variable. If one exists, remove the block that passes `/signin` through — but expect to find none.

- [ ] **Step 6: Run tests**

```bash
npm test -- --testPathPattern="SignOutButton|HeroSignInButton|LandingPage" --no-coverage
```

Expected: `SignInButton.test.tsx` is gone, the remaining tests pass. Total test count drops by 2 (the two deleted `SignInButton` tests). If any test imports from `@/app/signin/`, fix the import or delete the test.

Note: `LandingPage` tests will show green here but they are still testing the old page content — that is expected and correct. They get rewritten in Task 3.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: remove /signin route, consolidate auth to landing page"
```

---

## Task 2: Update HeroSignInButton — Label and Style

**Files:**
- Modify: `__tests__/components/HeroSignInButton.test.tsx`
- Modify: `components/landing/HeroSignInButton.tsx`

The current button says "Sign in with Google" with a `rounded-full` Tailwind class. The new design uses "Continue with Google" with a rectangular button (`border-radius: 6px`) styled to match the approved mockup.

- [ ] **Step 1: Update the failing test**

Replace the contents of `__tests__/components/HeroSignInButton.test.tsx` with:

```tsx
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

  it('displays "Continue with Google"', () => {
    render(<HeroSignInButton />)
    expect(screen.getByRole('button')).toHaveTextContent('Continue with Google')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- --testPathPattern="HeroSignInButton" --no-coverage
```

Expected: The first test (`calls signIn with google...`) already passes — the behavior is unchanged. Only the label test (`displays "Continue with Google"`) fails, with actual text `"Sign in with Google"`.

- [ ] **Step 3: Update the component**

Replace the entire contents of `components/landing/HeroSignInButton.tsx` with:

```tsx
'use client'
import { signIn } from 'next-auth/react'

export function HeroSignInButton() {
  return (
    <button
      onClick={() => signIn('google', { redirectTo: '/chat' })}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        background: '#fff',
        color: '#09090b',
        fontFamily: "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '-0.2px',
        padding: '15px 30px',
        borderRadius: 6,
        cursor: 'pointer',
        border: 'none',
        textDecoration: 'none',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
        <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"/>
      </svg>
      Continue with Google
    </button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- --testPathPattern="HeroSignInButton" --no-coverage
```

Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add components/landing/HeroSignInButton.tsx __tests__/components/HeroSignInButton.test.tsx
git commit -m "feat: update HeroSignInButton label and style for new design"
```

---

## Task 3: Rewrite Landing Page

**Files:**
- Rewrite: `__tests__/components/LandingPage.test.tsx`
- Rewrite: `app/page.tsx`

The new landing page is an **async** Server Component that accepts optional `searchParams`. Tests call it as a function: `render(await LandingPage({ searchParams: Promise.resolve({}) }))`. This is the correct pattern for React 19 async Server Components in Jest.

- [ ] **Step 1: Rewrite the test file**

Replace the entire contents of `__tests__/components/LandingPage.test.tsx` with:

```tsx
import { render, screen } from '@testing-library/react'
import LandingPage from '@/app/page'

// HeroSignInButton is a client component — mock it so tests don't need next-auth
jest.mock('@/components/landing/HeroSignInButton', () => ({
  HeroSignInButton: () => <button>Continue with Google</button>,
}))

async function renderPage(error?: string) {
  const jsx = await LandingPage({ searchParams: Promise.resolve(error ? { error } : {}) })
  render(jsx)
}

describe('LandingPage', () => {
  it('renders the logo in the nav', async () => {
    await renderPage()
    expect(screen.getByText('Cerebrocal')).toBeInTheDocument()
  })

  it('renders the AI Scheduling nav badge', async () => {
    await renderPage()
    expect(screen.getByText('AI Scheduling')).toBeInTheDocument()
  })

  it('renders the hero eyebrow text', async () => {
    await renderPage()
    expect(screen.getByText('Voice · Calendar · AI')).toBeInTheDocument()
  })

  it('renders the hero heading', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Schedule anything,')
  })

  it('renders the CTA button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('renders the footnote', async () => {
    await renderPage()
    expect(screen.getByText(/free to use/i)).toBeInTheDocument()
  })

  it('renders the How It Works divider label', async () => {
    await renderPage()
    expect(screen.getByText('How it works')).toBeInTheDocument()
  })

  it('renders all three How It Works step descriptions', async () => {
    await renderPage()
    expect(screen.getByText(/grant calendar access once/i)).toBeInTheDocument()
    expect(screen.getByText(/no forms, no typing/i)).toBeInTheDocument()
    expect(screen.getByText(/hear confirmation the moment it lands on your calendar/i)).toBeInTheDocument()
  })

  it('renders the See it in action divider and sample conversation', async () => {
    await renderPage()
    expect(screen.getByText('See it in action')).toBeInTheDocument()
    expect(screen.getByText(/schedule a meeting with sarah/i)).toBeInTheDocument()
  })

  it('renders the Everything you need divider and features', async () => {
    await renderPage()
    expect(screen.getByText('Everything you need')).toBeInTheDocument()
    expect(screen.getByText(/no typing\. just talk\./i)).toBeInTheDocument()
    expect(screen.getByText(/works wherever you are\./i)).toBeInTheDocument()
  })

  it('renders the privacy note', async () => {
    await renderPage()
    expect(screen.getByText(/privacy first/i)).toBeInTheDocument()
    expect(screen.getByText(/we do not read your existing events/i)).toBeInTheDocument()
  })

  it('renders the footer copyright', async () => {
    await renderPage()
    expect(screen.getByText('© 2026 Cerebrocal')).toBeInTheDocument()
  })

  it('does NOT show the error banner when no error param', async () => {
    await renderPage()
    expect(screen.queryByText(/sign-in failed/i)).not.toBeInTheDocument()
  })

  it('shows the error banner when error param is present', async () => {
    await renderPage('OAuthCallback')
    expect(screen.getByText(/sign-in failed — please try again/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- --testPathPattern="LandingPage" --no-coverage
```

Expected: Most tests FAIL because the current `app/page.tsx` renders old content. Note: `await syncFn()` in JavaScript resolves immediately without error — the tests don't fail due to the synchronous/async difference. They fail because the current page has no "AI Scheduling" badge, no "Voice · Calendar · AI" eyebrow, no `<h1>` with "Schedule anything,", etc. A few tests that check text already present in the old page (e.g., "How it works", step descriptions, features) may coincidentally pass — that's fine, they will still test the right thing once the page is rewritten.

- [ ] **Step 3: Rewrite app/page.tsx**

Replace the entire contents of `app/page.tsx` with:

```tsx
import { HeroSignInButton } from '@/components/landing/HeroSignInButton'

const NOISE_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")"

export default async function LandingPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const { error } = await (searchParams ?? Promise.resolve({}))

  return (
    <>
      <style>{`
        .lp-noise::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: ${NOISE_DATA_URI};
          background-size: 200px;
          opacity: 0.03;
          pointer-events: none;
          z-index: 0;
        }
        @media (max-width: 640px) {
          .lp-steps { grid-template-columns: 1fr !important; }
          .lp-features { grid-template-columns: 1fr !important; }
          .lp-hero-h1 { font-size: 48px !important; }
          .lp-section { padding: 0 20px !important; }
        }
      `}</style>

      <div
        className="lp-noise"
        style={{
          background: '#09090b',
          minHeight: '100vh',
          color: '#fff',
          fontFamily: "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
        }}
      >
        <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.3px' }}>Cerebrocal</span>
            <span style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#3f3f46' }}>AI Scheduling</span>
          </nav>

          {/* Hero */}
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '130px 40px 110px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#52525b', marginBottom: 48 }}>
              <span style={{ display: 'block', width: 28, height: 1, background: '#27272a' }} aria-hidden="true" />
              Voice · Calendar · AI
              <span style={{ display: 'block', width: 28, height: 1, background: '#27272a' }} aria-hidden="true" />
            </div>

            <h1
              className="lp-hero-h1"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 82, fontWeight: 400, lineHeight: 1.0, letterSpacing: -3, color: '#fff', marginBottom: 36, maxWidth: 640 }}
            >
              Schedule anything,<br />
              <em style={{ fontStyle: 'italic', color: '#71717a' }}>just by asking.</em>
            </h1>

            <p style={{ fontSize: 15, color: '#52525b', lineHeight: 1.75, maxWidth: 380, marginBottom: error ? 24 : 56, fontWeight: 400 }}>
              A real-time voice assistant that books Google Calendar events through natural conversation. No typing required.
            </p>

            {error && (
              <p role="alert" style={{ fontSize: 13, color: '#f87171', marginBottom: 32 }}>
                Sign-in failed — please try again.
              </p>
            )}

            <HeroSignInButton />

            <p style={{ marginTop: 22, fontSize: 11, color: '#27272a', letterSpacing: '0.2px' }}>
              Free to use · No credit card required
            </p>
          </section>

          <Divider label="How it works" />

          {/* Steps */}
          <div className="lp-section" style={{ padding: '0 40px', marginBottom: 100 }}>
            <div
              className="lp-steps"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden' }}
            >
              {[
                { num: '01', icon: '🔐', title: 'Sign in with Google', desc: 'Grant calendar access once. No setup required.' },
                { num: '02', icon: '🎙', title: 'Talk naturally', desc: 'Say who, when, and what. No forms, no typing.' },
                { num: '03', icon: '✅', title: 'Event booked instantly', desc: 'Hear confirmation the moment it lands on your calendar.' },
              ].map((step) => (
                <div key={step.num} style={{ background: '#09090b', padding: '36px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 400, color: 'rgba(255,255,255,0.05)', letterSpacing: -1, lineHeight: 1 }} aria-hidden="true">{step.num}</div>
                  <div style={{ fontSize: 20 }} aria-hidden="true">{step.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7', letterSpacing: '-0.2px' }}>{step.title}</div>
                  <div style={{ fontSize: 12, color: '#3f3f46', lineHeight: 1.65 }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <Divider label="See it in action" />

          {/* Conversation demo */}
          <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden', margin: '0 40px', marginBottom: 100 }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} aria-hidden="true" />
              ))}
              <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#27272a', marginLeft: 6 }}>Live session</span>
            </div>
            <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ maxWidth: '70%', padding: '12px 18px', borderRadius: 12, fontSize: 13, lineHeight: 1.55, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#a1a1aa', alignSelf: 'flex-end', borderBottomRightRadius: 3 }}>
                Schedule a meeting with Sarah tomorrow at 2pm
              </div>
              <div style={{ maxWidth: '70%', padding: '12px 18px', borderRadius: 12, fontSize: 13, lineHeight: 1.55, background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.1)', color: '#a1f0f8', alignSelf: 'flex-start', borderBottomLeftRadius: 3 }}>
                <span style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(34,211,238,0.35)', marginBottom: 5, display: 'block' }}>Cerebrocal</span>
                Got it. I&apos;ve added &quot;Meeting with Sarah&quot; to your calendar for tomorrow at 2:00 PM. Anything else?
              </div>
            </div>
          </div>

          <Divider label="Everything you need" />

          {/* Features */}
          <div
            className="lp-features"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden', margin: '0 40px', marginBottom: 100 }}
          >
            {[
              { icon: '🎙', title: 'Real-time voice', desc: 'No typing. Just talk.' },
              { icon: '🌍', title: 'Timezone-aware', desc: 'Works wherever you are.' },
              { icon: '📅', title: 'Google Calendar native', desc: 'Books to your primary calendar directly.' },
              { icon: '⚡', title: 'Instant confirmation', desc: 'Hear the result immediately.' },
            ].map((f) => (
              <div key={f.title} style={{ background: '#09090b', padding: '28px 32px', display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                <span style={{ fontSize: 16, marginTop: 2, opacity: 0.55 }} aria-hidden="true">{f.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#d4d4d8', letterSpacing: '-0.2px', marginBottom: 5 }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: '#3f3f46', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy */}
          <div style={{ margin: '0 40px 100px', padding: '22px 28px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ fontSize: 14, opacity: 0.35 }} aria-hidden="true">🔒</span>
            <p style={{ fontSize: 11, color: '#3f3f46', lineHeight: 1.65 }}>
              <strong style={{ color: '#52525b', fontWeight: 500 }}>Privacy first.</strong> We request calendar access only to create events on your behalf. We do not read your existing events or store your data.
            </p>
          </div>

          {/* Footer */}
          <footer style={{ padding: '24px 40px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 60 }}>
            <span style={{ fontSize: 11, color: '#27272a' }}>© 2026 Cerebrocal</span>
            <span style={{ fontSize: 11, color: '#27272a' }}>Voice-powered scheduling</span>
          </footer>

        </div>
      </div>
    </>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '0 40px', marginBottom: 56 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} aria-hidden="true" />
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#27272a' }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} aria-hidden="true" />
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- --testPathPattern="LandingPage" --no-coverage
```

Expected: All 14 tests PASS.

- [ ] **Step 5: Run the full test suite**

```bash
npm test -- --no-coverage
```

Expected: All tests pass. The `SignInButton` test file is gone, `HeroSignInButton` tests pass with new label, `LandingPage` tests pass with new design.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx __tests__/components/LandingPage.test.tsx
git commit -m "feat: editorial landing page redesign with sign-in on root"
```

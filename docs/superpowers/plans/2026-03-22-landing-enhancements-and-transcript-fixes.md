# Landing Enhancements & Transcript Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an animated background orb and four new content sections to the landing page; fix AI responses not appearing in the transcript; add a clickable Google Calendar event link after a successful booking.

**Architecture:** Four independent changes to existing files — type widening in `lib/types.ts` flows through to `useWebRTC.ts` and `TranscriptPanel.tsx`; landing page changes are isolated to `app/page.tsx` and its test file. No new files, no new dependencies.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Framer Motion, Jest + React Testing Library

---

## File Map

| File | Change |
|------|--------|
| `lib/types.ts` | Add `'system'` to `TranscriptMessage.role` union |
| `hooks/useWebRTC.ts` | Fix `addMessage` type annotation; fix `'audio_transcript'` → `'audio'`; add `addMessage('system', htmlLink)` on successful booking |
| `components/TranscriptPanel.tsx` | Early-return branch for `role === 'system'` — renders booking-confirmed link card |
| `app/page.tsx` | Add orb `<div>` + `<style>` to hero; add four new content sections |
| `__tests__/components/TranscriptPanel.test.tsx` | Add test for system message link card |
| `__tests__/components/LandingPage.test.tsx` | Add tests for four new sections |

---

## Task 1: Widen TranscriptMessage type and fix AI transcript bug

**Files:**
- Modify: `lib/types.ts:10`
- Modify: `hooks/useWebRTC.ts:28` and `hooks/useWebRTC.ts:88`

These two changes are tightly coupled (the type flows from `lib/types.ts` into the hook) so they go in one task.

- [ ] **Step 1: Add `'system'` to `TranscriptMessage.role` in `lib/types.ts`**

Open `lib/types.ts`. Change line 10:

```ts
// Before
role: 'user' | 'ai'

// After
role: 'user' | 'ai' | 'system'
```

- [ ] **Step 2: Widen `addMessage` type annotation in `hooks/useWebRTC.ts`**

Open `hooks/useWebRTC.ts`. Change the `addMessage` callback signature at line 28:

```ts
// Before
const addMessage = useCallback((role: 'user' | 'ai', content: string) => {

// After
const addMessage = useCallback((role: 'user' | 'ai' | 'system', content: string) => {
```

- [ ] **Step 3: Fix the AI content type bug in `hooks/useWebRTC.ts`**

At line 88, inside the `response.output_item.done` case, fix the content type filter:

```ts
// Before
c.type === 'text' || c.type === 'audio_transcript'

// After
c.type === 'text' || c.type === 'audio'
```

Context — the full `contentItem` find expression should read:
```ts
const contentItem = item.content?.find(
  (c: { type: string; text?: string; transcript?: string }) =>
    c.type === 'text' || c.type === 'audio'
)
```

- [ ] **Step 4: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: zero errors. If there are errors, fix them before proceeding.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts hooks/useWebRTC.ts
git commit -m "fix: add system message role; fix AI audio transcript content type"
```

---

## Task 2: Render system messages in TranscriptPanel

**Files:**
- Modify: `components/TranscriptPanel.tsx`
- Modify: `__tests__/components/TranscriptPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

Open `__tests__/components/TranscriptPanel.test.tsx`. The existing `makeMsg` helper is typed as `(role: 'user' | 'ai', ...)`. Update the helper to accept `'system'` too, then add two new tests at the bottom of the `describe` block:

```tsx
// Update makeMsg signature at line 14:
const makeMsg = (role: 'user' | 'ai' | 'system', content: string): TranscriptMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  timestamp: Date.now(),
})

// Add these two tests inside describe('TranscriptPanel', () => { ... }):

it('renders a booking-confirmed link card for system messages', () => {
  const messages = [makeMsg('system', 'https://calendar.google.com/event?eid=abc123')]
  render(<TranscriptPanel messages={messages} isActive={true} />)
  const link = screen.getByRole('link', { name: /view event in google calendar/i })
  expect(link).toBeInTheDocument()
  expect(link).toHaveAttribute('href', 'https://calendar.google.com/event?eid=abc123')
  expect(link).toHaveAttribute('target', '_blank')
  expect(link).toHaveAttribute('rel', 'noopener noreferrer')
})

it('does not render system messages as a chat bubble', () => {
  const messages = [makeMsg('system', 'https://calendar.google.com/event?eid=abc123')]
  render(<TranscriptPanel messages={messages} isActive={true} />)
  // The URL itself should not appear as raw text
  expect(screen.queryByText('https://calendar.google.com/event?eid=abc123')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/components/TranscriptPanel.test.tsx --no-coverage
```

Expected: the two new tests FAIL (system message not rendered yet). All existing tests must still PASS.

- [ ] **Step 3: Add system message rendering branch to `TranscriptPanel.tsx`**

Open `components/TranscriptPanel.tsx`. Inside `messages.map((msg, i) => (`, add an early-return branch **before** the existing `<motion.div>` JSX. The full map callback becomes:

```tsx
{messages.map((msg, i) => {
  // ── System message: booking-confirmed link card ────────────────────
  if (msg.role === 'system') {
    return (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <a
          href={msg.content}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-sm hover:bg-emerald-950/60 transition-colors"
        >
          <span>📅</span>
          <span className="font-medium">View event in Google Calendar →</span>
        </a>
      </motion.div>
    )
  }

  // ── User / AI chat bubbles (existing — unchanged) ──────────────────
  return (
    <motion.div
      key={msg.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: i === messages.length - 1 ? 0 : 0 }}
      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
          msg.role === 'ai'
            ? 'bg-cyan-950/50 border border-cyan-900/40 text-cyan-100'
            : 'bg-white/5 border border-white/10 text-zinc-300'
        }`}
      >
        {msg.content}
      </div>
    </motion.div>
  )
})}
```

Note: the outer wrapper in `return (` changes from `(` to `{` (arrow function body) to accommodate the early return. Update the `AnimatePresence` child accordingly.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/components/TranscriptPanel.test.tsx --no-coverage
```

Expected: ALL tests PASS including the two new ones.

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add components/TranscriptPanel.tsx __tests__/components/TranscriptPanel.test.tsx
git commit -m "feat: render booking-confirmed link card for system transcript messages"
```

---

## Task 3: Surface calendar event link in useWebRTC

**Files:**
- Modify: `hooks/useWebRTC.ts:118-137` (the `response.function_call_arguments.done` calendar fetch block)

- [ ] **Step 1: Update the calendar result handling in `useWebRTC.ts`**

Inside the `response.function_call_arguments.done` case, find the block starting at `calendarResult = await res.json()`. Replace the existing error check with:

```ts
calendarResult = await res.json()

if (!res.ok) {
  const errData = calendarResult as { error?: string }
  const code =
    errData.error === 'calendar_not_configured'
      ? 'calendar_not_configured'
      : 'calendar_insert_failed'
  setError({
    code,
    message:
      code === 'calendar_not_configured'
        ? 'Calendar not configured — see SETUP.md'
        : 'Booking failed',
  })
} else {
  // Surface the event link as a system message in the transcript
  const result = calendarResult as { success?: boolean; htmlLink?: string }
  if (result.htmlLink) {
    addMessage('system', result.htmlLink)
  }
}
```

Everything after this block (the `sendWhenOpen` calls to submit function output and trigger AI response) remains unchanged.

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Run full test suite to check no regressions**

```bash
npx jest --no-coverage
```

Expected: ALL tests pass.

- [ ] **Step 4: Commit**

```bash
git add hooks/useWebRTC.ts
git commit -m "feat: add calendar event link to transcript after successful booking"
```

---

## Task 4: Landing page — animated orb

**Files:**
- Modify: `app/page.tsx`

The orb is a CSS-animated `<div>` inside the existing hero `<section>`. No new imports needed.

- [ ] **Step 1: Add the orb to the hero section in `app/page.tsx`**

The hero `<section>` (lines 30-42) currently starts with:
```tsx
<section className="flex flex-col items-center justify-center flex-1 min-h-screen gap-6 px-6 text-center">
```

Change it to include `position: relative` and add the orb + style tag inside it:

```tsx
<section className="relative flex flex-col items-center justify-center flex-1 min-h-screen gap-6 px-6 text-center overflow-hidden">
  {/* Animated background orb */}
  <style>{`
    @keyframes orbDrift {
      from { transform: translate(-30px, -20px); }
      to   { transform: translate(30px, 25px); }
    }
  `}</style>
  <div
    aria-hidden="true"
    style={{
      position: 'absolute',
      width: '600px',
      height: '600px',
      borderRadius: '50%',
      background: 'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.10) 0%, rgba(34,211,238,0.02) 60%, transparent 80%)',
      filter: 'blur(80px)',
      animation: 'orbDrift 12s ease-in-out infinite alternate',
      pointerEvents: 'none',
      zIndex: 0,
    }}
  />
  {/* Hero content — sits above the orb */}
  <div className="relative z-10 flex flex-col items-center gap-6">
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
  </div>
</section>
```

- [ ] **Step 2: Run existing LandingPage tests to verify nothing broke**

```bash
npx jest __tests__/components/LandingPage.test.tsx --no-coverage
```

Expected: ALL existing tests PASS (orb has `aria-hidden="true"` so it doesn't affect role/text queries).

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add animated cyan orb to landing page hero background"
```

---

## Task 5: Landing page — new content sections

**Files:**
- Modify: `app/page.tsx`
- Modify: `__tests__/components/LandingPage.test.tsx`

Add four sections in this order between Description and Use Cases, plus Privacy before the footer. Final page order: Hero → Description → **How It Works** → **Sample Conversation** → **Expanded Features** → Use Cases → **Privacy Note** → Footer.

- [ ] **Step 1: Write the failing tests**

Open `__tests__/components/LandingPage.test.tsx`. Add these tests inside the existing `describe('LandingPage', ...)` block:

```tsx
it('renders the How It Works section heading', () => {
  render(<LandingPage />)
  expect(screen.getByText('How it works')).toBeInTheDocument()
})

it('renders all three How It Works steps', () => {
  render(<LandingPage />)
  expect(screen.getByText(/sign in with google/i)).toBeInTheDocument()
  expect(screen.getByText(/talk naturally/i)).toBeInTheDocument()
  expect(screen.getByText(/event booked instantly/i)).toBeInTheDocument()
})

it('renders the sample conversation section', () => {
  render(<LandingPage />)
  expect(screen.getByText('See it in action')).toBeInTheDocument()
  expect(screen.getByText(/schedule a meeting with sarah/i)).toBeInTheDocument()
})

it('renders the expanded features section', () => {
  render(<LandingPage />)
  expect(screen.getByText('Everything you need')).toBeInTheDocument()
  expect(screen.getByText(/real-time voice/i)).toBeInTheDocument()
  expect(screen.getByText(/timezone-aware/i)).toBeInTheDocument()
})

it('renders the privacy note', () => {
  render(<LandingPage />)
  expect(screen.getByText(/privacy first/i)).toBeInTheDocument()
  expect(screen.getByText(/we do not read your existing events/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/components/LandingPage.test.tsx --no-coverage
```

Expected: the five new tests FAIL. All existing tests PASS.

- [ ] **Step 3: Add the four new sections to `app/page.tsx`**

Insert the following sections between the Description section and the Use Cases section, and add the Privacy section between Use Cases and Footer. Full additions:

**How It Works** — insert after the closing `</section>` of Description (after line 54):

```tsx
{/* How It Works */}
<section className="flex flex-col items-center gap-8 px-6 py-16 border-t border-white/5">
  <div className="max-w-2xl w-full text-center">
    <h2 className="text-2xl font-bold text-white mb-10">How it works</h2>
    <div className="flex flex-col gap-8">
      {[
        { step: '1', icon: '🔐', title: 'Sign in with Google', desc: 'Grant calendar access once. No setup required.' },
        { step: '2', icon: '🎙', title: 'Talk naturally', desc: 'Say who, when, and what. No forms, no typing.' },
        { step: '3', icon: '✅', title: 'Event booked instantly', desc: 'Hear confirmation the moment it lands on your calendar.' },
      ].map(({ step, icon, title, desc }) => (
        <div key={step} className="flex items-start gap-6 text-left">
          <span className="text-4xl font-bold text-white/10 leading-none w-8 shrink-0">{step}</span>
          <div>
            <p className="text-base font-semibold text-white mb-1">{icon} {title}</p>
            <p className="text-sm text-zinc-400">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
</section>
```

**Sample Conversation** — insert after How It Works:

```tsx
{/* Sample Conversation */}
<section className="flex flex-col items-center gap-6 px-6 py-16 border-t border-white/5">
  <h2 className="text-2xl font-bold text-white">See it in action</h2>
  <div className="max-w-xl w-full flex flex-col gap-3 bg-white/5 border border-white/10 rounded-2xl p-6">
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm bg-white/5 border border-white/10 text-zinc-300">
        Schedule a meeting with Sarah tomorrow at 2pm
      </div>
    </div>
    <div className="flex justify-start">
      <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm bg-cyan-950/50 border border-cyan-900/40 text-cyan-100">
        Got it. I&apos;ve added &quot;Meeting with Sarah&quot; to your calendar for tomorrow at 2:00 PM. Anything else?
      </div>
    </div>
  </div>
</section>
```

**Expanded Features** — insert after Sample Conversation:

```tsx
{/* Expanded Features */}
<section className="flex flex-col items-center gap-8 px-6 py-16 border-t border-white/5">
  <h2 className="text-2xl font-bold text-white">Everything you need</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-w-2xl w-full">
    {[
      { icon: '🎙', title: 'Real-time voice', desc: 'No typing. Just talk.' },
      { icon: '🌍', title: 'Timezone-aware scheduling', desc: 'Works wherever you are.' },
      { icon: '📅', title: 'Google Calendar native', desc: 'Books directly to your primary calendar.' },
      { icon: '⚡', title: 'Instant audio confirmation', desc: 'Hear the result immediately.' },
      { icon: '🔒', title: 'Your credentials only', desc: 'No shared accounts or service keys.' },
      { icon: '📱', title: 'Works on any device', desc: 'Any browser with a microphone.' },
    ].map(({ icon, title, desc }) => (
      <div key={title} className="flex items-start gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-zinc-400">{desc}</p>
        </div>
      </div>
    ))}
  </div>
</section>
```

**Privacy Note** — insert between the closing `</section>` of Use Cases and the `<footer>`:

```tsx
{/* Privacy Note */}
<section className="flex flex-col items-center px-6 py-6 border-t border-b border-white/5">
  <p className="max-w-2xl text-center text-sm text-zinc-400">
    🔒 <strong className="text-zinc-300">Privacy first.</strong> Cerebrocal requests Google Calendar
    access only to create events on your behalf. We do not read your existing events, store your
    calendar data, or share anything with third parties.
  </p>
</section>
```

- [ ] **Step 4: Run the tests to verify they pass**

```bash
npx jest __tests__/components/LandingPage.test.tsx --no-coverage
```

Expected: ALL tests PASS including the five new ones.

- [ ] **Step 5: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: ALL tests PASS.

- [ ] **Step 6: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 7: Commit**

```bash
git add app/page.tsx __tests__/components/LandingPage.test.tsx
git commit -m "feat: add How It Works, sample conversation, features, privacy sections to landing page"
```

---

## Final verification

- [ ] Start the dev server and visually verify:
  - Landing page orb animates slowly in the hero background
  - All four new sections render correctly and are readable on mobile
  - Signing in with Google navigates to `/chat`
  - During a voice session, AI responses appear in the transcript (cyan bubbles)
  - After the AI books a calendar event, a green "View event in Google Calendar →" link card appears in the transcript and opens the correct URL

```bash
npm run dev
```

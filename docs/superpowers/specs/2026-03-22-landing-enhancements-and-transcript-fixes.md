# Landing Enhancements & Transcript Fixes Design Spec

**Date:** 2026-03-22
**Feature:** Orb background, landing page content expansion, AI transcript visibility, calendar event link
**Status:** Approved for implementation

---

## Goal

Four improvements to the existing app:

1. **Flowing orb** — animated blurred cyan orb behind the landing page hero
2. **Landing page content** — four additional sections: How it works, sample conversation, expanded features, privacy note
3. **AI transcript fix** — AI responses are not appearing in the transcript due to a wrong content type string; one-word fix
4. **Calendar event link** — surface the `htmlLink` from a successful booking as a clickable "View in Google Calendar" card in the transcript

---

## Architecture

### Files Changed

| File | Action | Change |
|------|--------|--------|
| `app/page.tsx` | Modify | Add orb `<div>` to hero; add four new content sections |
| `lib/types.ts` | Modify | Add `'system'` to `TranscriptMessage` role union |
| `hooks/useWebRTC.ts` | Modify | Fix `'audio_transcript'` → `'audio'`; add `addMessage('system', htmlLink)` after successful booking |
| `components/TranscriptPanel.tsx` | Modify | Render `role === 'system'` messages as a booking-confirmed link card |

No new files. No new dependencies.

---

## Feature 1: Flowing Orb

### Location

Absolutely positioned `<div>` inside the hero section of `app/page.tsx`, behind all content (`z-index` lower than content). `pointer-events-none` so it doesn't intercept clicks.

### Appearance

- Size: 600×600px
- Shape: `border-radius: 50%`
- Fill: `radial-gradient(circle at 50% 50%, rgba(34,211,238,0.10) 0%, rgba(34,211,238,0.02) 60%, transparent 80%)`
- Blur: `filter: blur(80px)`
- Color: single cyan channel — matches the existing button glow (`rgba(34,211,238,...)`)

### Animation

CSS `@keyframes` — slow translate drift, no scale change:

```css
@keyframes orbDrift {
  from { transform: translate(-30px, -20px); }
  to   { transform: translate(30px, 25px); }
}
```

Duration: `12s ease-in-out infinite alternate`

### Implementation

Inline `<style>` tag placed directly before the orb `<div>`, inside the hero `<section>` element. Next.js 16 App Router supports inline `<style>` tags in server components. No additional CSS file changes. The orb `<div>` is rendered inside the hero `<section>` with `position: absolute`.

---

## Feature 2: Landing Page Content Sections

All sections are server component JSX — no `'use client'`, no JS. Inserted after the existing Description section and before the Use Cases section (or appended before the footer — order: Hero → Description → How It Works → Sample Conversation → Features → Use Cases → Privacy → Footer).

### Section Order (full page)

1. Hero (existing)
2. Description (existing)
3. **How It Works** (new)
4. **Sample Conversation** (new)
5. **Expanded Features** (new)
6. Use Cases grid (existing)
7. **Privacy Note** (new)
8. Footer (existing)

### How It Works

Centered, `max-w-2xl`, three numbered steps in a column:

| Step | Icon | Text |
|------|------|------|
| 1 | 🔐 | **Sign in with Google** — Grant calendar access once. No setup required. |
| 2 | 🎙 | **Talk naturally** — Say who, when, and what. No forms, no typing. |
| 3 | ✅ | **Event booked instantly** — Hear confirmation the moment it lands on your calendar. |

Each step: large number (`text-4xl text-white/10`), icon, title (`font-semibold text-white`), description (`text-zinc-400`).

### Sample Conversation

A static mock dialogue styled like the in-app transcript. Glass card (`bg-white/5 border border-white/10 rounded-2xl p-6`), max-width `max-w-xl` centered. Two exchanges:

```
You:  "Schedule a meeting with Sarah tomorrow at 2pm"
AI:   "Got it. I've added 'Meeting with Sarah' to your calendar for tomorrow at 2:00 PM. Anything else?"
```

User bubble: right-aligned, `bg-white/5 border border-white/10 text-zinc-300`
AI bubble: left-aligned, `bg-cyan-950/50 border border-cyan-900/40 text-cyan-100`

Heading above: "See it in action" — `text-2xl text-white`.

### Expanded Features

Two-column grid (`grid-cols-2`, `grid-cols-1` on mobile), six items:

| Icon | Feature |
|------|---------|
| 🎙 | Real-time voice — no typing |
| 🌍 | Timezone-aware scheduling |
| 📅 | Books to your Google Calendar directly |
| ⚡ | Instant audio confirmation |
| 🔒 | Your credentials, your calendar only |
| 📱 | Works on any device with a mic |

Each item: icon + `font-medium text-white` title + `text-zinc-400 text-sm` description. No card border — just a simple two-column list.

Heading: "Everything you need" — `text-2xl text-white`.

### Privacy Note

Slim full-width banner, `border-t border-b border-white/5 py-6`, centered text, `max-w-2xl`:

> 🔒 **Privacy first.** Cerebrocal requests Google Calendar access only to create events on your behalf. We do not read your existing events, store your calendar data, or share anything with third parties.

`text-zinc-400 text-sm`. The `🔒` and bolded intro draw the eye.

---

## Feature 3: AI Transcript Fix

### Root Cause

`useWebRTC.ts:88` checks `c.type === 'audio_transcript'` but the OpenAI Realtime API returns `type: 'audio'` for audio output content items. The transcript text is in `c.transcript`. The existing fallback `contentItem?.text ?? contentItem?.transcript` already handles both fields correctly — only the type check is wrong.

### Fix

```ts
// Before
c.type === 'text' || c.type === 'audio_transcript'

// After
c.type === 'text' || c.type === 'audio'
```

One character change. No other modifications needed in this handler.

---

## Feature 4: Calendar Event Link

### Data Flow

`/api/calendar` already returns `{ success: true, eventId, htmlLink }`. The `htmlLink` is the direct URL to the Google Calendar event. Currently it is only sent back to the AI as function call output for verbal acknowledgement — it is never shown to the user visually.

### Type Change — `lib/types.ts`

Add `'system'` to the `role` union:

```ts
// Before
role: 'user' | 'ai'

// After
role: 'user' | 'ai' | 'system'
```

### Hook Change — `useWebRTC.ts`

Two changes are required:

**1. Update `addMessage` type annotation** — the `addMessage` callback (defined at line 28) accepts `role: 'user' | 'ai'`. This must be widened to `'user' | 'ai' | 'system'` to match the updated `TranscriptMessage.role` union.

**2. Call `addMessage('system', htmlLink)` on success** — inside the `response.function_call_arguments.done` handler, after `calendarResult = await res.json()`, the existing code checks `if (!res.ok)` to handle errors. The system message must only be added on the success path — i.e., in the `else` branch of that check (or equivalently, after confirming `res.ok`):

```ts
calendarResult = await res.json()

if (!res.ok) {
  // existing error handling — unchanged
  const errData = calendarResult as { error?: string }
  const code = errData.error === 'calendar_not_configured'
    ? 'calendar_not_configured'
    : 'calendar_insert_failed'
  setError({ code, message: code === 'calendar_not_configured' ? 'Calendar not configured — see SETUP.md' : 'Booking failed' })
} else {
  // NEW: surface the event link in the transcript
  const result = calendarResult as { success?: boolean; htmlLink?: string }
  if (result.htmlLink) {
    addMessage('system', result.htmlLink)
  }
  // If htmlLink is absent (shouldn't happen on success, but if it does),
  // no link card is shown — the AI's verbal confirmation is still sent below.
}
```

Do not place the `addMessage('system', ...)` call before the `if (!res.ok)` check — that would incorrectly emit a link card even on failed bookings.

### Rendering — `TranscriptPanel.tsx`

Add an early-return guard **before** the existing `<motion.div>` JSX inside `messages.map()`. This is a separate rendering branch — it must return before reaching the existing user/ai bubble JSX, not after it:

```tsx
{messages.map((msg, i) => {
  // ── System message (booking confirmed link card) ──────────────────
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

  // ── User / AI bubbles (existing code unchanged below) ─────────────
  return (
    <motion.div
      key={msg.id}
      ...existing bubble JSX...
    />
  )
})}
```

The card is full-width (not `max-w-[80%]`), no `justify-end`/`justify-start` wrapper — it spans the full transcript width to visually distinguish it from conversation bubbles. The animation props (`initial`, `animate`, `transition`) match the existing bubble animation so the card appears with the same entrance motion.

---

## Testing Strategy

- **Orb:** Visual inspection — orb visible in hero, animates, does not overlap text or intercept clicks
- **Landing sections:** Each section renders with correct content; responsive grid collapses on mobile
- **AI transcript:** Unit test — mock `response.output_item.done` with `content: [{ type: 'audio', transcript: 'hello' }]` → assert `addMessage('ai', 'hello')` called
- **Calendar link:** Unit test — mock successful `/api/calendar` response with `htmlLink` → assert `addMessage('system', htmlLink)` called; render `TranscriptPanel` with a `system` message → assert link renders with correct `href`; mock failed `/api/calendar` response → assert `addMessage('system', ...)` is NOT called
- **TypeScript:** `tsc --noEmit` passes with zero errors after all changes

---

## Design Constraints

- No new dependencies
- All landing page additions are server components (zero client JS added)
- Orb uses inline `<style>` — no globals.css changes
- System message `htmlLink` is a URL — `TranscriptPanel` must use `<a>` with `target="_blank" rel="noopener noreferrer"`

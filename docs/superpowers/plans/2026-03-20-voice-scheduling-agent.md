# Voice Scheduling Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time voice scheduling web app using OpenAI Realtime API (WebRTC) and Google Calendar, with a futuristic animated split-panel UI.

**Architecture:** Two API routes handle backend concerns (OpenAI token generation, Google Calendar insert). Two hooks own runtime logic (useWebRTC manages the full WebRTC lifecycle and data channel; useAudioAnalyzer samples audio amplitude). Three components render UI (AiCore animated orb, TranscriptPanel conversation log, StatusToast errors). page.tsx wires them all together.

**Tech Stack:** Next.js 14 App Router, TypeScript, TailwindCSS, Framer Motion, OpenAI Realtime API (WebRTC + ephemeral tokens), googleapis (JWT), date-fns-tz, Jest + @testing-library/react

**Spec:** `docs/superpowers/specs/2026-03-20-voice-scheduling-agent-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `app/layout.tsx` | Create | Space Grotesk + Geist fonts, global meta |
| `app/globals.css` | Modify | Dark bg `#09090B`, noise overlay, radial gradient anim |
| `app/page.tsx` | Create | `'use client'` — root page, wires hooks + components |
| `app/api/session/route.ts` | Create | POST → OpenAI ephemeral token |
| `app/api/calendar/route.ts` | Create | POST → Google Calendar event insert |
| `components/AiCore.tsx` | Create | `'use client'` — Framer Motion orb state machine |
| `components/TranscriptPanel.tsx` | Create | `'use client'` — staggered AnimatePresence transcript |
| `components/StatusToast.tsx` | Create | `'use client'` — auto-dismiss error toast |
| `hooks/useWebRTC.ts` | Create | `'use client'` — RTCPeerConnection lifecycle + tool dispatch |
| `hooks/useAudioAnalyzer.ts` | Create | `'use client'` — Web Audio API amplitude → 0–1 |
| `lib/types.ts` | Create | Shared TS types, isomorphic |
| `lib/constants.ts` | Create | SYSTEM_PROMPT + CREATE_CALENDAR_EVENT_TOOL definition |
| `.env.example` | Create | Documented env var template |
| `SETUP.md` | Create | Google Calendar service account setup guide |
| `jest.config.ts` | Create | Jest config with next/jest transform |
| `jest.setup.ts` | Create | @testing-library/jest-dom setup |
| `__tests__/api/session.test.ts` | Create | Unit tests for session route logic |
| `__tests__/api/calendar.test.ts` | Create | Unit tests for calendar route logic |
| `__tests__/hooks/useAudioAnalyzer.test.ts` | Create | Unit tests for audio hook |
| `__tests__/components/AiCore.test.tsx` | Create | Render tests for AiCore |
| `__tests__/components/TranscriptPanel.test.tsx` | Create | Render tests for TranscriptPanel |
| `__tests__/components/StatusToast.test.tsx` | Create | Render tests for StatusToast |

---

## Task 1: Project Scaffold, Dependencies, and Global Styles

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Create: `next.config.ts` (verify Vercel-compatible)

- [ ] **Step 1: Scaffold Next.js project**

Run inside `/Users/bbkrm./Desktop/codeprojects/cerebrocal`:

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --use-npm \
  --no-eslint
```

When prompted about existing files (README, git), choose to overwrite/keep as needed. Accept all other defaults.

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install framer-motion clsx tailwind-merge lucide-react googleapis date-fns date-fns-tz geist
```

- [ ] **Step 3: Install dev dependencies for testing**

```bash
npm install --save-dev jest @types/jest jest-environment-jsdom \
  @testing-library/react @testing-library/jest-dom @testing-library/user-event \
  ts-jest
```

- [ ] **Step 4: Create `jest.config.ts`**

```ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)
```

- [ ] **Step 5: Create `jest.setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 6: Add test script to `package.json`**

In `package.json`, ensure the scripts block includes:
```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch"
}
```

- [ ] **Step 7: Update `app/layout.tsx` with fonts**

Replace the full file:

```tsx
import type { Metadata } from 'next'
import { Space_Grotesk } from 'next/font/google'
import { GeistSans } from 'geist/font/sans'
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
      <body className="antialiased">{children}</body>
    </html>
  )
}
```

Note: `geist` is bundled with Next.js. If `geist/font/sans` import fails, install: `npm install geist`

- [ ] **Step 8: Replace `app/globals.css` with dark base + noise overlay**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-space-grotesk: 'Space Grotesk', sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body {
  height: 100%;
  background-color: #09090b;
  color: #ffffff;
  font-family: var(--font-geist-sans, 'Inter', sans-serif);
}

/* Moving radial gradient background */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 60% at 20% 50%, rgba(124, 58, 237, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 60% 80% at 80% 30%, rgba(6, 182, 212, 0.06) 0%, transparent 60%);
  animation: gradientShift 8s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: 0;
}

@keyframes gradientShift {
  0% { opacity: 0.6; transform: scale(1) translateY(0); }
  100% { opacity: 1; transform: scale(1.05) translateY(-2%); }
}

/* CSS noise overlay */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
  background-size: 200px 200px;
  opacity: 0.035;
  pointer-events: none;
  z-index: 1;
}

/* Content sits above overlays */
#__next,
main {
  position: relative;
  z-index: 2;
}
```

- [ ] **Step 9: Verify the app runs**

```bash
npm run dev
```

Open http://localhost:3000. Should show Next.js default page on dark background. No errors in console. Stop server with Ctrl+C.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with deps, fonts, dark base styles"
```

---

## Task 2: Shared Types and Constants

**Files:**
- Create: `lib/types.ts`
- Create: `lib/constants.ts`

- [ ] **Step 1: Create `lib/types.ts`**

```ts
export type SessionStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'processing'

export interface TranscriptMessage {
  id: string       // crypto.randomUUID()
  role: 'user' | 'ai'
  content: string
  timestamp: number // Date.now()
}

export interface AppError {
  code:
    | 'mic_denied'
    | 'token_fetch_failed'
    | 'ice_dropped'
    | 'calendar_not_configured'
    | 'calendar_insert_failed'
  message: string
  retry?: () => void // if present, toast shows a retry button
}
```

- [ ] **Step 2: Create `lib/constants.ts`**

```ts
export const SYSTEM_PROMPT = `You are a futuristic, ultra-efficient AI scheduling concierge. Your tone is warm, professional, and concise.
1. Greet the user warmly and ask how you can help.
2. Collect naturally in conversation: User's Name, Preferred Date, Preferred Time, Optional Meeting Title.
3. Confirm the details concisely before booking.
4. Use the create_calendar_event tool to book the meeting.
5. Inform the user of the successful booking or any error.`

export const CREATE_CALENDAR_EVENT_TOOL = {
  type: 'function',
  name: 'create_calendar_event',
  description: 'Creates a 30-minute Google Calendar event for the user.',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: "The user's full name (used as event attendee label)",
      },
      date: {
        type: 'string',
        description: 'Event date in YYYY-MM-DD format',
      },
      time: {
        type: 'string',
        description: "Event start time in HH:MM 24h format (user's local time)",
      },
      title: {
        type: 'string',
        description:
          "Meeting title/summary. Defaults to 'Meeting with {name}' if omitted.",
      },
    },
    required: ['name', 'date', 'time'],
  },
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/constants.ts
git commit -m "feat: add shared types and agent constants"
```

---

## Task 3: `/api/session` Route (TDD)

**Files:**
- Create: `app/api/session/route.ts`
- Create: `__tests__/api/session.test.ts`

The route calls OpenAI to get an ephemeral token, extracts `client_secret.value`, and returns `{ token }`. Extract the fetch logic into a testable helper.

- [ ] **Step 1: Create the test file**

Create `__tests__/api/session.test.ts`:

```ts
// We test the business logic function, not the Route Handler directly.
// The Route Handler is a thin wrapper — if the logic is correct, the route is correct.

const mockFetch = jest.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  process.env.OPENAI_API_KEY = 'sk-test-key'
})

afterEach(() => {
  delete process.env.OPENAI_API_KEY
})

describe('createOpenAISession', () => {
  it('returns the ephemeral token from client_secret.value', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ client_secret: { value: 'eph_abc123' } }),
    })

    const { createOpenAISession } = await import('@/app/api/session/logic')
    const token = await createOpenAISession()

    expect(token).toBe('eph_abc123')
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.openai.com/v1/realtime/sessions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk-test-key',
        }),
      })
    )
  })

  it('throws when OpenAI returns a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: { message: 'invalid key' } }),
    })

    const { createOpenAISession } = await import('@/app/api/session/logic')
    await expect(createOpenAISession()).rejects.toThrow('openai_session_failed')
  })
})
```

- [ ] **Step 2: Run test — expect it to fail (module not found)**

```bash
npx jest __tests__/api/session.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/api/session/logic'`

- [ ] **Step 3: Create `app/api/session/logic.ts`**

```ts
import { SYSTEM_PROMPT, CREATE_CALENDAR_EVENT_TOOL } from '@/lib/constants'

export async function createOpenAISession(): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview',
      voice: 'alloy',
      instructions: SYSTEM_PROMPT,
      tools: [CREATE_CALENDAR_EVENT_TOOL],
      tool_choice: 'auto',
      input_audio_transcription: { model: 'whisper-1' },
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(`openai_session_failed: ${data?.error?.message ?? 'unknown'}`)
  }

  return data.client_secret.value
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/api/session.test.ts --no-coverage
```

Expected: PASS (2 tests)

- [ ] **Step 5: Create `app/api/session/route.ts`**

```ts
import { NextResponse } from 'next/server'
import { createOpenAISession } from './logic'

export async function POST() {
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

- [ ] **Step 6: Commit**

```bash
git add app/api/session/ __tests__/api/session.test.ts
git commit -m "feat: add /api/session route with OpenAI ephemeral token"
```

---

## Task 4: `/api/calendar` Route (TDD)

**Files:**
- Create: `app/api/calendar/route.ts`
- Create: `app/api/calendar/logic.ts`
- Create: `__tests__/api/calendar.test.ts`

- [ ] **Step 1: Create the test file**

Create `__tests__/api/calendar.test.ts`:

```ts
// Mock googleapis before importing logic
jest.mock('googleapis', () => {
  const mockInsert = jest.fn()
  return {
    google: {
      auth: {
        JWT: jest.fn().mockImplementation(() => ({ authorize: jest.fn() })),
      },
      calendar: jest.fn().mockReturnValue({
        events: { insert: mockInsert },
      }),
    },
    __mockInsert: mockInsert,
  }
})

const { __mockInsert } = jest.requireMock('googleapis') as {
  __mockInsert: jest.Mock
}

beforeEach(() => {
  __mockInsert.mockReset()
  process.env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    type: 'service_account',
    client_email: 'test@test.iam.gserviceaccount.com',
    private_key: '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
  })
  process.env.GOOGLE_CALENDAR_ID = 'primary'
})

afterEach(() => {
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  delete process.env.GOOGLE_CALENDAR_ID
})

describe('createCalendarEvent', () => {
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
    })

    expect(result.success).toBe(true)
    expect(result.eventId).toBe('evt_123')
    expect(__mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
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
    })

    expect(__mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        requestBody: expect.objectContaining({ summary: 'Product Review' }),
      })
    )
  })

  it('throws calendar_not_configured when env var is missing', async () => {
    delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    const { createCalendarEvent } = await import('@/app/api/calendar/logic')
    await expect(
      createCalendarEvent({ name: 'X', date: '2026-01-01', time: '09:00' })
    ).rejects.toThrow('calendar_not_configured')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/api/calendar.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/api/calendar/logic'`

- [ ] **Step 3: Create `app/api/calendar/logic.ts`**

```ts
import { google } from 'googleapis'
import { fromZonedTime } from 'date-fns-tz'

interface CalendarEventInput {
  name: string
  date: string        // YYYY-MM-DD
  time: string        // HH:MM 24h
  title?: string
  timezone?: string   // IANA, e.g. "America/Chicago"
}

interface CalendarEventResult {
  success: true
  eventId: string
  htmlLink: string
}

export async function createCalendarEvent(
  input: CalendarEventInput
): Promise<CalendarEventResult> {
  const { name, date, time, title, timezone = 'UTC' } = input

  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    throw new Error('calendar_not_configured')
  }

  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON)

  const auth = new google.auth.JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })

  // Pass bare local-time string — do NOT wrap in new Date() first
  // (that would parse as UTC on Vercel, compounding the offset)
  const startUtc = fromZonedTime(`${date}T${time}:00`, timezone)
  const endUtc = new Date(startUtc.getTime() + 30 * 60 * 1000)

  const calendar = google.calendar({ version: 'v3', auth })
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? 'primary'

  const res = await calendar.events.insert({
    calendarId,
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

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/api/calendar.test.ts --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Create `app/api/calendar/route.ts`**

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createCalendarEvent } from './logic'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, date, time, title, timezone } = body

  if (!name || !date || !time) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  try {
    const result = await createCalendarEvent({ name, date, time, title, timezone })
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'

    if (message === 'calendar_not_configured') {
      return NextResponse.json(
        {
          error: 'calendar_not_configured',
          setup: 'Set GOOGLE_SERVICE_ACCOUNT_JSON in env vars. See SETUP.md.',
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'insert_failed', detail: message },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add app/api/calendar/ __tests__/api/calendar.test.ts
git commit -m "feat: add /api/calendar route with Google Calendar JWT insert"
```

---

## Task 5: `useAudioAnalyzer` Hook (TDD)

**Files:**
- Create: `hooks/useAudioAnalyzer.ts`
- Create: `__tests__/hooks/useAudioAnalyzer.test.ts`

- [ ] **Step 1: Create the test file**

Create `__tests__/hooks/useAudioAnalyzer.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'

// Mock Web Audio API
const mockGetByteFrequencyData = jest.fn((arr: Uint8Array) => {
  arr.fill(128) // simulate mid-level audio
})
const mockConnect = jest.fn()
const mockDisconnect = jest.fn()
const mockClose = jest.fn()
const mockCreateAnalyser = jest.fn(() => ({
  fftSize: 256,
  frequencyBinCount: 128,
  getByteFrequencyData: mockGetByteFrequencyData,
  connect: mockConnect,
}))
const mockCreateMediaStreamSource = jest.fn(() => ({
  connect: mockConnect,
  disconnect: mockDisconnect,
}))

global.AudioContext = jest.fn().mockImplementation(() => ({
  createAnalyser: mockCreateAnalyser,
  createMediaStreamSource: mockCreateMediaStreamSource,
  close: mockClose,
  state: 'running',
})) as unknown as typeof AudioContext

// Mock requestAnimationFrame to run callback once immediately
let rafCallback: FrameRequestCallback | null = null
global.requestAnimationFrame = jest.fn((cb) => {
  rafCallback = cb
  return 1
}) as unknown as typeof requestAnimationFrame
global.cancelAnimationFrame = jest.fn()

function makeStream(): MediaStream {
  return {} as MediaStream
}

describe('useAudioAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    rafCallback = null
  })

  it('returns amplitude 0 when stream is null', () => {
    const { result } = renderHook(() => useAudioAnalyzer(null))
    expect(result.current.amplitude).toBe(0)
    expect(global.AudioContext).not.toHaveBeenCalled()
  })

  it('creates AudioContext and starts RAF loop when stream is provided', () => {
    const stream = makeStream()
    const { result } = renderHook(() => useAudioAnalyzer(stream))

    expect(global.AudioContext).toHaveBeenCalledTimes(1)
    expect(mockCreateAnalyser).toHaveBeenCalledTimes(1)
    expect(global.requestAnimationFrame).toHaveBeenCalled()
  })

  it('closes AudioContext when stream becomes null', () => {
    const stream = makeStream()
    const { rerender } = renderHook(
      ({ s }: { s: MediaStream | null }) => useAudioAnalyzer(s),
      { initialProps: { s: stream } }
    )

    rerender({ s: null })
    expect(mockClose).toHaveBeenCalled()
    expect(global.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('closes AudioContext on unmount', () => {
    const stream = makeStream()
    const { unmount } = renderHook(() => useAudioAnalyzer(stream))
    unmount()
    expect(mockClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/hooks/useAudioAnalyzer.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/hooks/useAudioAnalyzer'`

- [ ] **Step 3: Create `hooks/useAudioAnalyzer.ts`**

```ts
'use client'

import { useEffect, useRef, useState } from 'react'

export function useAudioAnalyzer(stream: MediaStream | null): { amplitude: number } {
  const [amplitude, setAmplitude] = useState(0)
  const rafRef = useRef<number | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!stream) {
      setAmplitude(0)
      return
    }

    const audioCtx = new AudioContext()
    ctxRef.current = audioCtx

    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256

    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteFrequencyData(dataArray)

      // Compute RMS, normalize to 0–1
      const sum = dataArray.reduce((acc, v) => acc + v * v, 0)
      const rms = Math.sqrt(sum / dataArray.length)
      setAmplitude(Math.min(rms / 128, 1))

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      audioCtx.close()
      ctxRef.current = null
    }
  }, [stream])

  return { amplitude }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/hooks/useAudioAnalyzer.test.ts --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add hooks/useAudioAnalyzer.ts __tests__/hooks/useAudioAnalyzer.test.ts
git commit -m "feat: add useAudioAnalyzer hook with Web Audio API amplitude sampling"
```

---

## Task 6: `AiCore` Component (TDD)

**Files:**
- Create: `components/AiCore.tsx`
- Create: `__tests__/components/AiCore.test.tsx`

The orb uses Framer Motion `animate` to drive scale and box-shadow per state. Background gradient changes via className. Amplitude drives scale during `speaking` state.

- [ ] **Step 1: Create the test file**

Create `__tests__/components/AiCore.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { AiCore } from '@/components/AiCore'

// Framer Motion fires real animations in tests — this mock renders children without animation
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('AiCore', () => {
  it('renders without crashing for all status values', () => {
    const statuses = ['idle', 'connecting', 'listening', 'speaking', 'processing'] as const
    for (const status of statuses) {
      const { unmount } = render(<AiCore status={status} amplitude={0} />)
      // Should render an orb element
      expect(document.querySelector('[data-testid="ai-core-orb"]')).toBeTruthy()
      unmount()
    }
  })

  it('renders the connecting spinner ring when status is connecting', () => {
    render(<AiCore status="connecting" amplitude={0} />)
    expect(document.querySelector('[data-testid="connecting-ring"]')).toBeTruthy()
  })

  it('does not render connecting ring for other states', () => {
    render(<AiCore status="listening" amplitude={0} />)
    expect(document.querySelector('[data-testid="connecting-ring"]')).toBeNull()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/components/AiCore.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/AiCore'`

- [ ] **Step 3: Create `components/AiCore.tsx`**

```tsx
'use client'

import { motion } from 'framer-motion'
import { SessionStatus } from '@/lib/types'

interface AiCoreProps {
  status: SessionStatus
  amplitude: number // 0–1
}

const orbVariants = {
  idle: {
    scale: [1, 1.04, 1], // array triggers the breathing animation
    boxShadow: '0 0 20px rgba(100, 100, 120, 0.2)',
  },
  connecting: {
    scale: 1,
    boxShadow: '0 0 20px rgba(251, 191, 36, 0.25)',
  },
  listening: {
    scale: [1, 1.08, 1],
    boxShadow: [
      '0 0 30px rgba(34, 211, 238, 0.4), 0 0 60px rgba(124, 58, 237, 0.2)',
      '0 0 50px rgba(34, 211, 238, 0.6), 0 0 80px rgba(124, 58, 237, 0.35)',
      '0 0 30px rgba(34, 211, 238, 0.4), 0 0 60px rgba(124, 58, 237, 0.2)',
    ],
  },
  speaking: {
    scale: 1, // overridden inline via amplitude
    boxShadow: '0 0 50px rgba(168, 85, 247, 0.5), 0 0 90px rgba(6, 182, 212, 0.3)',
  },
  processing: {
    scale: 1,
    boxShadow: '0 0 30px rgba(22, 163, 74, 0.4), 0 0 60px rgba(13, 148, 136, 0.2)',
  },
}

const orbTransitions: Record<SessionStatus, object> = {
  idle: { duration: 4, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
  connecting: { duration: 0.3 },
  listening: { duration: 1, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' },
  speaking: { duration: 0.1 },
  processing: { duration: 0.3 },
}

const gradientClass: Record<SessionStatus, string> = {
  idle: 'bg-gradient-to-br from-zinc-700 via-purple-900 to-zinc-900',
  connecting: 'bg-gradient-to-br from-amber-800 via-orange-900 to-zinc-900',
  listening: 'bg-gradient-to-br from-cyan-500 via-purple-600 to-zinc-900',
  speaking: 'bg-gradient-to-br from-purple-500 via-cyan-500 to-zinc-900',
  processing: 'bg-gradient-to-br from-green-600 via-teal-700 to-zinc-900',
}

const borderRadiusForProcessing = [
  '50%',
  '40% 60% 60% 40% / 60% 40% 60% 40%',
  '60% 40% 40% 60% / 40% 60% 40% 60%',
  '50%',
]

export function AiCore({ status, amplitude }: AiCoreProps) {
  const speakingScale = status === 'speaking' ? 1 + amplitude * 0.3 : undefined

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full opacity-20 blur-2xl bg-purple-500" />

      {/* Connecting spinner ring */}
      {status === 'connecting' && (
        <div
          data-testid="connecting-ring"
          className="absolute inset-[-4px] rounded-full border-2 border-transparent"
          style={{
            background:
              'conic-gradient(from 0deg, #f59e0b 0%, #f59e0b 30%, transparent 60%) border-box',
            animation: 'spin 1s linear infinite',
          }}
        />
      )}

      {/* Processing border-radius morph overlay */}
      {status === 'processing' && (
        <motion.div
          className="absolute inset-0 bg-green-500 opacity-10"
          animate={{ borderRadius: borderRadiusForProcessing }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Main orb */}
      <motion.div
        data-testid="ai-core-orb"
        className={`w-36 h-36 rounded-full ${gradientClass[status]}`}
        animate={
          speakingScale !== undefined
            ? { scale: speakingScale, ...orbVariants[status] }
            : orbVariants[status]
        }
        transition={orbTransitions[status]}
      />
    </div>
  )
}
```

Add the `spin` keyframe to `globals.css`:
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/components/AiCore.test.tsx --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/AiCore.tsx __tests__/components/AiCore.test.tsx app/globals.css
git commit -m "feat: add AiCore animated orb component with Framer Motion state machine"
```

---

## Task 7: `TranscriptPanel` Component (TDD)

**Files:**
- Create: `components/TranscriptPanel.tsx`
- Create: `__tests__/components/TranscriptPanel.test.tsx`

- [ ] **Step 1: Create the test file**

Create `__tests__/components/TranscriptPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { TranscriptPanel } from '@/components/TranscriptPanel'
import { TranscriptMessage } from '@/lib/types'

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const makeMsg = (role: 'user' | 'ai', content: string): TranscriptMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  timestamp: Date.now(),
})

describe('TranscriptPanel', () => {
  it('shows the pre-session explainer when isActive is false', () => {
    render(<TranscriptPanel messages={[]} isActive={false} />)
    expect(screen.getByText(/speak naturally/i)).toBeInTheDocument()
  })

  it('shows messages when isActive is true', () => {
    const messages = [makeMsg('ai', 'Hello, how can I help?'), makeMsg('user', 'Schedule a meeting')]
    render(<TranscriptPanel messages={messages} isActive={true} />)
    expect(screen.getByText('Hello, how can I help?')).toBeInTheDocument()
    expect(screen.getByText('Schedule a meeting')).toBeInTheDocument()
  })

  it('does not show explainer when isActive is true', () => {
    render(<TranscriptPanel messages={[]} isActive={true} />)
    expect(screen.queryByText(/speak naturally/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/components/TranscriptPanel.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/TranscriptPanel'`

- [ ] **Step 3: Create `components/TranscriptPanel.tsx`**

```tsx
'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { TranscriptMessage } from '@/lib/types'

interface TranscriptPanelProps {
  messages: TranscriptMessage[]
  isActive: boolean
}

export function TranscriptPanel({ messages, isActive }: TranscriptPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
          <span className="text-2xl">🎙</span>
        </div>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Speak naturally to schedule a meeting.
          <br />
          The AI concierge will guide you.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto px-6 py-4 gap-3 scrollbar-hide">
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
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
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/components/TranscriptPanel.test.tsx --no-coverage
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add components/TranscriptPanel.tsx __tests__/components/TranscriptPanel.test.tsx
git commit -m "feat: add TranscriptPanel with staggered AnimatePresence messages"
```

---

## Task 8: `StatusToast` Component (TDD)

**Files:**
- Create: `components/StatusToast.tsx`
- Create: `__tests__/components/StatusToast.test.tsx`

- [ ] **Step 1: Create the test file**

Create `__tests__/components/StatusToast.test.tsx`:

```tsx
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusToast } from '@/components/StatusToast'
import { AppError } from '@/lib/types'

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const makeError = (overrides: Partial<AppError> = {}): AppError => ({
  code: 'token_fetch_failed',
  message: "Couldn't connect — check your API key",
  ...overrides,
})

describe('StatusToast', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('renders nothing when error is null', () => {
    const { container } = render(<StatusToast error={null} onDismiss={jest.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the error message', () => {
    render(<StatusToast error={makeError()} onDismiss={jest.fn()} />)
    expect(screen.getByText(/couldn't connect/i)).toBeInTheDocument()
  })

  it('calls onDismiss after 5 seconds', () => {
    const onDismiss = jest.fn()
    render(<StatusToast error={makeError()} onDismiss={onDismiss} />)
    act(() => jest.advanceTimersByTime(5000))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when dismiss button is clicked', async () => {
    const onDismiss = jest.fn()
    render(<StatusToast error={makeError()} onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders retry button when error.retry is defined', async () => {
    const retry = jest.fn()
    const onDismiss = jest.fn()
    render(<StatusToast error={makeError({ retry })} onDismiss={onDismiss} />)
    const retryBtn = screen.getByRole('button', { name: /retry/i })
    await userEvent.click(retryBtn)
    expect(retry).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx jest __tests__/components/StatusToast.test.tsx --no-coverage
```

Expected: FAIL — `Cannot find module '@/components/StatusToast'`

- [ ] **Step 3: Create `components/StatusToast.tsx`**

```tsx
'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { AppError } from '@/lib/types'

interface StatusToastProps {
  error: AppError | null
  onDismiss: () => void
}

export function StatusToast({ error, onDismiss }: StatusToastProps) {
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(onDismiss, 5000)
    return () => clearTimeout(timer)
  }, [error, onDismiss])

  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 80 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 80 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl max-w-sm">
            <p className="text-sm text-zinc-300 flex-1">{error.message}</p>

            {error.retry && (
              <button
                aria-label="Retry"
                onClick={() => { error.retry!(); onDismiss() }}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-medium shrink-0"
              >
                Retry
              </button>
            )}

            <button
              aria-label="Dismiss"
              onClick={onDismiss}
              className="text-zinc-500 hover:text-zinc-300 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx jest __tests__/components/StatusToast.test.tsx --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add components/StatusToast.tsx __tests__/components/StatusToast.test.tsx
git commit -m "feat: add StatusToast with auto-dismiss and retry support"
```

---

## Task 9: `useWebRTC` Hook

**Files:**
- Create: `hooks/useWebRTC.ts`

This hook is heavy on browser APIs (RTCPeerConnection, getUserMedia, MediaStream). Unit testing would require extensive mocking that provides little value over integration testing. We write the implementation and verify it manually in Task 10.

- [ ] **Step 1: Create `hooks/useWebRTC.ts`**

```ts
'use client'

import { useCallback, useRef, useState } from 'react'
import { SessionStatus, TranscriptMessage, AppError } from '@/lib/types'

export interface UseWebRTCReturn {
  status: SessionStatus
  transcript: TranscriptMessage[]
  error: AppError | null
  remoteStream: MediaStream | null
  connect: () => Promise<void>
  disconnect: () => void
}

export function useWebRTC(): UseWebRTCReturn {
  const [status, setStatus] = useState<SessionStatus>('idle')
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([])
  const [error, setError] = useState<AppError | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // Use a ref to avoid stale closure when connect is referenced inside retry callbacks
  const connectRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const addMessage = useCallback((role: 'user' | 'ai', content: string) => {
    setTranscript((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content, timestamp: Date.now() },
    ])
  }, [])

  // Safe send — waits for data channel to open
  const sendWhenOpen = useCallback((msg: string) => {
    const dc = dcRef.current
    if (!dc) return
    if (dc.readyState === 'open') {
      dc.send(msg)
    } else {
      dc.addEventListener('open', () => dc.send(msg), { once: true })
    }
  }, [])

  const handleDataChannelMessage = useCallback(
    async (event: MessageEvent) => {
      const msg = JSON.parse(event.data)

      switch (msg.type) {
        case 'session.created': {
          sendWhenOpen(
            JSON.stringify({
              type: 'response.create',
              response: {
                modalities: ['audio', 'text'],
                instructions:
                  'Greet the user warmly and ask how you can help schedule a meeting.',
              },
            })
          )
          setStatus('listening')
          break
        }

        case 'conversation.item.input_audio_transcription.completed': {
          if (msg.transcript) addMessage('user', msg.transcript)
          break
        }

        case 'response.audio.delta': {
          setStatus('speaking')
          break
        }

        case 'response.output_item.done': {
          // Only handle message items — not function_call items
          if (msg.item?.type !== 'message') break
          const text = msg.item.content?.find(
            (c: { type: string; text?: string }) => c.type === 'text'
          )?.text
          if (text) addMessage('ai', text)
          setStatus('listening')
          break
        }

        case 'response.function_call_arguments.done': {
          // msg.name = function name ("create_calendar_event")
          // msg.call_id = correlation ID
          // msg.arguments = JSON string with user's scheduling details
          const args = JSON.parse(msg.arguments) as {
            name: string
            date: string
            time: string
            title?: string
          }

          setStatus('processing')

          let calendarResult: object
          try {
            const res = await fetch('/api/calendar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...args,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }),
            })
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
            }
          } catch {
            calendarResult = { success: false, error: 'network_error' }
            setError({ code: 'calendar_insert_failed', message: 'Booking failed' })
          }

          // Send result back so AI can verbally acknowledge
          sendWhenOpen(
            JSON.stringify({
              type: 'conversation.item.create',
              item: {
                type: 'function_call_output',
                call_id: msg.call_id,
                output: JSON.stringify(calendarResult),
              },
            })
          )
          sendWhenOpen(
            JSON.stringify({
              type: 'response.create',
              response: { modalities: ['audio', 'text'] },
            })
          )
          setStatus('speaking')
          break
        }
      }
    },
    [addMessage, sendWhenOpen]
  )

  const connect = useCallback(async () => {
    connectRef.current = connect // keep ref in sync so retry callbacks never go stale
    setError(null)
    setStatus('connecting')

    // 1. Get ephemeral token
    let token: string
    try {
      const res = await fetch('/api/session', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? 'fetch failed')
      token = data.token
    } catch (err) {
      setStatus('idle')
      setError({
        code: 'token_fetch_failed',
        message: "Couldn't connect — check your API key",
        // Use ref to avoid stale closure — connectRef.current always points to latest connect
        retry: () => connectRef.current(),
      })
      return
    }

    // 2. Get microphone
    let micStream: MediaStream
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setStatus('idle')
      setError({ code: 'mic_denied', message: 'Microphone access required' })
      return
    }

    // 3. Create peer connection
    const pc = new RTCPeerConnection()
    pcRef.current = pc

    // Hidden audio element for AI voice output
    if (!audioRef.current) {
      audioRef.current = document.createElement('audio')
      audioRef.current.autoplay = true
      document.body.appendChild(audioRef.current)
    }

    pc.ontrack = (event) => {
      const stream = event.streams[0]
      if (audioRef.current) audioRef.current.srcObject = stream
      setRemoteStream(stream)
    }

    // Add mic track
    micStream.getTracks().forEach((track) => pc.addTrack(track, micStream))

    // Data channel MUST be created before setLocalDescription
    const dc = pc.createDataChannel('oai-events')
    dcRef.current = dc
    dc.onmessage = handleDataChannelMessage

    // ICE failure handling
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        setStatus('idle')
        setRemoteStream(null)
        setError({
          code: 'ice_dropped',
          message: 'Connection lost — session ended',
          retry: () => connectRef.current(),
        })
      }
    }

    // 4. SDP offer/answer
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const sdpRes = await fetch(
      `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/sdp',
        },
        body: pc.localDescription!.sdp,
      }
    )

    const answerSdp = await sdpRes.text()
    await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
  }, [handleDataChannelMessage])

  const disconnect = useCallback(() => {
    dcRef.current?.close()
    pcRef.current?.close()
    pcRef.current = null
    dcRef.current = null
    setRemoteStream(null)
    setStatus('idle')
    setTranscript([])
  }, [])

  return { status, transcript, error, remoteStream, connect, disconnect }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add hooks/useWebRTC.ts
git commit -m "feat: add useWebRTC hook with RTCPeerConnection, data channel, and tool dispatch"
```

---

## Task 10: `page.tsx` Assembly

**Files:**
- Modify: `app/page.tsx`

Wire all hooks and components together into the split-panel layout.

- [ ] **Step 1: Replace `app/page.tsx` entirely**

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

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run the development server and verify the UI**

```bash
npm run dev
```

Open http://localhost:3000. Verify:
- Dark background with noise texture visible
- Left panel shows "Cerebrocal" heading, idle orb (dim grey/purple, slow pulse), "Ready" label, "Initialize Session" button
- Right panel shows "Conversation" header and pre-session explainer text
- Clicking "Initialize Session" should trigger mic permission prompt (even without env vars set)

Stop server with Ctrl+C.

- [ ] **Step 4: Run all tests**

```bash
npm test -- --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx
git commit -m "feat: assemble main page with split-panel layout, hooks, and components"
```

---

## Task 11: Environment Files, Setup Guide, and `.gitignore`

**Files:**
- Create: `.env.example`
- Create: `SETUP.md`
- Modify: `.gitignore`

- [ ] **Step 1: Create `.env.example`**

```bash
# .env.example — copy to .env.local and fill in values

# ─── OpenAI ───────────────────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...

# ─── Google Calendar ──────────────────────────────────────────────────────────
#
# Stringify your service account JSON key to a SINGLE LINE:
#   python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" < service-account.json
#
# IMPORTANT — private_key \n handling:
#   ✅ .env.local: paste the stringified output directly
#   ✅ Vercel dashboard: paste the stringified output directly
#      (Vercel does NOT interpret \n, so JSON.parse handles them correctly)
#   ❌ Do NOT manually replace \\n with real newlines — that breaks PEM format
#
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"my-project","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n","client_email":"my-sa@my-project.iam.gserviceaccount.com","token_uri":"https://oauth2.googleapis.com/token"}

# "primary" writes to the service account's own calendar.
# To write to your personal calendar: share it with the client_email above (Editor role),
# then set this to that calendar's ID (Google Calendar → Settings → Integrate calendar).
GOOGLE_CALENDAR_ID=primary
```

- [ ] **Step 2: Create `SETUP.md`**

```markdown
# Google Calendar Setup

Follow these steps to connect Cerebrocal to your Google Calendar.

## 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services → Library**
4. Search for **Google Calendar API** and click **Enable**

## 2. Create a Service Account

1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → Service Account**
3. Give it a name (e.g. `cerebrocal-calendar`)
4. Click **Done** (no special roles needed at this step)
5. Click the service account you just created
6. Go to the **Keys** tab → **Add Key → Create new key → JSON**
7. Download the JSON key file

## 3. Share Your Calendar with the Service Account

1. Open [Google Calendar](https://calendar.google.com/)
2. Find the calendar you want to use in the left sidebar
3. Click the three dots → **Settings and sharing**
4. Scroll to **Share with specific people or groups**
5. Add the `client_email` from your JSON key file (e.g. `my-sa@my-project.iam.gserviceaccount.com`)
6. Set permission to **Make changes to events** (Editor)
7. Click **Send**

## 4. Set Environment Variables

Stringify the JSON key to a single line:

```bash
python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" < service-account.json
```

Copy the output. Then:

**For local development** — add to `.env.local`:
```
GOOGLE_SERVICE_ACCOUNT_JSON=<paste stringified output here>
GOOGLE_CALENDAR_ID=primary
```

**For Vercel** — go to your project → Settings → Environment Variables:
- `GOOGLE_SERVICE_ACCOUNT_JSON` = paste stringified output
- `GOOGLE_CALENDAR_ID` = `primary` (or your specific calendar ID)

> ⚠️ Do NOT manually replace `\\n` with real newlines. The stringified JSON handles this correctly.

## 5. Find Your Calendar ID (optional)

If you want to write to a specific calendar (not `primary`):
1. Go to Google Calendar → click the calendar name → **Settings and sharing**
2. Scroll to **Integrate calendar**
3. Copy the **Calendar ID** (looks like `abc123@group.calendar.google.com`)
4. Set `GOOGLE_CALENDAR_ID` to that value
```

- [ ] **Step 3: Update `.gitignore`**

Add these lines to the existing `.gitignore` (create-next-app will have already created one — append at the bottom):

```
# Env secrets
.env.local
.env.*.local

# Brainstorm mockups
.superpowers/

# Google service account key (if accidentally downloaded here)
*.json
!package.json
!package-lock.json
!tsconfig.json
!jest.config.ts
```

- [ ] **Step 4: Final test run**

```bash
npm test -- --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Final commit**

```bash
git add .env.example SETUP.md .gitignore
git commit -m "docs: add env example, Google Calendar setup guide, and gitignore"
```

---

## Verification Checklist

Before calling this done, manually verify:

- [ ] `npm run dev` starts without errors
- [ ] Page renders dark background with noise overlay
- [ ] Orb is visible and pulsing in idle state
- [ ] "Initialize Session" prompts for mic permission
- [ ] With `OPENAI_API_KEY` set in `.env.local`: session connects and AI greets you
- [ ] Speech appears in transcript panel (both user and AI)
- [ ] Orb changes color/behavior with each state
- [ ] With Google Calendar credentials set: AI books an event and confirms
- [ ] Without calendar credentials: toast appears with setup message
- [ ] Disconnecting returns UI to idle state

---

## Deployment to Vercel

1. Push repo to GitHub
2. Import in [vercel.com/new](https://vercel.com/new)
3. Add environment variables in project Settings → Environment Variables:
   - `OPENAI_API_KEY`
   - `GOOGLE_SERVICE_ACCOUNT_JSON`
   - `GOOGLE_CALENDAR_ID`
4. Deploy — zero config needed (Next.js auto-detected)

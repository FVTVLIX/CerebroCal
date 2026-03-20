# Voice Scheduling Agent — Design Spec
**Date:** 2026-03-20
**Status:** Approved

---

## Overview

A real-time, voice-driven web application that conducts a natural conversation with the user, collects scheduling details, and creates a Google Calendar event. The UI centers on an animated "AI Core" orb that reacts to session state and live audio amplitude. A split-panel layout shows the orb on the left and a live conversation transcript on the right.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14+ (App Router) |
| Styling | TailwindCSS + tailwind-merge + clsx |
| Animations | Framer Motion |
| Typography | Space Grotesk (headings), Geist (UI text) via next/font |
| Voice API | OpenAI Realtime API (WebRTC + ephemeral tokens) |
| Calendar API | Google Calendar API via `googleapis` (JWT service account) |
| Deployment | Vercel (serverless-compatible) |
| Icons | lucide-react |

---

## File Structure

```
cerebrocal/
├── app/
│   ├── layout.tsx              # Font imports, global meta, noise overlay
│   ├── globals.css             # Dark bg (#09090B), noise texture, base resets
│   ├── page.tsx                # 'use client' — root page, wires hooks + components
│   └── api/
│       ├── session/route.ts    # POST → OpenAI ephemeral token (server-only)
│       └── calendar/route.ts   # POST → Google Calendar event insert (server-only)
├── components/
│   ├── AiCore.tsx              # 'use client' — animated orb, Framer Motion state machine
│   ├── TranscriptPanel.tsx     # 'use client' — staggered fade-in message list
│   └── StatusToast.tsx         # 'use client' — error/info notifications
├── hooks/
│   ├── useWebRTC.ts            # 'use client' — RTCPeerConnection, data channel, tool dispatch
│   └── useAudioAnalyzer.ts     # 'use client' — Web Audio API, amplitude → 0–1 float
├── lib/
│   └── types.ts                # Shared TS types (no browser APIs — safe for server import)
├── .env.local                  # Secret keys (gitignored)
└── .env.example                # Documented setup template
```

**Client/Server boundary:** All components, hooks, and `page.tsx` carry `'use client'` at the top. API route files (`route.ts`) are server-only and never import client modules. `lib/types.ts` is isomorphic.

---

## Shared Types (`lib/types.ts`)

```ts
export type SessionStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'processing';

export interface TranscriptMessage {
  id: string;          // unique, e.g. crypto.randomUUID()
  role: 'user' | 'ai';
  content: string;
  timestamp: number;   // Date.now()
}

export interface AppError {
  code:
    | 'mic_denied'
    | 'token_fetch_failed'
    | 'ice_dropped'
    | 'calendar_not_configured'
    | 'calendar_insert_failed';
  message: string;
  retry?: () => void;  // if present, toast shows a retry button
}
```

---

## Architecture

### Approach: Custom Hooks + Decomposed Components

Logic is split into two focused hooks and three components. The page wires them together.

#### `useWebRTC` hook

```ts
// Input: none (self-contained)
// Returns:
interface UseWebRTCReturn {
  status: SessionStatus;
  transcript: TranscriptMessage[];
  error: AppError | null;
  remoteStream: MediaStream | null;  // remote audio stream — passed to useAudioAnalyzer
  connect: () => Promise<void>;      // throws on mic denial or token failure
  disconnect: () => void;
}
```

Internally manages: `RTCPeerConnection`, mic `MediaStream`, remote `<audio>` element ref, data channel `"oai-events"`, and tool call dispatch to `/api/calendar`. `remoteStream` is set when `pc.ontrack` fires and cleared on disconnect.

#### `useAudioAnalyzer` hook

```ts
// Input: the remote MediaStream from the peer connection
interface UseAudioAnalyzerReturn {
  amplitude: number;  // normalized 0–1, updated at ~60fps via requestAnimationFrame
}

function useAudioAnalyzer(stream: MediaStream | null): UseAudioAnalyzerReturn
```

`stream` is `null` when not speaking; the hook returns `amplitude: 0` in that case and tears down the `AnalyserNode`.

#### `AiCore` component

```ts
interface AiCoreProps {
  status: SessionStatus;
  amplitude: number;   // 0–1, drives scale/glow intensity during 'speaking' state
}
```

#### `TranscriptPanel` component

```ts
interface TranscriptPanelProps {
  messages: TranscriptMessage[];
  isActive: boolean;   // false = show pre-session explainer; true = show transcript
}
```

#### `StatusToast` component

```ts
interface StatusToastProps {
  error: AppError | null;   // null = no toast shown
  onDismiss: () => void;
}
```

Auto-dismisses after 5s. If `error.retry` is defined, renders a "Retry" button that calls it and dismisses.

---

## Page Layout

**Split panel (Layout B):**

- **Left panel** (fixed ~320px) — AI Core orb centered, app name above, "Initialize Session" button and status label below. After connecting, button becomes "End Session".
- **Right panel** (flex-1) — Pre-session: brief explainer ("Speak naturally to schedule a meeting"). Post-connect: `TranscriptPanel` via `AnimatePresence`.
- **Background** — `#09090B`, subtle moving radial gradient, faint CSS noise overlay at ~3% opacity.
- **Glass cards** — `backdrop-blur-md`, `bg-white/5`, `border-white/10`, `rounded-2xl`.

---

## Data Flow

```
1. User clicks "Initialize Session"  (user gesture — required for AudioContext autoplay)
   └─ page.tsx calls useWebRTC.connect()

2. useWebRTC → POST /api/session
   └─ Server calls OpenAI /v1/realtime/sessions
      Request body: {
        model: "gpt-4o-realtime-preview",
        voice: "alloy",
        instructions: "<system prompt>",
        tools: [create_calendar_event tool definition],
        tool_choice: "auto",
        input_audio_transcription: { model: "whisper-1" }
      }
      Response: OpenAI returns { client_secret: { value: "<ephemeral_token>" } }
      /api/session extracts client_secret.value and returns: { token: string }

3. RTCPeerConnection created in useWebRTC:
   a. getUserMedia({ audio: true }) → mic track added to peer connection
   b. pc.createDataChannel("oai-events") opened BEFORE setLocalDescription
   c. pc.ontrack → remote audio MediaStream routed to hidden <audio autoPlay> element
      └─ Store the remote stream ref for useAudioAnalyzer
   d. SDP offer created: await pc.createOffer() → await pc.setLocalDescription(offer)
   e. SDP sent to OpenAI:
      POST https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview
      Headers: { Authorization: "Bearer <ephemeral_token>", Content-Type: "application/sdp" }
      Body: pc.localDescription.sdp (raw SDP string, not JSON)
      Response: HTTP 201, Content-Type: application/sdp
      Extract: const answerSdp = await response.text()
   f. await pc.setRemoteDescription({ type: "answer", sdp: answerSdp })
   g. ICE monitoring:
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed') → setError(AppError{code:'ice_dropped'})
        // Do NOT call restartIce() — just surface the error and set status='idle'
        // User must click "Reconnect" (retry calls disconnect() then connect())
      }
   h. Data channel readiness: ALWAYS check dc.readyState before dc.send():
      const sendWhenOpen = (msg: string) => {
        if (dc.readyState === 'open') dc.send(msg)
        else dc.addEventListener('open', () => dc.send(msg), { once: true })
      }
      Use sendWhenOpen for ALL dc.send() calls including the greeting.

4. Data channel events drive app state (each event is JSON.parse(event.data)):
   ├─ event.type === "session.created"
   │   → Send greeting via sendWhenOpen:
   │     JSON.stringify({
   │       type: "response.create",
   │       response: {
   │         modalities: ["audio", "text"],
   │         instructions: "Greet the user warmly and ask how you can help schedule a meeting."
   │       }
   │     })
   │   → status = "listening"
   │
   ├─ event.type === "conversation.item.input_audio_transcription.completed"
   │   → append { role:"user", content: event.transcript } to transcript array
   │
   ├─ event.type === "response.audio.delta"
   │   → status = "speaking"  (amplitude now flows from useAudioAnalyzer)
   │
   ├─ event.type === "response.output_item.done" where event.item.type === "message"
   │   → Extract AI text: event.item.content?.find(c => c.type === 'text')?.text
   │   → If text is non-empty: append { role:"ai", content: text } to transcript array
   │   → status = "listening"
   │   NOTE: Guard on item.type === "message" ONLY.
   │         item.type === "function_call" also fires this event — do NOT change
   │         status or append transcript for function_call items.
   │
   └─ event.type === "response.function_call_arguments.done"
       NOTE: event.name   = the FUNCTION name ("create_calendar_event")
             event.call_id = correlation ID for the tool result (exact field name)
             event.arguments = JSON string with user's scheduling details
       ├─ const args = JSON.parse(event.arguments)
       │   → { name: string, date: string, time: string, title?: string }
       │   (args.name = user's name, NOT event.name which is the function name)
       ├─ status = "processing"
       ├─ POST /api/calendar {
       │     ...args,
       │     timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
       │   }
       │   └─ Returns { success, eventId?, htmlLink?, error? }
       ├─ Send tool result via sendWhenOpen:
       │   JSON.stringify({
       │     type: "conversation.item.create",
       │     item: {
       │       type: "function_call_output",
       │       call_id: event.call_id,
       │       output: JSON.stringify(calendarResult)
       │     }
       │   })
       │   then trigger AI response via sendWhenOpen:
       │   JSON.stringify({
       │     type: "response.create",
       │     response: { modalities: ["audio", "text"] }
       │   })
       └─ status = "speaking"

5. useAudioAnalyzer lifecycle:
   - Hook signature: useAudioAnalyzer(stream: MediaStream | null): { amplitude: number }
   - stream is sourced from useWebRTC's remoteStream field (set when pc.ontrack fires)
   - useEffect watches stream:
     * When stream becomes non-null: create AudioContext, createMediaStreamSource(stream),
       createAnalyser (fftSize:256), connect, start RAF loop
       (AudioContext creation is safe here since it happens after a user gesture)
     * RAF loop: analyser.getByteFrequencyData(dataArray) → RMS of dataArray → normalize 0–1
     * When stream becomes null or effect cleans up: cancelAnimationFrame, audioCtx.close()
   - Returns { amplitude: 0 } when stream is null
```

---

## AI Core — Orb States

| Status | Visual Behavior |
|---|---|
| `idle` | Dim grey/purple, slow breathing pulse (scale 1.0 ↔ 1.04, 4s ease-in-out) |
| `connecting` | Amber conic gradient spinner ring around orb |
| `listening` | Cyan/purple gradient, fast expand pulse (scale 1.0 ↔ 1.1, 1s) |
| `speaking` | Purple/cyan gradient, scale driven by `amplitude` (1.0 + amplitude × 0.3) |
| `processing` | Green blob morph animation (border-radius morphing, 2s loop) |

Transitions via Framer Motion `animate` + `transition` props on a single `<motion.div>`. Box-shadow also animates with state to create glow effect.

---

## Agent Persona & Tool Definition

### System Instructions
```
You are a futuristic, ultra-efficient AI scheduling concierge. Your tone is warm, professional, and concise.
1. Greet the user warmly and ask how you can help.
2. Collect naturally in conversation: User's Name, Preferred Date, Preferred Time, Optional Meeting Title.
3. Confirm the details concisely before booking.
4. Use the create_calendar_event tool to book the meeting.
5. Inform the user of the successful booking or any error.
```

### Tool: `create_calendar_event`
```json
{
  "name": "create_calendar_event",
  "description": "Creates a 30-minute Google Calendar event for the user.",
  "parameters": {
    "type": "object",
    "properties": {
      "name":  { "type": "string", "description": "The user's full name (used as event attendee label)" },
      "date":  { "type": "string", "description": "Event date in YYYY-MM-DD format" },
      "time":  { "type": "string", "description": "Event start time in HH:MM 24h format (user's local time)" },
      "title": { "type": "string", "description": "Meeting title/summary. Defaults to 'Meeting with {name}' if omitted." }
    },
    "required": ["name", "date", "time"]
  }
}
```

---

## API Routes

### `POST /api/session`

**Request:** No body required.

**Server action:**
```ts
// Calls OpenAI with:
fetch("https://api.openai.com/v1/realtime/sessions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-4o-realtime-preview",
    voice: "alloy",
    instructions: SYSTEM_PROMPT,
    tools: [CREATE_CALENDAR_EVENT_TOOL],
    tool_choice: "auto",
    input_audio_transcription: { model: "whisper-1" },
  }),
})
```

**Success response (200):**
```json
{ "token": "<ephemeral_token_string>" }
```
The route extracts `data.client_secret.value` from OpenAI's response and returns it as `token`.

**Error responses:**
- `500` `{ "error": "openai_session_failed", "detail": "..." }` — OpenAI API error or missing key

---

### `POST /api/calendar`

**Request body:**
```ts
{
  name: string;      // required — user's name, used in event description
  date: string;      // required — YYYY-MM-DD
  time: string;      // required — HH:MM in 24h (local time in the user's timezone)
  title?: string;    // optional — event summary; defaults to "Meeting with {name}"
  timezone?: string; // IANA timezone string e.g. "America/Chicago"; defaults to "UTC"
}
```

**Timezone handling:** The frontend always appends `Intl.DateTimeFormat().resolvedOptions().timeZone` to the calendar POST body. The AI collects date/time in conversation in the user's local time; the server constructs the ISO 8601 datetime using the provided timezone.

**ISO 8601 datetime construction:** Use `date-fns-tz` to avoid DST errors:
```ts
import { fromZonedTime } from 'date-fns-tz'
// Pass the bare local-time string directly — do NOT wrap in new Date() first,
// as that would parse it as server-local (UTC on Vercel) and compound the offset.
const startUtc = fromZonedTime(`${date}T${time}:00`, timezone ?? 'UTC')
const endUtc = new Date(startUtc.getTime() + 30 * 60 * 1000)
// Pass to Google Calendar as:
// start: { dateTime: startUtc.toISOString(), timeZone: timezone }
// end:   { dateTime: endUtc.toISOString(),   timeZone: timezone }
// Example output: "2026-06-15T21:00:00.000Z" with timeZone "America/Chicago"
// for a user who said "2pm" (14:00 CDT = UTC-5 in summer)
```

**Server action:**
- Parse `GOOGLE_SERVICE_ACCOUNT_JSON` env var:
  ```ts
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  // IMPORTANT: The private_key field contains literal \n sequences.
  // After JSON.parse, Node.js correctly interprets these as newlines — no
  // additional .replace() needed when the var was set by stringifying the JSON.
  ```
- Create `google.auth.JWT` client with `scope: ['https://www.googleapis.com/auth/calendar']`
- `calendar.events.insert()` with:
  - `summary`: `title ?? \`Meeting with ${name}\``
  - `description`: `\`Scheduled via Cerebrocal for ${name}\``
  - `start`: `{ dateTime: startUtc.toISOString(), timeZone }`
  - `end`: `{ dateTime: endUtc.toISOString(), timeZone }`
  - `calendarId`: `process.env.GOOGLE_CALENDAR_ID ?? "primary"`

**Success response (200):**
```json
{ "success": true, "eventId": "abc123", "htmlLink": "https://calendar.google.com/..." }
```

**Error responses:**
- `503` `{ "error": "calendar_not_configured", "setup": "Set GOOGLE_SERVICE_ACCOUNT_JSON in env vars. See SETUP.md." }` — missing credentials
- `500` `{ "success": false, "error": "insert_failed", "detail": "..." }` — Google API error

---

## Error Handling

| Scenario | `AppError.code` | Toast Message | `retry` |
|---|---|---|---|
| Mic permission denied | `mic_denied` | "Microphone access required" | No |
| Token fetch failure | `token_fetch_failed` | "Couldn't connect — check your API key" | Yes → `connect()` |
| ICE connection drop | `ice_dropped` | "Connection lost — session ended" | Yes → `connect()` |
| Calendar not configured | `calendar_not_configured` | "Calendar not configured — see SETUP.md" | No |
| Calendar insert failure | `calendar_insert_failed` | "Booking failed" (AI also confirms verbally) | No |

Calendar errors are serialized to JSON and sent back over the data channel as a `function_call_output` so the AI can verbally acknowledge — preserving conversational flow without breaking to a UI-only error state.

---

## Environment Variables

```bash
# .env.example

# OpenAI
OPENAI_API_KEY=sk-...

# Google Calendar
# Stringify your service account JSON key to a SINGLE LINE using:
#   python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" < service-account.json
#
# IMPORTANT — private_key and \n handling:
#   The JSON key file contains literal \n in the private_key field.
#   After python3 stringification, these become \\n in the output string.
#   Node's JSON.parse() will correctly restore them to \n (real newlines).
#   ✅ Local (.env.local): paste the stringified output directly — works as-is.
#   ✅ Vercel dashboard: paste the stringified output directly — Vercel does NOT
#      interpret escape sequences, so \\n stays as \\n and JSON.parse handles it.
#   ❌ DO NOT manually replace \\n with real newlines in the Vercel UI —
#      this will break the private_key PEM format.
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"my-project","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----\\n","client_email":"my-sa@my-project.iam.gserviceaccount.com","token_uri":"https://oauth2.googleapis.com/token"}

# The calendar to write events to. "primary" = the service account's own calendar.
# To write to YOUR calendar: share it with the client_email above (Editor role),
# then paste that calendar's ID here (Google Calendar → Settings → Integrate calendar).
GOOGLE_CALENDAR_ID=primary
```

**Setup instructions** (included in `.env.example` and `SETUP.md`):
1. Create a Google Cloud project, enable the Google Calendar API
2. Create a service account; download the JSON key file
3. Share your Google Calendar with the service account's `client_email` (grant Editor role)
4. Stringify: `python3 -c "import json,sys; print(json.dumps(json.load(sys.stdin)))" < service-account.json`
5. Set the output as `GOOGLE_SERVICE_ACCOUNT_JSON` in `.env.local` and Vercel dashboard
6. Set `GOOGLE_CALENDAR_ID` to `primary` or your calendar's ID

---

## UI Details

- **Noise overlay:** `globals.css` pseudo-element with SVG noise at ~3% opacity, `pointer-events: none`, `position: fixed`, full viewport
- **Radial gradient:** CSS keyframe animation on `::before`, slow 8s loop shifting position
- **Transcript messages:** `AnimatePresence` with `initial={{ y: 10, opacity: 0 }}` → `animate={{ y: 0, opacity: 1 }}`, stagger 0.05s per message
- **Glass panels:** `backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl`
- **Buttons:** `whileTap={{ scale: 0.96 }}`, hover glow via `box-shadow` transition
- **Toast:** slides in from bottom (`y: 80 → 0`), auto-dismisses at 5s, manual dismiss via ✕ button

---

## Deployment (Vercel)

- All API routes are Next.js Route Handlers — serverless-compatible, no filesystem access
- Add `.superpowers/` and `.env.local` to `.gitignore`
- Set `OPENAI_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `GOOGLE_CALENDAR_ID` in Vercel project Settings → Environment Variables
- **Private key note:** Vercel correctly handles `\n` in env var values; paste the stringified JSON as-is from the setup step above

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
│   ├── page.tsx                # Root page — wires hooks + components
│   └── api/
│       ├── session/route.ts    # POST → OpenAI ephemeral token
│       └── calendar/route.ts   # POST → Google Calendar event insert
├── components/
│   ├── AiCore.tsx              # Animated orb, Framer Motion state machine
│   ├── TranscriptPanel.tsx     # Staggered fade-in message list (glassmorphism)
│   └── StatusToast.tsx         # Error/info notifications
├── hooks/
│   ├── useWebRTC.ts            # RTCPeerConnection, data channel, tool dispatch
│   └── useAudioAnalyzer.ts     # Web Audio API, amplitude → 0–1 float
├── lib/
│   └── types.ts                # Shared TS types
├── .env.local                  # Secret keys (gitignored)
└── .env.example                # Documented setup template
```

---

## Architecture

### Approach: Custom Hooks + Decomposed Components

Logic is split into two focused hooks and three components. The page wires them together. Each unit has one clear purpose.

- **`useWebRTC`** — owns the RTCPeerConnection lifecycle, data channel management, and tool call interception. Exposes: `status`, `transcript`, `connect()`, `disconnect()`.
- **`useAudioAnalyzer`** — attaches a Web Audio API `AnalyserNode` to the remote audio MediaStream and samples amplitude at ~60fps. Exposes a normalized `0–1` float (`amplitude`).
- **`AiCore`** — receives `status` and `amplitude` props, renders the animated orb via Framer Motion.
- **`TranscriptPanel`** — receives the `transcript` array, renders messages with staggered fade-in animations via `AnimatePresence`.
- **`StatusToast`** — receives an `error` prop, auto-dismisses after 5s.

---

## Page Layout

**Split panel (Layout B):**

- **Left panel** — AI Core orb anchored center, app name above, session button / status text below. Fixed width.
- **Right panel** — Conversation transcript fills the remaining width. Pre-session: brief explainer text. Post-connect: transcript takes over via `AnimatePresence`.
- **Background** — `#09090B`, subtle moving radial gradient, faint CSS noise overlay.
- **Glass cards** — `backdrop-blur-md`, `bg-white/5`, `border-white/10`.

---

## Data Flow

```
1. User clicks "Initialize Session"
   └─ page.tsx calls useWebRTC.connect()

2. useWebRTC → POST /api/session
   └─ route.ts → OpenAI /v1/realtime/sessions → ephemeral token

3. RTCPeerConnection created
   ├─ getUserMedia() → mic track added
   ├─ Remote audio track → <audio> element (AI voice output)
   ├─ Data channel "oai-events" opened
   └─ SDP offer/answer exchange with OpenAI

4. Data channel events drive app state:
   ├─ session.created                      → trigger AI greeting, status = "listening"
   ├─ input_audio_transcription            → append user message to transcript
   ├─ response.audio.delta                 → status = "speaking", amplitude active
   ├─ response.audio.done                  → status = "listening"
   └─ response.function_call_arguments.done
       ├─ status = "processing"
       ├─ POST /api/calendar {name, date, time, title}
       │   └─ googleapis JWT → Calendar.events.insert() (30-min block)
       └─ Send tool result over data channel → status = "speaking"

5. useAudioAnalyzer
   ├─ Connects to remote audio MediaStream via Web Audio API AnalyserNode
   ├─ Samples amplitude at ~60fps
   └─ Emits normalized 0–1 float → AiCore scale/glow
```

---

## AI Core — Orb States

| Status | Visual Behavior |
|---|---|
| `idle` | Dim, slow breathing pulse (dimmed grey/purple) |
| `connecting` | Amber conic gradient spinner ring |
| `listening` | Cyan/purple, fast expand pulse |
| `speaking` | Purple/cyan color shift, amplitude-driven scale via `useAudioAnalyzer` |
| `processing` | Green blob morph animation |

Transitions between states are handled via Framer Motion `animate` + `transition` props on a single `<motion.div>`.

---

## Agent Persona & Tool Definition

### System Instructions
```
You are a futuristic, ultra-efficient AI scheduling concierge. Your tone is warm, professional, and concise.
1. Greet the user warmly and ask how you can help.
2. Collect naturally: User's Name, Preferred Date, Preferred Time, Optional Meeting Title.
3. Confirm details concisely before booking.
4. Use the create_calendar_event tool to book the meeting.
5. Inform the user of the successful booking or any error.
```

### Tool: `create_calendar_event`
```json
{
  "name": "create_calendar_event",
  "description": "Creates a 30-minute Google Calendar event.",
  "parameters": {
    "type": "object",
    "properties": {
      "name":  { "type": "string", "description": "User's name" },
      "date":  { "type": "string", "description": "Event date in YYYY-MM-DD format" },
      "time":  { "type": "string", "description": "Event start time in HH:MM 24h format" },
      "title": { "type": "string", "description": "Meeting title (optional)" }
    },
    "required": ["name", "date", "time"]
  }
}
```

---

## API Routes

### `POST /api/session`
- Calls `https://api.openai.com/v1/realtime/sessions` with `OPENAI_API_KEY`
- Model: `gpt-4o-realtime-preview`
- Includes system instructions and tool definition in session config
- Returns ephemeral token to client

### `POST /api/calendar`
- Reads `GOOGLE_SERVICE_ACCOUNT_JSON` env var (stringified JSON)
- If missing: returns `503` with `{ error: "calendar_not_configured", setup: "..." }`
- Parses `{ name, date, time, title }` from request body
- Creates 30-min event: `startTime = date + time`, `endTime = startTime + 30min`
- Returns `{ success: true, eventId, htmlLink }` or `{ success: false, error }`

---

## Error Handling

| Scenario | Toast Message | Action |
|---|---|---|
| Mic permission denied | "Microphone access required" | "Open Settings" |
| Token fetch failure | "Couldn't connect — check your API key" | "Retry" |
| ICE connection drop | "Connection lost — session ended" | "Reconnect" |
| Calendar not configured | "Calendar not configured — see setup guide" | None |
| Calendar insert failure | "Booking failed" (AI also confirms verbally) | None |

Calendar errors are passed back over the data channel so the AI can verbally acknowledge the failure — preserving conversational flow.

---

## Environment Variables

```bash
# .env.example

# OpenAI
OPENAI_API_KEY=sk-...

# Google Calendar (service account JSON as a single-line string)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key":"..."}
GOOGLE_CALENDAR_ID=primary   # or a specific calendar ID
```

**Setup instructions** (included in `.env.example` and a `SETUP.md`):
1. Create a Google Cloud project and enable the Calendar API
2. Create a service account and download the JSON key
3. Share your Google Calendar with the service account email (Editor role)
4. Stringify the JSON and set as `GOOGLE_SERVICE_ACCOUNT_JSON`
5. Set `GOOGLE_CALENDAR_ID` to `primary` or your calendar's ID

---

## UI Details

- **Noise overlay:** CSS `background-image: url("data:image/svg+xml...")` at ~3% opacity
- **Radial gradient:** animated via CSS keyframes, shifts slowly behind orb
- **Transcript messages:** `AnimatePresence` with staggered `y: 10 → 0`, `opacity: 0 → 1`
- **Glass panels:** `backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl`
- **Buttons:** scale-down on click (`whileTap={{ scale: 0.96 }}`), glow on hover
- **Toast:** slides in from bottom, auto-dismisses at 5s, manual dismiss supported

---

## Deployment (Vercel)

- All API routes are standard Next.js Route Handlers — serverless-compatible by default
- No file system access required (credentials via env vars)
- Add `.superpowers/` to `.gitignore`
- Set env vars in Vercel project settings dashboard

# Google OAuth Setup

One OAuth app handles both sign-in and Google Calendar access — no service account needed.

1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create a new **OAuth 2.0 Client ID** — Application type: **Web application**
3. Add Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (local dev)
   - `https://your-domain.vercel.app/api/auth/callback/google` (production)
4. Enable the **Google Calendar API**: APIs & Services → Library → search "Google Calendar API" → Enable
5. Copy **Client ID** and **Client Secret** into `.env.local`
6. Generate `AUTH_SECRET`: `openssl rand -base64 32`

The app requests `calendar.events` scope at sign-in. Users grant access once — no additional setup required.

## Environment Variables

- **`OPENAI_API_KEY`** — Your OpenAI API key (for AI features)
- **`AUTH_SECRET`** — Random secret for NextAuth session encryption. Generate with: `openssl rand -base64 32`
- **`AUTH_URL`** — Full URL of this deployment:
  - Local dev: `http://localhost:3000`
  - Production: `https://your-domain.vercel.app`
- **`GOOGLE_CLIENT_ID`** — OAuth app Client ID from Google Cloud Console
- **`GOOGLE_CLIENT_SECRET`** — OAuth app Client Secret from Google Cloud Console

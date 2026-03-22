import { SYSTEM_PROMPT, CREATE_CALENDAR_EVENT_TOOL } from '@/lib/constants'

export async function createOpenAISession(locale: string): Promise<string> {
  const instructions = `${SYSTEM_PROMPT}\n\nIMPORTANT: Always respond in the user's language (locale: ${locale}). If the user speaks to you in any language, reply in that same language.`

  const res = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview',
      voice: 'alloy',
      instructions,
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

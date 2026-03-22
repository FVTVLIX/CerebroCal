export type SessionStatus =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'speaking'
  | 'processing'

export interface TranscriptMessage {
  id: string       // crypto.randomUUID()
  role: 'user' | 'ai' | 'system'
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

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

'use client'

import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AiCore } from '@/components/AiCore'
import { TranscriptPanel } from '@/components/TranscriptPanel'
import { StatusToast } from '@/components/StatusToast'
import { useWebRTC } from '@/hooks/useWebRTC'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'
import { AppError } from '@/lib/types'
import { SignOutButton } from '@/components/SignOutButton'

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
          <SignOutButton />
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

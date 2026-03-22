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
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  )
}

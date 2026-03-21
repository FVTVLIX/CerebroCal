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
  // During speaking, scale is driven by live audio amplitude
  const speakingScale = status === 'speaking' ? 1 + amplitude * 0.3 : undefined

  return (
    <div className="relative flex items-center justify-center w-48 h-48">
      {/* Outer glow ring */}
      <div className="absolute inset-0 rounded-full opacity-20 blur-2xl bg-purple-500" />

      {/* Connecting spinner ring — amber conic gradient, CSS spin animation */}
      {status === 'connecting' && (
        <div
          data-testid="connecting-ring"
          className="absolute inset-[-4px] rounded-full"
          style={{
            background:
              'conic-gradient(from 0deg, #f59e0b 0%, #f59e0b 30%, transparent 60%)',
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
            ? { ...orbVariants[status], scale: speakingScale }
            : orbVariants[status]
        }
        transition={orbTransitions[status]}
      />
    </div>
  )
}

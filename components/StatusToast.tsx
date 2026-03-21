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

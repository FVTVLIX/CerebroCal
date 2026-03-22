'use client'
import { signIn } from 'next-auth/react'

export function SignInButton() {
  return (
    <button
      onClick={() => signIn('google', { redirectTo: '/chat' })}
      className="flex items-center gap-3 px-8 py-3 rounded-full border border-white/20 bg-white/5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
    >
      Continue with Google
    </button>
  )
}

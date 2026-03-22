'use client'
import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ redirectTo: '/' })}
      className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
    >
      Sign out
    </button>
  )
}

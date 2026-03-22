import { auth } from './auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isAuthed = !!req.auth
  const hasTokenError = req.auth?.error === 'RefreshTokenError'
  const pathname = req.nextUrl.pathname
  const isLanding = pathname === '/'
  const isChat = pathname.startsWith('/chat')

  // Redirect authenticated users away from landing page to the app
  if (isAuthed && !hasTokenError && isLanding) {
    return NextResponse.redirect(new URL('/chat', req.url))
  }

  // Protect /chat — unauthenticated or token-errored users go to landing page
  if (isChat && (!isAuthed || hasTokenError)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // All other routes pass through
  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

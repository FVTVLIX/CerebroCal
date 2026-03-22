import { SignInButton } from './SignInButton'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
        <h1
          className="text-2xl font-bold text-white"
          style={{ fontFamily: 'var(--font-space-grotesk)' }}
        >
          Cerebrocal
        </h1>
        <p className="text-sm text-zinc-400">Sign in to continue</p>
        {error && (
          <p className="text-sm text-red-400">Sign-in failed — please try again.</p>
        )}
        <SignInButton />
      </div>
    </main>
  )
}

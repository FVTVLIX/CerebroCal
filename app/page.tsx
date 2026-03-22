import { HeroSignInButton } from '@/components/landing/HeroSignInButton'

const USE_CASES = [
  {
    icon: '🗓',
    title: 'Schedule a meeting',
    description: 'Tell the AI who, when, and why — done.',
  },
  {
    icon: '🔍',
    title: 'Find a free slot',
    description: "Just ask and it'll suggest the next available time.",
  },
  {
    icon: '📋',
    title: 'Add full details',
    description: 'Title, time, attendee — all captured by voice.',
  },
  {
    icon: '✅',
    title: 'Confirm instantly',
    description: "Hear confirmation the moment it's booked.",
  },
]

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center flex-1 min-h-screen gap-6 px-6 text-center overflow-hidden">
        {/* Animated background orb */}
        <style>{`
          @keyframes orbDrift {
            from { transform: translate(-30px, -20px); }
            to   { transform: translate(30px, 25px); }
          }
        `}</style>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 50%, rgba(34,211,238,0.10) 0%, rgba(34,211,238,0.02) 60%, transparent 80%)',
            filter: 'blur(80px)',
            animation: 'orbDrift 12s ease-in-out infinite alternate',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
        {/* Hero content — sits above the orb */}
        <div className="relative z-10 flex flex-col items-center gap-6">
          <h1
            className="text-5xl font-bold text-white"
            style={{ fontFamily: 'var(--font-space-grotesk)' }}
          >
            Cerebrocal
          </h1>
          <p className="text-sm text-zinc-400">Your AI scheduling concierge</p>
          <p className="text-sm text-zinc-500 max-w-sm">
            Speak naturally. Book instantly. No typing required.
          </p>
          <HeroSignInButton />
        </div>
      </section>

      {/* Description */}
      <section className="flex flex-col items-center gap-4 px-6 py-16 border-t border-white/5">
        <div className="max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-white mb-4">What is Cerebrocal?</h2>
          <p className="text-zinc-400 leading-relaxed">
            Cerebrocal is a real-time voice assistant that books Google Calendar events through
            natural conversation. Just say who you want to meet, when, and what it&apos;s about —
            the AI handles the rest, live in your calendar.
          </p>
        </div>
      </section>

      {/* Use Cases */}
      <section className="flex flex-col items-center gap-8 px-6 py-16 border-t border-white/5">
        <h2 className="text-xl font-semibold text-white">What you can do</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
          {USE_CASES.map(({ icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col gap-2 p-6 rounded-2xl bg-white/5 border border-white/10"
            >
              <span className="text-2xl">{icon}</span>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="text-xs text-zinc-400">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="flex items-center px-6 py-4 border-t border-white/5">
        <span className="text-xs text-zinc-600">© 2026 Cerebrocal</span>
      </footer>
    </main>
  )
}

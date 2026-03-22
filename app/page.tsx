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

      {/* How It Works */}
      <section className="flex flex-col items-center gap-8 px-6 py-16 border-t border-white/5">
        <div className="max-w-2xl w-full text-center">
          <h2 className="text-2xl font-bold text-white mb-10">How it works</h2>
          <div className="flex flex-col gap-8">
            {[
              { step: '1', icon: '🔐', title: 'Sign in with Google', desc: 'Grant calendar access once. No setup required.' },
              { step: '2', icon: '🎙', title: 'Talk naturally', desc: 'Say who, when, and what. No forms, no typing.' },
              { step: '3', icon: '✅', title: 'Event booked instantly', desc: 'Hear confirmation the moment it lands on your calendar.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex items-start gap-6 text-left">
                <span className="text-4xl font-bold text-white/10 leading-none w-8 shrink-0">{step}</span>
                <div>
                  <p className="text-base font-semibold text-white mb-1">{icon} {title}</p>
                  <p className="text-sm text-zinc-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sample Conversation */}
      <section className="flex flex-col items-center gap-6 px-6 py-16 border-t border-white/5">
        <h2 className="text-2xl font-bold text-white">See it in action</h2>
        <div className="max-w-xl w-full flex flex-col gap-3 bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm bg-white/5 border border-white/10 text-zinc-300">
              Schedule a meeting with Sarah tomorrow at 2pm
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm bg-cyan-950/50 border border-cyan-900/40 text-cyan-100">
              Got it. I&apos;ve added &quot;Meeting with Sarah&quot; to your calendar for tomorrow at 2:00 PM. Anything else?
            </div>
          </div>
        </div>
      </section>

      {/* Expanded Features */}
      <section className="flex flex-col items-center gap-8 px-6 py-16 border-t border-white/5">
        <h2 className="text-2xl font-bold text-white">Everything you need</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 max-w-2xl w-full">
          {[
            { icon: '🎙', title: 'Real-time voice', desc: 'No typing. Just talk.' },
            { icon: '🌍', title: 'Timezone-aware scheduling', desc: 'Works wherever you are.' },
            { icon: '📅', title: 'Google Calendar native', desc: 'Books directly to your primary calendar.' },
            { icon: '⚡', title: 'Instant audio confirmation', desc: 'Hear the result immediately.' },
            { icon: '🔒', title: 'Your credentials only', desc: 'No shared accounts or service keys.' },
            { icon: '📱', title: 'Works on any device', desc: 'Any browser with a microphone.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="text-xl">{icon}</span>
              <div>
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="text-xs text-zinc-400">{desc}</p>
              </div>
            </div>
          ))}
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

      {/* Privacy Note */}
      <section className="flex flex-col items-center px-6 py-6 border-t border-b border-white/5">
        <p className="max-w-2xl text-center text-sm text-zinc-400">
          🔒 <strong className="text-zinc-300">Privacy first.</strong> Cerebrocal requests Google Calendar
          access only to create events on your behalf. We do not read your existing events, store your
          calendar data, or share anything with third parties.
        </p>
      </section>

      {/* Footer */}
      <footer className="flex items-center px-6 py-4 border-t border-white/5">
        <span className="text-xs text-zinc-600">© 2026 Cerebrocal</span>
      </footer>
    </main>
  )
}

import { HeroSignInButton } from '@/components/landing/HeroSignInButton'

const NOISE_DATA_URI =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")"

export default async function LandingPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>
}) {
  const { error } = await (searchParams ?? Promise.resolve({}))

  return (
    <>
      <style>{`
        .lp-noise::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image: ${NOISE_DATA_URI};
          background-size: 200px;
          opacity: 0.03;
          pointer-events: none;
          z-index: 0;
        }
        @media (max-width: 640px) {
          .lp-steps { grid-template-columns: 1fr !important; }
          .lp-features { grid-template-columns: 1fr !important; }
          .lp-hero-h1 { font-size: 48px !important; }
          .lp-section { padding: 0 20px !important; }
        }
      `}</style>

      <div
        className="lp-noise"
        style={{
          background: '#09090b',
          minHeight: '100vh',
          color: '#fff',
          fontFamily: "var(--font-space-grotesk, 'Space Grotesk', system-ui, sans-serif)",
        }}
      >
        <div style={{ maxWidth: 860, margin: '0 auto', position: 'relative', zIndex: 1 }}>

          {/* Nav */}
          <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '28px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.3px' }}>Cerebrocal</span>
            <span style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#3f3f46' }}>AI Scheduling</span>
          </nav>

          {/* Hero */}
          <section style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '130px 40px 110px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 10, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#52525b', marginBottom: 48 }}>
              <span style={{ display: 'block', width: 28, height: 1, background: '#27272a' }} aria-hidden="true" />
              Voice · Calendar · AI
              <span style={{ display: 'block', width: 28, height: 1, background: '#27272a' }} aria-hidden="true" />
            </div>

            <h1
              className="lp-hero-h1"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 82, fontWeight: 400, lineHeight: 1.0, letterSpacing: -3, color: '#fff', marginBottom: 36, maxWidth: 640 }}
            >
              Schedule anything,<br />
              <em style={{ fontStyle: 'italic', color: '#71717a' }}>just by asking.</em>
            </h1>

            <p style={{ fontSize: 15, color: '#52525b', lineHeight: 1.75, maxWidth: 380, marginBottom: error ? 24 : 56, fontWeight: 400 }}>
              A real-time voice assistant that books Google Calendar events through natural conversation. No typing required.
            </p>

            {error && (
              <p role="alert" style={{ fontSize: 13, color: '#f87171', marginBottom: 32 }}>
                Sign-in failed — please try again.
              </p>
            )}

            <HeroSignInButton />

            <p style={{ marginTop: 22, fontSize: 11, color: '#27272a', letterSpacing: '0.2px' }}>
              Free to use · No credit card required
            </p>
          </section>

          <Divider label="How it works" />

          {/* Steps */}
          <div className="lp-section" style={{ padding: '0 40px', marginBottom: 100 }}>
            <div
              className="lp-steps"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden' }}
            >
              {[
                { num: '01', icon: '🔐', title: 'Sign in with Google', desc: 'Grant calendar access once. No setup required.' },
                { num: '02', icon: '🎙', title: 'Talk naturally', desc: 'Say who, when, and what. No forms, no typing.' },
                { num: '03', icon: '✅', title: 'Event booked instantly', desc: 'Hear confirmation the moment it lands on your calendar.' },
              ].map((step) => (
                <div key={step.num} style={{ background: '#09090b', padding: '36px 28px', display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 400, color: 'rgba(255,255,255,0.05)', letterSpacing: -1, lineHeight: 1 }} aria-hidden="true">{step.num}</div>
                  <div style={{ fontSize: 20 }} aria-hidden="true">{step.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e4e4e7', letterSpacing: '-0.2px' }}>{step.title}</div>
                  <div style={{ fontSize: 12, color: '#3f3f46', lineHeight: 1.65 }}>{step.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <Divider label="See it in action" />

          {/* Conversation demo */}
          <div style={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, overflow: 'hidden', margin: '0 40px', marginBottom: 100 }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} aria-hidden="true" />
              ))}
              <span style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#27272a', marginLeft: 6 }}>Live session</span>
            </div>
            <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ maxWidth: '70%', padding: '12px 18px', borderRadius: 12, fontSize: 13, lineHeight: 1.55, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#a1a1aa', alignSelf: 'flex-end', borderBottomRightRadius: 3 }}>
                Schedule a meeting with Sarah tomorrow at 2pm
              </div>
              <div style={{ maxWidth: '70%', padding: '12px 18px', borderRadius: 12, fontSize: 13, lineHeight: 1.55, background: 'rgba(34,211,238,0.05)', border: '1px solid rgba(34,211,238,0.1)', color: '#a1f0f8', alignSelf: 'flex-start', borderBottomLeftRadius: 3 }}>
                <span style={{ fontSize: 9, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(34,211,238,0.35)', marginBottom: 5, display: 'block' }} aria-hidden="true">AI</span>
                Got it. I&apos;ve added &quot;Meeting with Sarah&quot; to your calendar for tomorrow at 2:00 PM. Anything else?
              </div>
            </div>
          </div>

          <Divider label="Everything you need" />

          {/* Features */}
          <div
            className="lp-features"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 12, overflow: 'hidden', margin: '0 40px', marginBottom: 100 }}
          >
            {[
              { icon: '🎙', title: 'Real-time voice', desc: 'No typing. Just talk.' },
              { icon: '🌍', title: 'Timezone-aware', desc: 'Works wherever you are.' },
              { icon: '📅', title: 'Google Calendar native', desc: 'Books to your primary calendar directly.' },
              { icon: '⚡', title: 'Instant confirmation', desc: 'Hear the result immediately.' },
            ].map((f) => (
              <div key={f.title} style={{ background: '#09090b', padding: '28px 32px', display: 'flex', alignItems: 'flex-start', gap: 18 }}>
                <span style={{ fontSize: 16, marginTop: 2, opacity: 0.55 }} aria-hidden="true">{f.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#d4d4d8', letterSpacing: '-0.2px', marginBottom: 5 }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: '#3f3f46', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Privacy */}
          <div style={{ margin: '0 40px 100px', padding: '22px 28px', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ fontSize: 14, opacity: 0.35 }} aria-hidden="true">🔒</span>
            <p style={{ fontSize: 11, color: '#3f3f46', lineHeight: 1.65 }}>
              <strong style={{ color: '#52525b', fontWeight: 500 }}>Privacy first.</strong> We request calendar access only to create events on your behalf. We do not read your existing events or store your data.
            </p>
          </div>

          {/* Footer */}
          <footer style={{ padding: '24px 40px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 60 }}>
            <span style={{ fontSize: 11, color: '#27272a' }}>© 2026 Cerebrocal</span>
            <span style={{ fontSize: 11, color: '#27272a' }}>Voice-powered scheduling</span>
          </footer>

        </div>
      </div>
    </>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '0 40px', marginBottom: 56 }}>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} aria-hidden="true" />
      <div style={{ fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#27272a' }}>{label}</div>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} aria-hidden="true" />
    </div>
  )
}

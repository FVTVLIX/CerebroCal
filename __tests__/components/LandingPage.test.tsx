import { render, screen } from '@testing-library/react'
import LandingPage from '@/app/page'

// HeroSignInButton is a client component — mock it so tests don't need next-auth
jest.mock('@/components/landing/HeroSignInButton', () => ({
  HeroSignInButton: () => <button>Continue with Google</button>,
}))

async function renderPage(error?: string) {
  const jsx = await LandingPage({ searchParams: Promise.resolve(error ? { error } : {}) })
  render(jsx)
}

describe('LandingPage', () => {
  it('renders the logo in the nav', async () => {
    await renderPage()
    expect(screen.getByText('Cerebrocal')).toBeInTheDocument()
  })

  it('renders the AI Scheduling nav badge', async () => {
    await renderPage()
    expect(screen.getByText('AI Scheduling')).toBeInTheDocument()
  })

  it('renders the hero eyebrow text', async () => {
    await renderPage()
    expect(screen.getByText('Voice · Calendar · AI')).toBeInTheDocument()
  })

  it('renders the hero heading', async () => {
    await renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Schedule anything,')
  })

  it('renders the CTA button', async () => {
    await renderPage()
    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument()
  })

  it('renders the footnote', async () => {
    await renderPage()
    expect(screen.getByText(/free to use/i)).toBeInTheDocument()
  })

  it('renders the How It Works divider label', async () => {
    await renderPage()
    expect(screen.getByText('How it works')).toBeInTheDocument()
  })

  it('renders all three How It Works step descriptions', async () => {
    await renderPage()
    expect(screen.getByText(/grant calendar access once/i)).toBeInTheDocument()
    expect(screen.getByText(/no forms, no typing/i)).toBeInTheDocument()
    expect(screen.getByText(/hear confirmation the moment it lands on your calendar/i)).toBeInTheDocument()
  })

  it('renders the See it in action divider and sample conversation', async () => {
    await renderPage()
    expect(screen.getByText('See it in action')).toBeInTheDocument()
    expect(screen.getByText(/schedule a meeting with sarah/i)).toBeInTheDocument()
  })

  it('renders the Everything you need divider and features', async () => {
    await renderPage()
    expect(screen.getByText('Everything you need')).toBeInTheDocument()
    expect(screen.getByText(/no typing\. just talk\./i)).toBeInTheDocument()
    expect(screen.getByText(/works wherever you are\./i)).toBeInTheDocument()
  })

  it('renders the privacy note', async () => {
    await renderPage()
    expect(screen.getByText(/privacy first/i)).toBeInTheDocument()
    expect(screen.getByText(/we do not read your existing events/i)).toBeInTheDocument()
  })

  it('renders the footer copyright', async () => {
    await renderPage()
    expect(screen.getByText('© 2026 Cerebrocal')).toBeInTheDocument()
  })

  it('does NOT show the error banner when no error param', async () => {
    await renderPage()
    expect(screen.queryByText(/sign-in failed/i)).not.toBeInTheDocument()
  })

  it('shows the error banner when error param is present', async () => {
    await renderPage('OAuthCallback')
    expect(screen.getByText(/sign-in failed — please try again/i)).toBeInTheDocument()
  })
})

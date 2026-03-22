import { render, screen } from '@testing-library/react'
import LandingPage from '@/app/page'

// HeroSignInButton is a client component — mock it
jest.mock('@/components/landing/HeroSignInButton', () => ({
  HeroSignInButton: () => <button>Sign in with Google</button>,
}))

describe('LandingPage', () => {
  it('renders the app name', () => {
    render(<LandingPage />)
    expect(screen.getByText('Cerebrocal')).toBeInTheDocument()
  })

  it('renders the tagline', () => {
    render(<LandingPage />)
    expect(screen.getByText('Your AI scheduling concierge')).toBeInTheDocument()
  })

  it('renders the description section heading', () => {
    render(<LandingPage />)
    expect(screen.getByText('What is Cerebrocal?')).toBeInTheDocument()
  })

  it('renders all four use case cards', () => {
    render(<LandingPage />)
    expect(screen.getByText('Schedule a meeting')).toBeInTheDocument()
    expect(screen.getByText('Find a free slot')).toBeInTheDocument()
    expect(screen.getByText('Add full details')).toBeInTheDocument()
    expect(screen.getByText('Confirm instantly')).toBeInTheDocument()
  })

  it('renders the footer copyright', () => {
    render(<LandingPage />)
    expect(screen.getByText('© 2026 Cerebrocal')).toBeInTheDocument()
  })

  it('renders the sign in button', () => {
    render(<LandingPage />)
    expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument()
  })

  it('renders the How It Works section heading', () => {
    render(<LandingPage />)
    expect(screen.getByText('How it works')).toBeInTheDocument()
  })

  it('renders all three How It Works steps', () => {
    render(<LandingPage />)
    expect(screen.getAllByText(/sign in with google/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/talk naturally/i)).toBeInTheDocument()
    expect(screen.getByText(/event booked instantly/i)).toBeInTheDocument()
  })

  it('renders the sample conversation section', () => {
    render(<LandingPage />)
    expect(screen.getByText('See it in action')).toBeInTheDocument()
    expect(screen.getByText(/schedule a meeting with sarah/i)).toBeInTheDocument()
  })

  it('renders the expanded features section', () => {
    render(<LandingPage />)
    expect(screen.getByText('Everything you need')).toBeInTheDocument()
    expect(screen.getAllByText(/real-time voice/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/timezone-aware/i)).toBeInTheDocument()
  })

  it('renders the privacy note', () => {
    render(<LandingPage />)
    expect(screen.getByText(/privacy first/i)).toBeInTheDocument()
    expect(screen.getByText(/we do not read your existing events/i)).toBeInTheDocument()
  })
})

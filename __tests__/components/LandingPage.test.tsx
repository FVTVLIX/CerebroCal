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
})

import { render, screen, fireEvent } from '@testing-library/react'
import { HeroSignInButton } from '@/components/landing/HeroSignInButton'

const mockSignIn = jest.fn()
jest.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

beforeEach(() => mockSignIn.mockReset())

describe('HeroSignInButton', () => {
  it('calls signIn with google and redirectTo /chat on click', () => {
    render(<HeroSignInButton />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockSignIn).toHaveBeenCalledWith('google', { redirectTo: '/chat' })
  })

  it('displays "Sign in with Google"', () => {
    render(<HeroSignInButton />)
    expect(screen.getByRole('button')).toHaveTextContent('Sign in with Google')
  })
})

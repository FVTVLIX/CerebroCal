import { render, screen, fireEvent } from '@testing-library/react'
import { SignInButton } from '@/app/signin/SignInButton'

const mockSignIn = jest.fn()
jest.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => mockSignIn(...args),
}))

beforeEach(() => mockSignIn.mockReset())

describe('SignInButton', () => {
  it('calls signIn with google and redirectTo /chat on click', () => {
    render(<SignInButton />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockSignIn).toHaveBeenCalledWith('google', { redirectTo: '/chat' })
  })

  it('displays "Continue with Google"', () => {
    render(<SignInButton />)
    expect(screen.getByRole('button')).toHaveTextContent('Continue with Google')
  })
})

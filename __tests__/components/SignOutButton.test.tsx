import { render, screen, fireEvent } from '@testing-library/react'
import { SignOutButton } from '@/components/SignOutButton'

const mockSignOut = jest.fn()
jest.mock('next-auth/react', () => ({
  signOut: (...args: unknown[]) => mockSignOut(...args),
}))

beforeEach(() => mockSignOut.mockReset())

describe('SignOutButton', () => {
  it('calls signOut with redirectTo / on click', () => {
    render(<SignOutButton />)
    fireEvent.click(screen.getByRole('button'))
    expect(mockSignOut).toHaveBeenCalledWith({ redirectTo: '/' })
  })

  it('displays "Sign out"', () => {
    render(<SignOutButton />)
    expect(screen.getByRole('button')).toHaveTextContent('Sign out')
  })
})

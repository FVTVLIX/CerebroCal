import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatusToast } from '@/components/StatusToast'
import { AppError } from '@/lib/types'

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const makeError = (overrides: Partial<AppError> = {}): AppError => ({
  code: 'token_fetch_failed',
  message: "Couldn't connect — check your API key",
  ...overrides,
})

describe('StatusToast', () => {
  beforeEach(() => jest.useFakeTimers())
  afterEach(() => jest.useRealTimers())

  it('renders nothing when error is null', () => {
    const { container } = render(<StatusToast error={null} onDismiss={jest.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the error message', () => {
    render(<StatusToast error={makeError()} onDismiss={jest.fn()} />)
    expect(screen.getByText(/couldn't connect/i)).toBeInTheDocument()
  })

  it('calls onDismiss after 5 seconds', () => {
    const onDismiss = jest.fn()
    render(<StatusToast error={makeError()} onDismiss={onDismiss} />)
    act(() => jest.advanceTimersByTime(5000))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when dismiss button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const onDismiss = jest.fn()
    render(<StatusToast error={makeError()} onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders retry button when error.retry is defined', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const retry = jest.fn()
    const onDismiss = jest.fn()
    render(<StatusToast error={makeError({ retry })} onDismiss={onDismiss} />)
    const retryBtn = screen.getByRole('button', { name: /retry/i })
    await user.click(retryBtn)
    expect(retry).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})

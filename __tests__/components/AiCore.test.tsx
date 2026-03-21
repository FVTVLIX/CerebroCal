import { render, screen } from '@testing-library/react'
import { AiCore } from '@/components/AiCore'

// Framer Motion fires real animations in tests — this mock renders children without animation
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className} {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

describe('AiCore', () => {
  it('renders without crashing for all status values', () => {
    const statuses = ['idle', 'connecting', 'listening', 'speaking', 'processing'] as const
    for (const status of statuses) {
      const { unmount } = render(<AiCore status={status} amplitude={0} />)
      // Should render an orb element
      expect(document.querySelector('[data-testid="ai-core-orb"]')).toBeTruthy()
      unmount()
    }
  })

  it('renders the connecting spinner ring when status is connecting', () => {
    render(<AiCore status="connecting" amplitude={0} />)
    expect(document.querySelector('[data-testid="connecting-ring"]')).toBeTruthy()
  })

  it('does not render connecting ring for other states', () => {
    render(<AiCore status="listening" amplitude={0} />)
    expect(document.querySelector('[data-testid="connecting-ring"]')).toBeNull()
  })
})

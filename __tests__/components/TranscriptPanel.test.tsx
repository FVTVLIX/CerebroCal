import { render, screen } from '@testing-library/react'
import { TranscriptPanel } from '@/components/TranscriptPanel'
import { TranscriptMessage } from '@/lib/types'

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className }: React.HTMLAttributes<HTMLDivElement>) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const makeMsg = (role: 'user' | 'ai', content: string): TranscriptMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  timestamp: Date.now(),
})

describe('TranscriptPanel', () => {
  it('shows the pre-session explainer when isActive is false', () => {
    render(<TranscriptPanel messages={[]} isActive={false} />)
    expect(screen.getByText(/speak naturally/i)).toBeInTheDocument()
  })

  it('shows messages when isActive is true', () => {
    const messages = [makeMsg('ai', 'Hello, how can I help?'), makeMsg('user', 'Schedule a meeting')]
    render(<TranscriptPanel messages={messages} isActive={true} />)
    expect(screen.getByText('Hello, how can I help?')).toBeInTheDocument()
    expect(screen.getByText('Schedule a meeting')).toBeInTheDocument()
  })

  it('does not show explainer when isActive is true', () => {
    render(<TranscriptPanel messages={[]} isActive={true} />)
    expect(screen.queryByText(/speak naturally/i)).not.toBeInTheDocument()
  })
})

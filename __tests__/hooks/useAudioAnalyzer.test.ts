import { renderHook, act } from '@testing-library/react'
import { useAudioAnalyzer } from '@/hooks/useAudioAnalyzer'

// Mock Web Audio API
const mockGetByteFrequencyData = jest.fn((arr: Uint8Array) => {
  arr.fill(128) // simulate mid-level audio
})
const mockConnect = jest.fn()
const mockDisconnect = jest.fn()
const mockClose = jest.fn()
const mockCreateAnalyser = jest.fn(() => ({
  fftSize: 256,
  frequencyBinCount: 128,
  getByteFrequencyData: mockGetByteFrequencyData,
  connect: mockConnect,
}))
const mockCreateMediaStreamSource = jest.fn(() => ({
  connect: mockConnect,
  disconnect: mockDisconnect,
}))

global.AudioContext = jest.fn().mockImplementation(() => ({
  createAnalyser: mockCreateAnalyser,
  createMediaStreamSource: mockCreateMediaStreamSource,
  close: mockClose,
  state: 'running',
})) as unknown as typeof AudioContext

// Mock requestAnimationFrame to run callback once immediately
let rafCallback: FrameRequestCallback | null = null
global.requestAnimationFrame = jest.fn((cb) => {
  rafCallback = cb
  return 1
}) as unknown as typeof requestAnimationFrame
global.cancelAnimationFrame = jest.fn()

function makeStream(): MediaStream {
  return {} as MediaStream
}

describe('useAudioAnalyzer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    rafCallback = null
  })

  it('returns amplitude 0 when stream is null', () => {
    const { result } = renderHook(() => useAudioAnalyzer(null))
    expect(result.current.amplitude).toBe(0)
    expect(global.AudioContext).not.toHaveBeenCalled()
  })

  it('creates AudioContext and starts RAF loop when stream is provided', () => {
    const stream = makeStream()
    const { result } = renderHook(() => useAudioAnalyzer(stream))

    expect(global.AudioContext).toHaveBeenCalledTimes(1)
    expect(mockCreateAnalyser).toHaveBeenCalledTimes(1)
    expect(global.requestAnimationFrame).toHaveBeenCalled()
  })

  it('closes AudioContext when stream becomes null', () => {
    const stream = makeStream()
    const { rerender } = renderHook(
      ({ s }: { s: MediaStream | null }) => useAudioAnalyzer(s),
      { initialProps: { s: stream } }
    )

    rerender({ s: null })
    expect(mockClose).toHaveBeenCalled()
    expect(global.cancelAnimationFrame).toHaveBeenCalled()
  })

  it('closes AudioContext on unmount', () => {
    const stream = makeStream()
    const { unmount } = renderHook(() => useAudioAnalyzer(stream))
    unmount()
    expect(mockClose).toHaveBeenCalled()
  })
})

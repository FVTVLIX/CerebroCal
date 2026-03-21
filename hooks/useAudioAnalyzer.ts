'use client'

import { useEffect, useRef, useState } from 'react'

export function useAudioAnalyzer(stream: MediaStream | null): { amplitude: number } {
  const [amplitude, setAmplitude] = useState(0)
  const rafRef = useRef<number | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (!stream) {
      setAmplitude(0)
      return
    }

    const audioCtx = new AudioContext()
    ctxRef.current = audioCtx

    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256

    const source = audioCtx.createMediaStreamSource(stream)
    source.connect(analyser)

    const dataArray = new Uint8Array(analyser.frequencyBinCount)

    const tick = () => {
      analyser.getByteFrequencyData(dataArray)

      // Compute RMS, normalize to 0–1
      const sum = dataArray.reduce((acc, v) => acc + v * v, 0)
      const rms = Math.sqrt(sum / dataArray.length)
      setAmplitude(Math.min(rms / 128, 1))

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      audioCtx.close()
      ctxRef.current = null
    }
  }, [stream])

  return { amplitude }
}

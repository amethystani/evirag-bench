import { useCallback, useEffect, useRef, useState } from 'react'
import type { RunData } from '../data'
import { deviceModeEnabled } from './config'
import type { Gpu } from './llm'

export type Phase = 'off' | 'checking' | 'unsupported' | 'idle' | 'downloading' | 'ready' | 'error'
export type DeviceResult = RunData | { notCovered: true; best: number }

export function useOnDevice() {
  const [phase, setPhase] = useState<Phase>(() => (deviceModeEnabled() ? 'checking' : 'off'))
  const [gpu, setGpu] = useState<Gpu | null>(null)
  const [progress, setProgress] = useState(0)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [cached, setCached] = useState(false)
  const model = useRef('')
  const engine = useRef<Awaited<ReturnType<typeof import('./llm').loadEngine>> | null>(null)

  const enable = useCallback(async (g: Gpu | null = gpu) => {
    if (!g?.supported) return
    setPhase('downloading'); setProgress(0); setError('')
    try {
      const { loadEngine } = await import('./llm')
      engine.current = await loadEngine(model.current, (f, t) => { setProgress(f); setNote(t) })
      setCached(true)
      setPhase('ready')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('error')
    }
  }, [gpu])

  useEffect(() => {
    if (!deviceModeEnabled()) return
    let live = true
    ;(async () => {
      const { gpuState, isCached, modelFor } = await import('./llm')
      const g = await gpuState()
      if (!live) return
      setGpu(g)
      if (!g.supported) { setPhase('unsupported'); return }
      model.current = modelFor(g)
      const c = await isCached(model.current)
      if (!live) return
      setCached(c)
      if (c) void enable(g)   // already downloaded: bring it up quietly
      else setPhase('idle')
    })()
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const answer = useCallback(async (question: string, onStage: (s: string) => void, signal: AbortSignal): Promise<DeviceResult> => {
    if (!engine.current) throw new Error('The on-device model is not loaded.')
    const { runPipeline } = await import('./pipeline')
    return runPipeline(engine.current, question, model.current.replace('-MLC', ''), onStage, signal)
  }, [])

  const remove = useCallback(async () => {
    const { removeModel } = await import('./llm')
    await removeModel()
    engine.current = null
    setCached(false)
    setPhase(gpu?.supported ? 'idle' : 'unsupported')
  }, [gpu])

  return { phase, gpu, progress, note, error, cached, enable: () => enable(), answer, remove }
}
export type OnDevice = ReturnType<typeof useOnDevice>

import { CreateWebWorkerMLCEngine, deleteModelAllInfoInCache, hasModelInCache } from '@mlc-ai/web-llm'
import type { WebWorkerMLCEngine } from '@mlc-ai/web-llm'

import { MODEL_F16, MODEL_F32 } from './config'
export { DOWNLOAD_MB, MODEL_F16, MODEL_F32 } from './config'

export type Gpu = { supported: boolean; f16: boolean; reason?: string }

export async function gpuState(): Promise<Gpu> {
  const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<{ features: Set<string> } | null> } }
  if (!nav.gpu) return { supported: false, f16: false, reason: 'This browser has no WebGPU.' }
  try {
    const a = await nav.gpu.requestAdapter()
    if (!a) return { supported: false, f16: false, reason: 'No usable graphics adapter was found.' }
    return { supported: true, f16: a.features.has('shader-f16') }
  } catch (e) {
    return { supported: false, f16: false, reason: String(e) }
  }
}

export const modelFor = (g: Gpu) => (g.f16 ? MODEL_F16 : MODEL_F32)
export const isCached = (model: string) => hasModelInCache(model).catch(() => false)
export const removeModel = async () => { await Promise.all([deleteModelAllInfoInCache(MODEL_F16), deleteModelAllInfoInCache(MODEL_F32)]).catch(() => {}) }

let engineP: Promise<WebWorkerMLCEngine> | null = null
export function loadEngine(model: string, onProgress: (fraction: number, text: string) => void) {
  engineP ??= CreateWebWorkerMLCEngine(
    new Worker(new URL('./llm.worker.ts', import.meta.url), { type: 'module' }),
    model,
    { initProgressCallback: (r) => onProgress(r.progress, r.text) }
  ).catch((e) => { engineP = null; throw e })
  return engineP
}

export async function generate(engine: WebWorkerMLCEngine, system: string, user: string, maxTokens: number) {
  const r = await engine.chat.completions.create({
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    temperature: 0,
    max_tokens: maxTokens
  })
  return (r.choices[0]?.message?.content ?? '').trim()
}

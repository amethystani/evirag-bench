// Constants shared with the UI. Kept free of heavy imports so the normal page never loads the model libraries.
export const MODEL_F16 = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
export const MODEL_F32 = 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC'
export const DOWNLOAD_MB = 350
export class Cancelled extends Error {}

/** On-device mode is opt-in while it is being verified: add ?device=1 to the address to switch it on. */
export const deviceModeEnabled = () => typeof location !== 'undefined' && /[?&]device=1(&|$)/.test(location.search)

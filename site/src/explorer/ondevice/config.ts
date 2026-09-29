// Constants shared with the UI. Kept free of heavy imports so the normal page never loads the model libraries.
export const MODEL_F16 = 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC'
export const MODEL_F32 = 'Qwen2.5-0.5B-Instruct-q4f32_1-MLC'
export const DOWNLOAD_MB = 460
export class Cancelled extends Error {}

/** On-device answering is on by default. Add ?device=0 to the address to turn it off. */
export const deviceModeEnabled = () => !(typeof location !== 'undefined' && /[?&]device=0(&|$)/.test(location.search))

import { Progress } from '@nous-research/ui'
import { DOWNLOAD_MB } from './config'
import type { OnDevice } from './useOnDevice'

export function DevicePanel({ device }: { device: OnDevice }) {
  const { phase, gpu, progress, note, error } = device
  if (phase === 'off' || phase === 'checking') return null
  if (phase === 'ready') return <p className="dev-ready"><i aria-hidden /> On-device model ready. Questions in all five domains are answered on this device.</p>
  if (phase === 'unsupported') {
    return (
      <div className="dev-card">
        <p className="dev-title">On-device answers are not available here</p>
        <p className="dev-body">{gpu?.reason ?? 'This browser cannot run the model.'} You need WebGPU, for example a recent Chrome, Edge or Safari on a laptop or newer phone. The worked example below still works.</p>
      </div>
    )
  }
  if (phase === 'downloading') {
    return (
      <div className="dev-card" aria-live="polite">
        <p className="dev-title">Getting the model ready</p>
        <Progress aria-label="Model download" value={Math.round(progress * 100)} />
        <p className="dev-body dev-note">{note || 'Starting…'}</p>
      </div>
    )
  }
  if (phase === 'error') {
    return (
      <div className="dev-card">
        <p className="dev-title">The model could not start</p>
        <p className="dev-body">{error}</p>
        <button className="dev-btn" onClick={device.enable}>Try again</button>
      </div>
    )
  }
  return (
    <div className="dev-card">
      <p className="dev-title">Answer on this device</p>
      <p className="dev-body">Download a small model once (about {DOWNLOAD_MB} MB) and EVIRAG answers questions about education, biomedicine, economics, earth sciences and nutrition right in your browser, using {`45`} openly licensed abstracts. Your questions never leave your device. The model comes from Hugging Face and your browser keeps it for next time.</p>
      <button className="dev-btn" onClick={device.enable}>Download once and turn on</button>
    </div>
  )
}

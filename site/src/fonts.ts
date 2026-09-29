// Registers Sigurd Variable and Rules Variable if their files exist in src/fonts.
// Nothing is requested when the files are absent, so the fallbacks in styles.css apply.
const files = import.meta.glob('./fonts/*.woff2', { eager: true, query: '?url', import: 'default' }) as Record<string, string>

const faces: [string, string, string][] = [
  ['Sigurd-Variable', 'Sigurd Variable', '300 800'],
  ['Rules-Variable', 'Rules Variable', '300 700']
]

const css = faces
  .map(([file, family, weight]) => {
    const url = files[`./fonts/${file}.woff2`]
    return url
      ? `@font-face{font-family:'${family}';src:url('${url}') format('woff2');font-weight:${weight};font-display:swap}`
      : ''
  })
  .join('')

if (css) {
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}

// Replaces the few brand strings that @nous-research/ui hardcodes in its dist files.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const ui = 'node_modules/@nous-research/ui/dist/ui/'
const REPO = 'https://github.com/amethystani/evirag-bench'

const edits = {
  'hermes-landing/sections/landing-floating-badge-panel.js': [['children: "Hermes"', 'children: "Evirag"']],
  'components/logos/hermes-logo.js': [['children: "Hermes"', 'children: "Evirag"'], ['children: "Agent"', 'children: "Bench"']],
  'hermes-landing/sections/landing-portal-footer.js': [
    ['jsx("span", { children: "Nous" })', 'jsx("span", { children: "Evirag" })'],
    ['children: "Portal" })', 'children: "Paper" })']
  ],
  'components/footer/hermes-footer-chrome.js': [
    ['https://github.com/NousResearch', REPO],
    [/,\s*\{\s*href: "https:\/\/discord\.gg\/NousResearch",\s*icon: DiscordIcon,\s*label: "Discord"\s*\}/, ''],
    ['{ href: "/terms", label: "Terms" }', `{ href: "${REPO}/blob/main/LICENSE", label: "License" }`],
    ['{ href: "/privacy", label: "Privacy" }', `{ href: "${REPO}/blob/main/SECURITY.md", label: "Security" }`]
  ],
  'components/footer/index.js': [
    ['href: "https://nousresearch.com"', `href: "${REPO}"`],
    ['"Nous Research"', '"Evirag"'],
    ['"Hermes Agent v0.17.0"', '"Evirag Bench v0.1.0"']
  ],
  'components/landing-download-button/index.js': [
    ['`Download for ${platform.title}`', '"Download source code"'],
    ['linux ? "Install via terminal"', 'linux ? "Run locally"']
  ],
  'components/platform-card/index.js': [['installLabel = "Install via terminal"', 'installLabel = "Run locally"']],
  'components/install-command/index.js': [
    ['children: "macOS / Linux"', 'children: "Cargo"'],
    ['children: "Windows"', 'children: "Git"']
  ],
  'hermes-landing/sections/landing-features.js': [['{ children: "Preview" }', '{ children: "Overview" }']],
  'components/badges/nous-girl.js': [['return /* @__PURE__ */ jsx("img"', 'return null; /* @__PURE__ */ jsx("img"']]
}

for (const [file, pairs] of Object.entries(edits)) {
  const path = ui + file
  if (!existsSync(path)) continue
  let src = readFileSync(path, 'utf8')
  for (const [from, to] of pairs) src = typeof from === 'string' ? src.split(from).join(to) : src.replace(from, to)
  writeFileSync(path, src)
}

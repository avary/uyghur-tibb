import { cp, mkdir, access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const src = join(here, '..', '..', 'pdf')
const dest = join(here, '..', 'dist', 'pdf')

try {
  await access(src)
} catch {
  console.log('[copy-pdf] no repo-root pdf/ directory — skipping')
  process.exit(0)
}
await mkdir(join(here, '..', 'dist'), { recursive: true })
await cp(src, dest, { recursive: true })
console.log('[copy-pdf] copied pdf/ -> vite/dist/pdf')
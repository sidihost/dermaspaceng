// Count lines of code across the repo, broken down by extension.
// Skips node_modules, .next, .git, and other build artefacts.
import { promises as fs } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.cwd())
const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.vercel',
  'dist',
  'build',
  'coverage',
  '.turbo',
  'user_read_only_context',
])
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.sql', '.json', '.md'])

const stats = {}
let totalFiles = 0
let totalLines = 0

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name) || entry.name.startsWith('.')) continue
      await walk(full)
      continue
    }
    const ext = path.extname(entry.name).toLowerCase()
    if (!EXTS.has(ext)) continue
    // Skip package-lock.json / pnpm-lock etc.
    if (entry.name.endsWith('lock.json') || entry.name === 'pnpm-lock.yaml') continue

    const content = await fs.readFile(full, 'utf8')
    const lines = content.split('\n').length
    if (!stats[ext]) stats[ext] = { files: 0, lines: 0 }
    stats[ext].files += 1
    stats[ext].lines += lines
    totalFiles += 1
    totalLines += lines
  }
}

await walk(ROOT)

// Print a clean summary
const rows = Object.entries(stats)
  .sort((a, b) => b[1].lines - a[1].lines)
  .map(([ext, s]) => `  ${ext.padEnd(6)} ${String(s.files).padStart(4)} files   ${String(s.lines).padStart(7)} lines`)

console.log('[v0] Dermaspace codebase summary')
console.log('---------------------------------')
console.log(rows.join('\n'))
console.log('---------------------------------')
console.log(`  TOTAL  ${String(totalFiles).padStart(4)} files   ${String(totalLines).padStart(7)} lines`)

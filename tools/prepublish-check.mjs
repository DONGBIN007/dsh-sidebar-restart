/**
 * Refuses to publish a package that is not actually ready.
 *
 * Run automatically by `npm publish` (the `prepublishOnly` hook), and by hand
 * with `node tools/prepublish-check.mjs`. Publishing is irreversible in the sense
 * that matters here - a version number can be unpublished for only 72 hours and
 * every mirror keeps serving the bad bytes - so the checks are worth more than
 * the seconds they cost.
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const problems = []

const readJson = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'))
const pkg = readJson('package.json')

// 1. No placeholder may reach the registry. `__OWNER__` is the one token that
//    cannot be guessed from this machine: it is the GitHub account that hosts
//    the repository the marketplace entry links to.
const PLACEHOLDER = /__[A-Z_]+__/u
const TEXT_FILES = [
  'package.json',
  'LICENSE',
  'README.md',
  'index.js',
  'client.js',
  'cordis.patch.yml',
]
for (const f of TEXT_FILES) {
  if (!existsSync(join(root, f))) continue
  const text = readFileSync(join(root, f), 'utf8')
  for (const m of text.matchAll(new RegExp(PLACEHOLDER, 'gu'))) {
    problems.push(`${f}: placeholder ${m[0]} still present - fill it in before publishing`)
  }
}

// 2. Everything `files` promises must exist, or npm ships a package missing the
//    very files the manifest makes the loader look for.
for (const entry of pkg.files ?? []) {
  if (!existsSync(join(root, entry))) problems.push(`files: ${entry} is listed but missing`)
}
// The loader reads these two by path, so they cannot be dropped by `files`.
for (const required of ['index.js', 'client.js', 'cordis.patch.yml', 'package.json']) {
  if (!(pkg.files ?? []).includes(required) && !existsSync(join(root, required))) {
    problems.push(`${required} does not exist`)
  }
}
for (const required of ['index.js', 'client.js', 'cordis.patch.yml']) {
  if (!(pkg.files ?? []).includes(required)) problems.push(`${required} must be in "files" - dsh plugin add loads it by path`)
}

// 3. The two manifest halves the marketplace listing is built on.
if (pkg.dsh?.bundle?.patch === undefined) problems.push('dsh.bundle.patch is missing - the listing bar requires it')
if (pkg.private === true) problems.push('"private": true would make npm refuse the publish')

// 4. A description is what the market card shows; an empty one is a blank card.
if (typeof pkg.description !== 'string' || pkg.description.length < 30) {
  problems.push('description is too short to read as a market card')
}

if (problems.length === 0) {
  console.log(`prepublish-check: OK - ${pkg.name}@${pkg.version} is ready to publish`)
  console.log('  next: npm publish, then open the marketplace PR (see RELEASE.md)')
  process.exit(0)
}
console.error(`prepublish-check: ${problems.length} problem(s) - refusing to publish:`)
for (const p of problems) console.error('  - ' + p)
process.exit(1)

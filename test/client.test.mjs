// Locks the Client half's contract.
//
// The client bundle is plain JavaScript loaded by the page's module loader, so
// it cannot be imported here. These assertions read its text instead: they pin
// the facts that are easy to break by accident and invisible until a user sees
// a wrong or unstyled button.
//
// The authoritative copies of the artwork and tokens live in the shipped
// primitives/theme; when this file and those disagree, the shipped ones win.

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'

const here = dirname(fileURLToPath(import.meta.url))
const CLIENT = readFileSync(join(here, '..', 'client.js'), 'utf8')

/**
 * The bundle without its comments.
 *
 * The client half cites the shipped packages it copies from - that provenance is
 * wanted - so a check for "does this file mention package X" must look at code,
 * not at prose.
 */
const CODE = CLIENT.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/[^\n]*$/gmu, '')

test('client half registers the lazy factory the module loader requires', () => {
  assert.match(CLIENT, /window\.__ModuleLoader__\.load\(\{/u)
  assert.match(CLIENT, /id: '@local\/dsh-desktop-restart'/u)
  // React is the only module a plain client bundle may ask for.
  const requires = [...CODE.matchAll(/require\(([^)]+)\)/gu)].map((m) => m[1].trim())
  assert.deepEqual([...new Set(requires)], ["'react'"])
})

test('client half asks for no Harness Client package', () => {
  // The plugin rules forbid it: those packages change without notice and a plain
  // plugin has no type check, so a broken import blanks the slot entry.
  assert.equal(/require\(\s*['"]@deepseek-ai\//u.test(CODE), false)
  assert.equal(/@deepseek-ai\//u.test(CODE), false)
  // It may still *name* them in comments, which is how the copied artwork and
  // copied token names stay attributable.
  assert.match(CLIENT, /IconRefreshOutlineArtwork/u)
})

test('the button shows a label exactly when the host does', () => {
  // The label is required in the wide column (this request asked for it) and must
  // vanish in the collapsed rail, where 36px cannot hold text.
  assert.equal(/['"]action\.label['"]/u.test(CLIENT), true)
  // Both locales carry it.
  assert.equal([...CODE.matchAll(/^\s*'action\.label':/gmu)].length, 2)
  // And the dictionary still describes the action for assistive technology.
  assert.equal([...CODE.matchAll(/^\s*'action\.aria':/gmu)].length, 2)
  assert.match(CODE, /'aria-label':/u)
})

test('the tooltip is present whether or not the button is enabled', () => {
  // `dsh-web` runs as a plain web page too, where a disabled button receives no
  // hover events - so the accessible name is what carries the reason there, and
  // it must never be empty while the status is still in flight.
  assert.match(CODE, /title: tooltip/u)
  assert.match(CODE, /loading \? t\('action\.checking'\) : \(ready \? t\('action\.title'\) : reasonText\)/u)
  assert.match(CODE, /'aria-label': accessibleName/u)
  assert.match(CODE, /const accessibleName = ready\s*\n?\s*\? t\('action\.aria'\)\s*\n?\s*: \(reasonText === '' \? t\('action\.checking'\) : reasonText\)/u)
  assert.equal(/unavailable\.short/u.test(CLIENT), false, 'no duplicate prefix key')
})

test('the glyph is the shipped IconRefreshOutline artwork, not a redraw', () => {
  // Both paths, byte for byte, from @deepseek-ai/dsh-client-ui-primitives.
  assert.match(CLIENT, /M14\.5001 8C14\.5 9\.28552/u)
  assert.match(CLIENT, /M14\.4999 1\.5V5\.1H10\.8999/u)
  // A redrawn glyph would have different coordinates; there must be no third path.
  const paths = CLIENT.match(/h\('path', \{/gu) ?? []
  assert.equal(paths.length, 2, 'exactly the two official paths')
})

test('the svg matches the host icon conventions', () => {
  // 1.3 is ICON_MEDIUM_STROKE in the shipped primitives.
  assert.match(CLIENT, /const ICON_STROKE = 1\.3/u)
  assert.match(CLIENT, /stroke: 'currentColor'/u)
  assert.match(CLIENT, /'aria-hidden': true/u)
  // The official artwork uses default butt caps; adding round caps would change it.
  assert.equal(/strokeLinecap/u.test(CLIENT), false)
})

test('the glyph is scaled to the gear\'s ink, without thinning its stroke', () => {
  // The two official glyphs carry different ink in the same 16 box - the gear
  // 13.45 units, the refresh arc 14.30, ~6% more - which is what made the arc read
  // as the bigger, heavier icon in the row next door. The box stays 16px (so the
  // label keeps the gear's x), and the viewBox is widened so the DRAWN glyph lands
  // on the gear's ink.
  assert.match(CLIENT, /const GLYPH_SCALE = 0\.9346/u, 'the measured gear/arc ink ratio')
  assert.match(CLIENT, /const VIEW_BOX = 16 \/ GLYPH_SCALE/u)
  assert.match(CLIENT, /const VIEW_BOX_MIN = 8 - VIEW_BOX \/ 2/u)
  // The viewBox is widened and re-centred, and is no longer the bare 16 grid.
  assert.match(CLIENT, /viewBox: `\$\{VIEW_BOX_MIN\} \$\{VIEW_BOX_MIN\} \$\{VIEW_BOX\} \$\{VIEW_BOX\}`/u)
  assert.equal(/viewBox: '0 0 16 16'/u.test(CLIENT), false, 'no longer the unadjusted grid')
  // The stroke is divided by the same factor, so the painted stroke stays at 1.3.
  // Scaling alone would thin it and trade one mismatch for another.
  assert.match(CLIENT, /strokeWidth: ICON_STROKE \/ GLYPH_SCALE/u)
  // The path data itself is still the shipped artwork, not a redraw.
  assert.equal(CLIENT.match(/h\('path', \{/gu)?.length, 2)
})

test('the control is styled as the settings-gear row beside it', () => {
  // The gear row (`.wCInkW_trigger` in ui-settings-general, and the footer
  // sibling `.dsh-mobile-control__trigger`) agree on these; matching them is what
  // makes the two read as one row.
  assert.match(CLIENT, /height: '42px'/u, 'row height')
  assert.match(CLIENT, /borderRadius: 'var\(--dsw-radius-md\)'/u, 'gear radius, not the small one')
  assert.match(CLIENT, /padding: '0 10px 0 8px'/u, 'gear padding')
  assert.match(CLIENT, /fontSize: '14px'/u, 'gear label size')
  assert.match(CLIENT, /lineHeight: '22px'/u, 'gear label line height')
  assert.match(CLIENT, /fontFamily: 'inherit'/u, 'inherit the host font')
  assert.match(CLIENT, /gap: '8px'/u, 'icon/label gap')
  assert.match(CLIENT, /var\(--dsw-alias-interactive-bg-hover\)/u, 'hover token')
})

test('the row bleeds like the gear row, so the two left edges line up', () => {
  // The gear's row is `width:calc(100% + 4px); margin:4px -2px`, so its content
  // begins 2px LEFT of the column's own content box. Without the same bleed this
  // button's icon and label sit 2px to the right of the gear's - the visible
  // "not lined up" between the two rows.
  const buttonStyle = CODE.match(/button:\s*\{[\s\S]*?\n(\s*)\},/u)?.[0] ?? ''
  assert.notEqual(buttonStyle, '', 'the button style object was located')
  assert.match(buttonStyle, /width: 'calc\(100% \+ 4px\)'/u, 'the gear row bleed')
  assert.match(buttonStyle, /margin: '4px -2px'/u, 'the matching negative margin')
  // The rail overrides both, so the bleed must not leak into the 56px column.
  const railStyle = CODE.match(/rail:\s*\{[\s\S]*?\n(\s*)\},/u)?.[0] ?? ''
  assert.match(railStyle, /width: '36px'/u)
  assert.match(railStyle, /margin: '8px 0 10px'/u)
})

test('the colour is the gear primary label colour, not the secondary one', () => {
  // A secondary icon beside a primary-coloured gear is the exact mismatch this
  // alignment fixes, so the regression is worth pinning. The check is scoped to
  // the button: the dialogs' body text is *supposed* to stay secondary.
  const buttonStyle = CODE.match(/button:\s*\{[\s\S]*?\n(\s*)\},/u)?.[0] ?? ''
  assert.notEqual(buttonStyle, '', 'the button style object was located')
  assert.match(buttonStyle, /color: 'var\(--dsw-alias-label-primary\)'/u)
  assert.equal(/--dsw-alias-label-secondary/u.test(buttonStyle), false, 'the button must not use the secondary colour')
  // And the dialog copy is still allowed to be secondary.
  assert.match(CODE, /--dsw-alias-label-secondary/u)
})

test('the label follows the host `wide` convention', () => {
  // The gear's own TriggerContent renders its label only when `wide`, and goes
  // icon-only in the 56px rail. This plugin must not invent its own breakpoint.
  assert.match(CODE, /function RestartButton\(\{ wide \}\)/u)
  // A truthy check, not `=== true`: this is the host's own expression
  // (`wide && <label>`), so an undefined prop behaves exactly as it does there.
  assert.match(CODE, /const showLabel = wide\b/u)
  assert.match(CODE, /showLabel && h\('span'/u)
  // Rail metrics copied from the host: 36x36, no gap.
  assert.match(CLIENT, /width: '36px'/u)
  assert.match(CLIENT, /height: '36px'/u)
  assert.match(CODE, /showLabel \? 16 : 18/u, 'icon grows in the rail, as the gear does')
})

test('the seat props are forwarded, not swallowed', () => {
  // The regression this pins: a registered component that takes no parameters
  // drops the owner's `wide`, so the control stays in its icon-only shape in the
  // wide column and on the mobile drawer while still rendering "fine".
  const seated = CODE.match(/function Seated\(([^)]*)\)[\s\S]*?\n(\s*)\}/u)
  assert.notEqual(seated, null, 'the registered component was located')
  assert.equal(seated[1].trim(), 'props', 'it accepts the slot props')
  assert.match(seated[0], /h\(RestartButton, props\)/u, 'and passes them to the button')
  // The button consumes them.
  assert.match(CODE, /function RestartButton\(\{ wide \}\)/u)
})

test('the progress dialog is dismissable, not a dead end', () => {
  // Escape and the scrim both route through onClose, so a no-op `onClose` traps
  // the user behind the modal whenever the handoff does not land.
  const progress = CODE.match(/phase === 'progress' &&[\s\S]*?labelledBy: 'dsh-restart-progress'/u)?.[0] ?? ''
  assert.notEqual(progress, '', 'the progress dialog was located')
  assert.match(progress, /onClose: \(\) => setPhase\('idle'\)/u)
  assert.equal(/onClose: \(\) => \{\}/u.test(progress), false, 'not a no-op')
})

test('the page moves onto the new bundle once the host returns', () => {
  // The point of the plugin: after installing a plugin the tab must end up on the
  // NEW code, not left on the old bundle still showing the progress dialog.
  assert.match(CODE, /window\.location\.reload\(\)/u)
  assert.match(CODE, /bootId/u)
  assert.match(CODE, /id !== beforeBoot/u)
  // A cap, so a restart that never lands hands the UI back instead of trapping.
  assert.match(CODE, /const POLL_LIMIT = \d+/u)
  assert.match(CODE, /attempts >= POLL_LIMIT/u)
  // The pending tick is cleared when the component goes away.
  assert.match(CODE, /window\.clearTimeout\(pollRef\.current\)/u)
  // Waiting is read-only: the poll must not issue another POST.
  const poll = CODE.slice(CODE.indexOf('const tick = async () =>'), CODE.indexOf('pollRef.current = window.setTimeout(tick, POLL_MS)\n        } catch'))
  assert.notEqual(poll, '', 'the poll body was located')
  assert.equal(/method: 'POST'/u.test(poll), false, 'the poll only reads')
})

test('the rail radius matches the GEAR, not the mobile control', () => {
  // The two host references disagree in the rail, and the choice is visible:
  //   .wCInkW_trigger.wCInkW_rail          -> keeps --dsw-radius-md (rounded square)
  //   .dsh-mobile-control__trigger.is-rail -> border-radius: 50% (a circle)
  // Matching the gear (settings) is the requirement here, so a 50% radius would
  // read as a different control family sitting in the same row.
  const railStyle = CODE.match(/rail:\s*\{[\s\S]*?\n(\s*)\},/u)?.[0] ?? ''
  assert.notEqual(railStyle, '', 'the rail style object was located')
  assert.match(railStyle, /borderRadius: 'var\(--dsw-radius-md\)'/u)
  assert.equal(/'50%'/u.test(railStyle), false, 'not the circle')
  // The gear's rail row spacing, which this button carries itself.
  assert.match(railStyle, /margin: '8px 0 10px'/u)
})

test('no literal colours outside artwork overlays', () => {
  // Every colour a user sees in light and dark must come from a theme token.
  // The exceptions are the scrim, the on-brand primary button text, and
  // `transparent` (a keyword, not a colour the theme should own).
  const literals = [...CODE.matchAll(/(?:background|color):\s*'([^']+)'/gu)]
    .map((m) => m[1])
    .filter((value) => !value.startsWith('var(') && value !== 'transparent')
  assert.deepEqual(literals.sort(), ['#fff', 'rgba(0, 0, 0, 0.45)'])
})

test('the registry seat and its registration are unchanged', () => {
  assert.match(CLIENT, /const SLOT = 'sidebar\.footer\.action'/u)
  assert.match(CLIENT, /name: SLOT, id: SLOT_ID, order: 60/u)
  // The seat's owner prop is consumed (the label depends on it) rather than ignored.
  assert.match(CODE, /\{ wide \}/u)
})

test('the destructive call is a JSON POST, and nothing else writes', () => {
  const posts = CLIENT.match(/method: 'POST'/gu) ?? []
  assert.equal(posts.length, 1)
  assert.match(CLIENT, /'content-type': 'application\/json'/u)
  // The only mutation in this bundle is the restart request.
  assert.equal(/\bmethod: '(?:PUT|DELETE|PATCH)'/u.test(CLIENT), false)
})

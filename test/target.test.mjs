import assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildHelperSource } from '../lib/helper.js'
import {
  DESKTOP_NODE_MARKER,
  inspectDesktopTarget,
  readiness,
  relaunchEnvironment,
  restartSupport,
} from '../lib/target.js'

test('inspectDesktopTarget: a plain node process is not the desktop', () => {
  const result = inspectDesktopTarget({ env: {}, execPath: 'C:\\node\\node.exe', exists: () => true })
  assert.equal(result.desktop, false)
  assert.equal(result.reason, 'not-desktop')
})

test('inspectDesktopTarget: the marker alone is not enough', () => {
  // An Electron CLI run in Node mode also sets the marker; only the archive
  // beside the executable distinguishes the desktop application.
  const result = inspectDesktopTarget({
    env: { [DESKTOP_NODE_MARKER]: '1' },
    execPath: 'C:\\app\\exe.exe',
    exists: () => false,
  })
  assert.equal(result.desktop, false)
  assert.equal(result.reason, 'no-app-archive')
})

test('inspectDesktopTarget: accepts the desktop layout', () => {
  const result = inspectDesktopTarget({
    env: { [DESKTOP_NODE_MARKER]: '1' },
    execPath: 'C:\\Program Files\\Harness\\Harness.exe',
    exists: (path) => path === 'C:\\Program Files\\Harness\\resources\\app.asar',
  })
  assert.equal(result.desktop, true)
  assert.equal(result.executable, 'C:\\Program Files\\Harness\\Harness.exe')
})

test('inspectDesktopTarget: falls back to the published executable path', () => {
  const result = inspectDesktopTarget({
    env: { [DESKTOP_NODE_MARKER]: '1', DSH_DESKTOP_NODE_EXECUTABLE: 'D:\\app\\app.exe' },
    execPath: 'C:\\stale\\stale.exe',
    exists: (path) => path === 'D:\\app\\resources\\app.asar',
  })
  assert.equal(result.desktop, true)
  assert.equal(result.executable, 'D:\\app\\app.exe')
})

test('relaunchEnvironment: strips the Node-mode markers', () => {
  const cleaned = relaunchEnvironment({
    [DESKTOP_NODE_MARKER]: '1',
    DSH_DESKTOP_NODE_EXECUTABLE: 'D:\\app\\app.exe',
    PATH: 'keep-me',
  })
  assert.equal(DESKTOP_NODE_MARKER in cleaned, false)
  assert.equal('DSH_DESKTOP_NODE_EXECUTABLE' in cleaned, false)
  assert.equal(cleaned.PATH, 'keep-me')
})

test('relaunchEnvironment: does not mutate its input', () => {
  const source = { [DESKTOP_NODE_MARKER]: '1' }
  relaunchEnvironment(source)
  assert.equal(source[DESKTOP_NODE_MARKER], '1')
})

test('restartSupport: windows is verified, posix is allowed but unverified, the rest is refused', () => {
  assert.deepEqual(restartSupport('win32'), { supported: true, mode: 'taskkill', verified: true })
  assert.equal(restartSupport('linux').supported, true)
  assert.equal(restartSupport('linux').verified, false)
  assert.equal(restartSupport('aix').supported, false)
})

test('readiness: not the desktop means not ready with a reason', () => {
  const verdict = readiness({
    target: { desktop: false, reason: 'not-desktop', detail: 'plain node' },
    platform: 'win32',
    hostPid: 10,
    parentPid: 11,
  })
  assert.equal(verdict.ready, false)
  assert.equal(verdict.reason, 'not-desktop')
  assert.equal(verdict.detail, 'plain node')
})

test('readiness: a missing parent process blocks the restart', () => {
  const verdict = readiness({
    target: { desktop: true, executable: 'C:\\app\\app.exe' },
    platform: 'win32',
    hostPid: 10,
    parentPid: 0,
  })
  assert.equal(verdict.ready, false)
  assert.equal(verdict.reason, 'no-parent')
})

test('readiness: the happy path carries every launch fact', () => {
  const verdict = readiness({
    target: { desktop: true, executable: 'C:\\app\\app.exe' },
    platform: 'win32',
    hostPid: 10,
    parentPid: 11,
  })
  assert.equal(verdict.ready, true)
  assert.equal(verdict.executable, 'C:\\app\\app.exe')
  assert.equal(verdict.hostPid, 10)
  assert.equal(verdict.electronPid, 11)
  assert.equal(verdict.mode, 'taskkill')
})

test('helper source: embeds the launch facts as JSON, not as code', () => {
  const source = buildHelperSource({
    executable: 'C:\\app\\app.exe',
    electronPid: 11,
    hostPid: 10,
    platform: 'win32',
    logPath: 'C:\\temp\\log.txt',
  })
  assert.match(source, /"executable": "C:\\\\app\\\\app\.exe"/u)
  assert.match(source, /"electronPid": 11/u)
  assert.match(source, /"hostPid": 10/u)
  assert.equal(source.includes('${'), false)
})

test('helper source: strips the marker before relaunching', () => {
  const source = buildHelperSource({ executable: 'x', electronPid: 1, hostPid: 2 })
  assert.match(source, /delete env\[config\.strippedEnvKey\]/u)
  // Case-insensitive sweep matters on Windows, where the env block is not.
  assert.match(source, /toUpperCase\(\) === config\.strippedEnvKey/u)
  assert.match(source, /detached: true/u)
  assert.match(source, /child\.unref\(\)/u)
})

test('helper source: kills by pid without a process tree', () => {
  const source = buildHelperSource({ executable: 'x', electronPid: 1, hostPid: 2 })
  assert.match(source, /taskkill/u)
  assert.match(source, /\['\/pid', String\(pid\), '\/f'\]/u)
  // A `/t` would walk into the helper's own tree and kill it mid-handoff.
  assert.equal(source.includes("'/t'"), false)
})

test('helper source: waits for the handoff before killing', () => {
  const source = buildHelperSource({ executable: 'x', electronPid: 1, hostPid: 2, handoffDelayMs: 250 })
  assert.match(source, /"handoffDelayMs": 250/u)
  assert.match(source, /await delay\(config\.handoffDelayMs\)/u)
})

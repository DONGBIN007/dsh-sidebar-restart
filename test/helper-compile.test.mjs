// Validates that the generated helper program is syntactically real JavaScript.
//
// The helper is produced as a string, so "it looks right" is not enough: this
// compiles it with `vm.Script` (which parses without executing) so a broken
// handoff can never be shipped. Nothing here runs the helper.

import assert from 'node:assert/strict'
import { test } from 'node:test'
import vm from 'node:vm'

import { buildHelperSource } from '../lib/helper.js'

test('the generated helper compiles as JavaScript', () => {
  const source = buildHelperSource({
    executable: 'C:\\Program Files\\Harness\\Harness.exe',
    electronPid: 1234,
    hostPid: 5678,
    platform: 'win32',
    logPath: 'C:\\Users\\me\\AppData\\Local\\Temp\\dsh-desktop-restart-x.log',
  })
  // Parses the whole program; throws on any syntax error.
  assert.doesNotThrow(() => new vm.Script(source))
})

test('the generated helper carries no process-tree kill', () => {
  const source = buildHelperSource({ executable: 'x', electronPid: 1, hostPid: 2, platform: 'win32' })
  // `/t` would include the helper's own tree, killing it mid-handoff.
  assert.equal(source.includes("'/t'"), false)
  assert.equal(source.includes('"/t"'), false)
})

test('the generated helper survives a path with quotes and backslashes', () => {
  // The config is embedded as JSON, so a hostile-looking path must not become code.
  const source = buildHelperSource({
    executable: 'C:\\odd \\"name\\"\\app.exe',
    electronPid: 1,
    hostPid: 2,
    logPath: 'C:\\t\\"x".log',
  })
  assert.doesNotThrow(() => new vm.Script(source))
})

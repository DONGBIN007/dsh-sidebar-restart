// Drives the real Host half against a fake Cordis context.
//
// This is the harness that matters: it exercises `apply()` itself - route
// registration, the status payload, and every refusal path - and it proves the
// destructive branch is NOT reachable on a machine that is not the desktop app.
//
// It never kills anything. On the machine that runs this test the process is a
// plain Node executable with no app archive beside it, so the restart is not
// available and `launchHelper` is never reached; the assertions below pin that.

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { apply } from '../index.js'

/** A minimal stand-in for the Cordis context the plugin is mounted with. */
function fakeContext() {
  const routes = new Map()
  const effects = []
  return {
    routes,
    effects,
    ctx: {
      effect: (callback, label) => {
        effects.push({ label, disposer: callback() })
        return () => {}
      },
      webServer: {
        register: (route) => {
          routes.set(route.path, route)
          return () => routes.delete(route.path)
        },
      },
    },
  }
}

/** A stand-in for a Node HTTP request/response pair. */
function fakeRequest({ method = 'GET', remote = '127.0.0.1', headers = {} } = {}) {
  return { method, socket: { remoteAddress: remote }, headers: { host: '127.0.0.1:19387', ...headers } }
}

function fakeResponse() {
  const captured = { status: null, headers: null, body: null }
  return {
    captured,
    writeHead: (status, headers) => {
      captured.status = status
      captured.headers = headers
    },
    end: (body) => {
      captured.body = body === undefined ? null : JSON.parse(body)
    },
  }
}

function mount() {
  const { ctx, routes, effects } = fakeContext()
  apply(ctx, {})
  return { routes, effects }
}

test('apply: registers exactly the status and restart routes', () => {
  const { routes } = mount()
  assert.deepEqual([...routes.keys()].sort(), ['/dsh-desktop-restart/restart', '/dsh-desktop-restart/status'])
  for (const route of routes.values()) assert.equal(route.kind, 'exact')
})

test('apply: ties both routes to an effect so unmounting removes them', () => {
  const { effects } = mount()
  assert.equal(effects.length, 2)
  for (const effect of effects) assert.match(effect.label, /^dsh-desktop-restart: /u)
})

test('status: reports a boot id, the pids, and a reason when not ready', async () => {
  const { routes } = mount()
  const response = fakeResponse()
  await routes.get('/dsh-desktop-restart/status').handler(fakeRequest(), response)

  const body = response.captured.body
  assert.equal(response.captured.status, 200)
  assert.match(body.bootId, /^[0-9a-f-]{36}$/u)
  assert.equal(body.plugin, 'desktop-restart')
  assert.equal(body.hostPid, process.pid)
  assert.equal(body.restarting, false)
  // This test process is not the desktop app, so the verdict must say why not.
  assert.equal(body.ready, false)
  assert.equal(typeof body.reason, 'string')
  assert.equal(typeof body.detail, 'string')
})

test('status: refuses a non-GET method', async () => {
  const { routes } = mount()
  const response = fakeResponse()
  await routes.get('/dsh-desktop-restart/status').handler(fakeRequest({ method: 'POST' }), response)
  assert.equal(response.captured.status, 405)
  assert.equal(response.captured.headers.allow, 'GET')
})

test('restart: refuses a non-POST method without touching anything', async () => {
  const { routes } = mount()
  const response = fakeResponse()
  await routes.get('/dsh-desktop-restart/restart').handler(fakeRequest({ method: 'GET' }), response)
  assert.equal(response.captured.status, 405)
})

test('restart: refuses before the readiness check when the caller is not loopback', async () => {
  const { routes } = mount()
  const response = fakeResponse()
  await routes
    .get('/dsh-desktop-restart/restart')
    .handler(fakeRequest({ method: 'POST', remote: '203.0.113.9' }), response)
  assert.equal(response.captured.status, 403)
})

test('restart: refuses a cross-site caller', async () => {
  const { routes } = mount()
  const response = fakeResponse()
  await routes.get('/dsh-desktop-restart/restart').handler(
    fakeRequest({ method: 'POST', headers: { origin: 'https://evil.example' } }),
    response,
  )
  assert.equal(response.captured.status, 403)
})

test('restart: refuses a non-JSON body', async () => {
  const { routes } = mount()
  const response = fakeResponse()
  await routes.get('/dsh-desktop-restart/restart').handler(
    fakeRequest({ method: 'POST', headers: { 'content-type': 'text/plain' } }),
    response,
  )
  assert.equal(response.captured.status, 415)
})

test('restart: answers 409 - not 500 - when this machine cannot restart', async () => {
  const { routes } = mount()

  // SAFETY GATE. This route really can kill the application when the Host is a
  // desktop Host, and a test must never do that. The check below is the same one
  // the plugin makes: if this process ever looks like the desktop app, refuse to
  // send the request at all rather than spawn a helper.
  const probe = fakeResponse()
  await routes.get('/dsh-desktop-restart/status').handler(fakeRequest(), probe)
  if (probe.captured.body.ready === true) {
    assert.fail('refusing to exercise the destructive route: this process looks like the desktop app')
  }

  const response = fakeResponse()
  await routes
    .get('/dsh-desktop-restart/restart')
    .handler(fakeRequest({ method: 'POST', headers: { 'content-type': 'application/json' } }), response)

  // The decisive assertion: on a non-desktop Host the destructive branch is
  // unreachable, so no helper was ever spawned.
  assert.equal(response.captured.status, 409)
  assert.equal(typeof response.captured.body.reason, 'string')
  assert.equal(typeof response.captured.body.error, 'string')
})

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { guard, isLoopback } from '../index.js'

test('isLoopback: accepts the IPv4 loopback range', () => {
  assert.equal(isLoopback('127.0.0.1'), true)
  assert.equal(isLoopback('127.0.0.53'), true)
  assert.equal(isLoopback('127.255.255.254'), true)
})

test('isLoopback: accepts IPv6 loopback in both spellings', () => {
  assert.equal(isLoopback('::1'), true)
  assert.equal(isLoopback('::ffff:127.0.0.1'), true)
})

test('isLoopback: rejects anything that is not this machine', () => {
  assert.equal(isLoopback('192.168.1.10'), false)
  assert.equal(isLoopback('10.0.0.1'), false)
  assert.equal(isLoopback('0.0.0.0'), false)
  assert.equal(isLoopback('::'), false)
  assert.equal(isLoopback('fe80::1'), false)
})

test('isLoopback: rejects malformed and non-address input', () => {
  assert.equal(isLoopback(''), false)
  assert.equal(isLoopback(undefined), false)
  assert.equal(isLoopback(null), false)
  assert.equal(isLoopback(1234), false)
  assert.equal(isLoopback('127.0.0'), false)
  assert.equal(isLoopback('127.0.0.1.5'), false)
  assert.equal(isLoopback('127.0.0.999'), false)
  assert.equal(isLoopback('127.x.0.1'), false)
})

/** Compose a request the guard inspects. */
function makeRequest({ remote = '127.0.0.1', headers = {} } = {}) {
  return { socket: { remoteAddress: remote }, headers: { 'content-type': 'application/json', ...headers } }
}

test('guard: allows an honest same-origin loopback call', () => {
  assert.equal(guard(makeRequest({ headers: { host: '127.0.0.1:19387', origin: 'http://127.0.0.1:19387' } })), null)
})

test('guard: allows a call with no Origin (the desktop-shell case)', () => {
  assert.equal(guard(makeRequest({ headers: { host: '127.0.0.1:19387' } })), null)
})

test('guard: refuses a non-loopback peer', () => {
  const refusal = guard(makeRequest({ remote: '192.168.1.10' }))
  assert.equal(refusal.status, 403)
})

test('guard: refuses a forwarded request', () => {
  for (const header of ['forwarded', 'x-forwarded-for', 'x-real-ip', 'x-forwarded-host', 'x-forwarded-proto']) {
    const refusal = guard(makeRequest({ headers: { [header]: 'something' } }))
    assert.equal(refusal.status, 403, `expected ${header} to be refused`)
  }
})

test('guard: refuses a foreign Origin', () => {
  const refusal = guard(makeRequest({ headers: { host: '127.0.0.1:19387', origin: 'https://evil.example' } }))
  assert.equal(refusal.status, 403)
})

test('guard: refuses an unparseable Origin', () => {
  const refusal = guard(makeRequest({ headers: { host: '127.0.0.1:19387', origin: 'not a url' } }))
  assert.equal(refusal.status, 403)
})

test('guard: refuses a non-JSON content type', () => {
  // `application/json` is not a CORS-safelisted content type, so requiring it is
  // what stops a cross-site form or no-cors fetch from reaching this route.
  for (const value of ['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data', '']) {
    const request = makeRequest()
    request.headers['content-type'] = value
    assert.equal(guard(request).status, 415, `expected ${JSON.stringify(value)} to be refused`)
  }
})

test('guard: accepts a JSON content type with parameters', () => {
  const request = makeRequest()
  request.headers['content-type'] = 'application/json; charset=utf-8'
  request.headers.host = '127.0.0.1:19387'
  assert.equal(guard(request), null)
})

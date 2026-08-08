import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const worker = readFileSync(join(process.cwd(), 'public/push-sw.js'), 'utf8')

describe('push service worker', () => {
  it('undertrycker gammal binding före showNotification', () => {
    const bindingCheck = worker.indexOf('payload.bindingId !== (await readBinding())')
    expect(bindingCheck).toBeGreaterThan(-1)
    expect(bindingCheck).toBeLessThan(worker.indexOf('showNotification'))
  })

  it('begränsar deep links till samma origin och PWA-scope', () => {
    expect(worker).toContain('target.origin !== scope.origin')
    expect(worker).toContain('target.pathname.startsWith(scope.pathname)')
    expect(worker).toContain('self.clients.openWindow(target.href)')
  })
})

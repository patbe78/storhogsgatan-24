/* global self, indexedDB, URL */

const PUSH_BINDING_DATABASE = 'storhogsgatan-push-v1'
const PUSH_BINDING_STORE = 'binding'

function openBindingDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PUSH_BINDING_DATABASE, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(PUSH_BINDING_STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function writeBinding(bindingId) {
  const database = await openBindingDatabase()
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(PUSH_BINDING_STORE, 'readwrite')
    const store = transaction.objectStore(PUSH_BINDING_STORE)
    if (bindingId) store.put(bindingId, 'active')
    else store.delete('active')
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

async function readBinding() {
  const database = await openBindingDatabase()
  const value = await new Promise((resolve, reject) => {
    const request = database
      .transaction(PUSH_BINDING_STORE)
      .objectStore(PUSH_BINDING_STORE)
      .get('active')
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
  database.close()
  return value
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'PUSH_BINDING_SET')
    event.waitUntil(writeBinding(String(event.data.bindingId)))
  if (event.data?.type === 'PUSH_BINDING_CLEAR') event.waitUntil(writeBinding(null))
})

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let payload
      try {
        payload = event.data?.json()
      } catch {
        return
      }
      if (!payload?.bindingId || payload.bindingId !== (await readBinding())) return
      const target = new URL('kalender', self.registration.scope)
      if (/^\d{4}-\d{2}-\d{2}$/.test(payload.calendarDate ?? ''))
        target.searchParams.set('date', payload.calendarDate)
      if (typeof payload.eventKey === 'string' && payload.eventKey.length <= 200)
        target.searchParams.set('event', payload.eventKey)
      const icon = new URL('icons/icon-192.png', self.registration.scope).href
      await self.registration.showNotification(
        String(payload.title ?? 'Kalenderpåminnelse').slice(0, 150),
        {
          body: String(payload.body ?? '').slice(0, 240),
          icon,
          badge: icon,
          tag: String(payload.deliveryId ?? payload.eventKey ?? 'calendar-reminder'),
          data: { targetUrl: target.href }
        }
      )
    })()
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const scope = new URL(self.registration.scope)
      const target = new URL(event.notification.data?.targetUrl ?? scope.href)
      if (target.origin !== scope.origin || !target.pathname.startsWith(scope.pathname)) return
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = windows.find((client) => client.url.startsWith(scope.href))
      if (existing) {
        if ('navigate' in existing) await existing.navigate(target.href)
        return existing.focus()
      }
      return self.clients.openWindow(target.href)
    })()
  )
})

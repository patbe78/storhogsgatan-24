/* global URL, window */
;(function configureGitHubPagesRouting(global) {
  'use strict'

  var BASE_PATH = '/storhogsgatan-24/'
  var STORAGE_KEY = 'storhogsgatan:pages-route:v1'
  var FALLBACK_PARAM = 'spa-route'
  var MAX_AGE_MS = 30000

  function buildRoutePayload(locationLike, now) {
    if (!locationLike.pathname.startsWith(BASE_PATH)) return null
    var relativePath = locationLike.pathname.slice(BASE_PATH.length).replace(/^\/+/, '')
    if (!relativePath || relativePath === '404.html') return null
    if (relativePath.includes('\\')) return null
    if (/(^|\/)\.[^/]+$/.test(relativePath) || /\.[a-z0-9]{1,8}$/i.test(relativePath)) return null
    return {
      path: '/' + relativePath,
      search: locationLike.search || '',
      hash: locationLike.hash || '',
      createdAt: now
    }
  }

  function redirectFrom404() {
    var payload = buildRoutePayload(global.location, Date.now())
    if (!payload) return false
    try {
      global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      global.location.replace(BASE_PATH + '?spa-redirect=1')
    } catch {
      global.location.replace(
        BASE_PATH + '?' + FALLBACK_PARAM + '=' + encodeURIComponent(JSON.stringify(payload))
      )
    }
    return true
  }

  function restoreRoute(now) {
    var current = new URL(global.location.href)
    var fallbackPayload = current.searchParams.get(FALLBACK_PARAM)
    if (
      current.pathname !== BASE_PATH ||
      (current.searchParams.get('spa-redirect') !== '1' && !fallbackPayload)
    )
      return false

    var raw
    try {
      raw = fallbackPayload || global.sessionStorage.getItem(STORAGE_KEY)
      global.sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      raw = fallbackPayload
    }

    if (!raw) {
      global.history.replaceState(null, '', BASE_PATH)
      return false
    }

    try {
      var payload = JSON.parse(raw)
      var validPath =
        typeof payload.path === 'string' &&
        payload.path.startsWith('/') &&
        !payload.path.startsWith('//') &&
        !payload.path.includes('\\')
      var validAge =
        typeof payload.createdAt === 'number' &&
        now - payload.createdAt >= 0 &&
        now - payload.createdAt < MAX_AGE_MS
      if (!validPath || !validAge) throw new Error('Invalid route payload')

      var search =
        typeof payload.search === 'string' && payload.search.startsWith('?') ? payload.search : ''
      var hash =
        typeof payload.hash === 'string' && payload.hash.startsWith('#') ? payload.hash : ''
      global.history.replaceState(null, '', BASE_PATH.slice(0, -1) + payload.path + search + hash)
      return true
    } catch {
      global.history.replaceState(null, '', BASE_PATH)
      return false
    }
  }

  global.StorhogsgatanPagesRouting = {
    basePath: BASE_PATH,
    buildRoutePayload: buildRoutePayload,
    redirectFrom404: redirectFrom404,
    restoreRoute: restoreRoute
  }

  restoreRoute(Date.now())
})(window)

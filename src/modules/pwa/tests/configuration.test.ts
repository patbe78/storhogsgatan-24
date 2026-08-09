import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8')

describe('PWA-konfiguration', () => {
  it('bygger och visar releaseversion 0.5.1 från paketets versionskälla', () => {
    const packageJson = JSON.parse(read('package.json')) as { version: string }
    const config = read('vite.config.ts')
    const statusPanel = read('src/modules/pwa/components/PwaStatusPanel.tsx')

    expect(packageJson.version).toBe('0.5.1')
    expect(config).toContain("process.env.npm_package_version ?? '0.5.1'")
    expect(statusPanel).toContain('{__APP_VERSION__}')
  })

  it('behåller GitHub Pages-basen och promptbaserad registrering', () => {
    const config = read('vite.config.ts')
    expect(config).toContain("base: mode === 'production' ? '/storhogsgatan-24/' : '/'")
    expect(config).toContain("registerType: 'prompt'")
    expect(config).not.toContain("registerType: 'autoUpdate'")
    expect(config).toContain('runtimeCaching: []')
    expect(config).toContain("importScripts: ['push-sw.js']")
    expect(read('public/push-sw.js')).toContain("self.addEventListener('push'")
    expect(read('public/push-sw.js')).toContain("self.addEventListener('notificationclick'")
  })

  it('har viewport safe areas och base-aware PWA-assets', () => {
    const html = read('index.html')
    expect(html).toContain('viewport-fit=cover')
    expect(html).toContain('href="%BASE_URL%apple-touch-icon-180.png"')
    expect(html).toContain('src="%BASE_URL%github-pages-routing.js"')
  })

  it('ger PR endast läsrätt och deployar bara push till main', () => {
    const workflow = read('.github/workflows/deploy.yml')
    expect(workflow).toContain('permissions: { contents: read }')
    expect(workflow.match(/pages: write/g)).toHaveLength(1)
    expect(workflow.match(/id-token: write/g)).toHaveLength(1)
    expect(
      workflow.match(/github\.event_name == 'push' && github\.ref == 'refs\/heads\/main'/g)
    ).toHaveLength(2)

    const uploadIndex = workflow.indexOf('uses: actions/upload-pages-artifact@v3')
    const uploadGuardIndex = workflow.lastIndexOf(
      "if: github.event_name == 'push' && github.ref == 'refs/heads/main'",
      uploadIndex
    )
    expect(uploadGuardIndex).toBeGreaterThan(-1)
    expect(uploadGuardIndex).toBeLessThan(uploadIndex)
  })
})

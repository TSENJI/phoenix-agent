import { chromium, type Browser, type Page, type BrowserContext } from 'playwright'

const PORT = 3001
let browser: Browser | null = null
let context: BrowserContext | null = null
let page: Page | null = null

// ---- Realistic browser profiles ----
const PROFILES = [
  {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US', timezoneId: 'America/New_York',
    screen: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  },
  {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'en-US', timezoneId: 'America/Los_Angeles',
    screen: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  },
  {
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1536, height: 864 },
    locale: 'en-US', timezoneId: 'Europe/London',
    screen: { width: 1536, height: 864 },
    deviceScaleFactor: 1,
  },
]

let currentProfile = 0

// ---- Stealth injection script ----
const STEALTH_JS = `
// 1. Remove webdriver flag
Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });

// 2. Mock chrome.runtime (exists in real Chrome, missing in Playwright)
if (!window.chrome) window.chrome = {};
if (!window.chrome.runtime) {
  window.chrome.runtime = {
    connect: function() {},
    sendMessage: function() {},
    id: undefined,
    onMessage: { addListener: function() {} },
  };
}

// 3. Mock plugins (real browsers have plugins)
Object.defineProperty(navigator, 'plugins', {
  get: () => {
    const plugins = [
      { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
      { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
      { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' },
    ];
    plugins.length = 3;
    return plugins;
  },
  configurable: true,
});

// 4. Mock mimeTypes
Object.defineProperty(navigator, 'mimeTypes', {
  get: () => ({ length: 2, 0: { type: 'application/pdf', suffixes: 'pdf' }, 1: { type: 'text/pdf', suffixes: 'pdf' } }),
  configurable: true,
});

// 5. Realistic languages
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'], configurable: true });

// 6. Override permissions query
const originalQuery = window.navigator.permissions?.query;
if (originalQuery) {
  window.navigator.permissions.query = (parameters) => {
    if (parameters.name === 'notifications') {
      return Promise.resolve({ state: Notification.permission });
    }
    return originalQuery(parameters);
  };
}

// 7. WebGL vendor/renderer spoofing (looks like real GPU)
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
  // UNMASKED_VENDOR_WEBGL
  if (parameter === 37445) return 'Google Inc. (NVIDIA)';
  // UNMASKED_RENDERER_WEBGL
  if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)';
  return getParameter.call(this, parameter);
};

if (typeof WebGL2RenderingContext !== 'undefined') {
  const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
  WebGL2RenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) return 'Google Inc. (NVIDIA)';
    if (parameter === 37446) return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0, D3D11)';
    return getParameter2.call(this, parameter);
  };
}

// 8. Canvas fingerprint noise (subtle, doesn't break visuals)
const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function(type) {
  if (type === 'image/png' && this.width > 16 && this.height > 16) {
    try {
      const ctx = this.getContext('2d');
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, Math.min(this.width, 4), Math.min(this.height, 4));
        for (let i = 0; i < imgData.data.length; i += 4) {
          imgData.data[i] = (imgData.data[i] + Math.floor(Math.random() * 3)) % 256;
        }
        ctx.putImageData(imgData, 0, 0);
      }
    } catch (e) {}
  }
  return origToDataURL.apply(this, arguments);
};

// 9. Fix toString for modified functions
const nativeToString = Function.prototype.toString;
const patchedFns = new WeakMap();
const origDefineProperty = Object.defineProperty;
Object.defineProperty = function(obj, prop, descriptor) {
  if (typeof descriptor?.value === 'function') {
    try { patchedFns.set(descriptor.value, nativeToString.call(descriptor.value)); } catch(e) {}
  }
  return origDefineProperty.call(this, obj, prop, descriptor);
};
Function.prototype.toString = function() {
  if (patchedFns.has(this)) return patchedFns.get(this);
  return nativeToString.call(this);
};

// 10. Remove Playwright-specific globals
delete window.__playwright;
delete window.__pw_manual;

// 11. Realistic connection info
Object.defineProperty(navigator, 'connection', {
  get: () => ({
    effectiveType: '4g',
    rtt: 50,
    downlink: 10,
    saveData: false,
  }),
  configurable: true,
});

// 12. Hardware concurrency (realistic CPU core count)
Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8, configurable: true });

// 13. Device memory
Object.defineProperty(navigator, 'deviceMemory', { get: () => 8, configurable: true });

// 14. Platform
Object.defineProperty(navigator, 'platform', { get: () => 'Win32', configurable: true });

// 15. Fix iframe contentWindow
const origContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
if (origContentWindow) {
  Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
    get() {
      const w = origContentWindow.get.call(this);
      if (w) {
        try { w.__playwright; delete w.__playwright; } catch(e) {}
      }
      return w;
    },
  });
}

console.log('[Stealth] Anti-detection loaded.');
`

async function ensureBrowser(): Promise<Page> {
  if (!browser || !browser.isConnected()) {
    console.log('[Browser Worker] Launching Chromium with stealth...')

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-site-isolation-trials',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--window-size=1920,1080',
        '--disable-infobars',
        '--disable-notifications',
        '--disable-popup-blocking',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--disable-extensions',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-pings',
        '--enable-features=NetworkService,NetworkServiceInProcess',
        '--force-color-profile=srgb',
      ],
      ignoreDefaultArgs: ['--enable-automation'],
    })

    // Rotate profile for variety
    currentProfile = (currentProfile + 1) % PROFILES.length
    const profile = PROFILES[currentProfile]

    context = await browser.newContext({
      viewport: profile.viewport,
      userAgent: profile.userAgent,
      locale: profile.locale,
      timezoneId: profile.timezoneId,
      screen: profile.screen,
      deviceScaleFactor: profile.deviceScaleFactor,
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
      permissions: ['geolocation', 'notifications'],
      bypassCSP: true,
      javaScriptEnabled: true,
      ignoreHTTPSErrors: true,
    })

    // Inject stealth script into every new page
    await context.addInitScript(STEALTH_JS)

    page = await context.newPage()

    // Also set extra headers on the page level
    await page.setExtraHTTPHeaders({
      'DNT': '1',
    })

    console.log(`[Browser Worker] Stealth browser ready (profile ${currentProfile + 1}/${PROFILES.length})`)
  }
  return page!
}

// ---- Human interaction simulation ----
async function humanDelay(min = 100, max = 400) {
  const delay = min + Math.random() * (max - min)
  await new Promise(r => setTimeout(r, delay))
}

async function humanType(page: Page, selector: string, text: string) {
  await page.click(selector, { delay: 50 })
  await humanDelay(200, 500)
  for (const char of text) {
    await page.keyboard.type(char, { delay: 30 + Math.random() * 80 })
  }
}

// ---- Request handler ----
async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname
  const body = await req.json().catch(() => ({}))

  try {
    const p = await ensureBrowser()

    switch (path) {
      case '/navigate': {
        const targetUrl = body.url
        if (!targetUrl) return json({ error: 'URL required' }, 400)

        // Set referer for realistic navigation
        const headers: Record<string, string> = {}
        if (body.referer) headers['Referer'] = body.referer

        await p.goto(targetUrl, {
          waitUntil: 'domcontentloaded',
          timeout: body.timeout ? parseInt(body.timeout) : 30000,
        })

        // Wait for page to settle (helps with JS challenges)
        const waitTime = body.wait || 2000
        await p.waitForTimeout(parseInt(waitTime))

        // Check if we hit a challenge page
        const pageTitle = await p.title().catch(() => '')
        const pageContent = await p.content().catch(() => '')

        let challengeDetected = false
        let challengeType = ''

        if (pageContent.includes('cf-challenge') || pageContent.includes('cloudflare') || pageContent.includes('cf-browser-verification')) {
          challengeDetected = true
          challengeType = 'Cloudflare'
        } else if (pageContent.includes('hcaptcha') || pageContent.includes('h-captcha')) {
          challengeDetected = true
          challengeType = 'hCaptcha'
        } else if (pageContent.includes('recaptcha') || pageContent.includes('g-recaptcha') || pageContent.includes('reCAPTCHA')) {
          challengeDetected = true
          challengeType = 'reCAPTCHA'
        } else if (pageContent.includes('challenge-platform') || pageContent.includes('challenges.cloudflare.com')) {
          challengeDetected = true
          challengeType = 'Cloudflare Turnstile'
        }

        // Try to wait for CF challenge to auto-solve (JS challenge usually resolves in 5s)
        if (challengeDetected) {
          console.log(`[Browser Worker] ${challengeType} detected, waiting for auto-resolve...`)
          await p.waitForTimeout(5000)
          // Check if it resolved
          const newContent = await p.content().catch(() => '')
          if (!newContent.includes('cf-challenge') && !newContent.includes('challenge-platform')) {
            challengeDetected = false
            challengeType = `${challengeType} (auto-resolved)`
          }
        }

        return json({
          result: `Navigated to ${targetUrl}\nTitle: ${pageTitle}`,
          title: pageTitle,
          url: p.url(),
          challengeDetected,
          challengeType,
        })
      }

      case '/snapshot': {
        // Get all interactive elements with ref IDs
        const elements = await p.evaluate(() => {
          const els = document.querySelectorAll(
            'a, button, input, textarea, select, [role="button"], [onclick], [contenteditable="true"], [tabindex]' +
            ', iframe, [data-testid], [class*="btn"], [class*="button"], [class*="submit"], [class*="checkbox"]' +
            ', [class*="radio"], [class*="select"], [class*="dropdown"], [class*="modal"]' +
            ', [id*="btn"], [id*="button"], [id*="submit"]'
          )
          const results: { ref: string; tag: string; text: string; href?: string; type?: string; placeholder?: string; name?: string; id?: string; class?: string; visible: boolean }[] = []
          els.forEach((el, i) => {
            const rect = el.getBoundingClientRect()
            if (rect.width === 0 && rect.height === 0) return
            const e = el as HTMLElement
            const style = window.getComputedStyle(el)
            const visible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0'
            if (!visible && i > 50) return
            results.push({
              ref: `@e${i + 1}`,
              tag: el.tagName.toLowerCase(),
              text: (e.textContent || '').trim().substring(0, 120),
              href: (el as HTMLAnchorElement).href || undefined,
              type: (el as HTMLInputElement).type || undefined,
              placeholder: (el as HTMLInputElement).placeholder || undefined,
              name: (el as HTMLInputElement).name || undefined,
              id: el.id || undefined,
              class: el.className?.toString()?.substring(0, 80) || undefined,
              visible,
            })
          })
          return {
            title: document.title,
            url: window.location.href,
            elements: results.slice(0, 100),
          }
        })
        const visible = elements.elements.filter(e => e.visible)
        const hidden = elements.elements.filter(e => !e.visible)
        const summary = visible.map(e => `  ${e.ref} [${e.tag}]${e.id ? ' #'+e.id : ''} ${e.text || e.placeholder || e.href || e.name || e.type || ''}`).join('\n')
        let output = `Page: ${elements.title}\nURL: ${elements.url}\nVisible elements (${visible.length}):
${summary}`
        if (hidden.length > 0) {
          output += `\n\nHidden elements (${hidden.length}): ${hidden.map(e => e.ref).join(', ')}`
        }
        return json({ result: output })
      }

      case '/click': {
        const idx = parseInt(body.ref?.replace('@e', '') || '0', 10)
        // Use a broader selector that matches what snapshot uses
        const selector = 'a, button, input, textarea, select, [role="button"], [onclick], [contenteditable="true"], [tabindex], iframe, [data-testid], [class*="btn"], [class*="button"], [class*="submit"], [id*="btn"], [id*="button"], [id*="submit"]'
        const els = await p.$$(selector)
        if (idx > 0 && idx <= els.length) {
          await els[idx - 1].scrollIntoViewIfNeeded().catch(() => {})
          await humanDelay(100, 300)
          await els[idx - 1].click()
          await humanDelay(300, 800)
          return json({ result: `Clicked ${body.ref}` })
        }
        return json({ error: `Element ${body.ref} not found (found ${els.length} elements)` }, 404)
      }

      case '/fill': {
        const idx = parseInt(body.ref?.replace('@e', '') || '0', 10)
        const selector = 'input, textarea, [contenteditable="true"]'
        const els = await p.$$(selector)
        if (idx > 0 && idx <= els.length) {
          await els[idx - 1].scrollIntoViewIfNeeded().catch(() => {})
          await els[idx - 1].click()
          await humanDelay(100, 200)
          await els[idx - 1].fill(body.text || '')
          await els[idx - 1].dispatchEvent('input')
          await els[idx - 1].dispatchEvent('change')
          await humanDelay(150, 350)
          return json({ result: `Filled ${body.ref}` })
        }
        return json({ error: `Element ${body.ref} not found` }, 404)
      }

      case '/type': {
        const idx = parseInt(body.ref?.replace('@e', '') || '0', 10)
        const selector = 'input, textarea, [contenteditable="true"]'
        const els = await p.$$(selector)
        if (idx > 0 && idx <= els.length) {
          await els[idx - 1].scrollIntoViewIfNeeded().catch(() => {})
          await humanType(p, `:nth-match(${selector}, ${idx})`, body.text || '')
          return json({ result: `Typed into ${body.ref}` })
        }
        return json({ error: `Element ${body.ref} not found` }, 404)
      }

      case '/press': {
        const key = body.key || 'Enter'
        await p.keyboard.press(key)
        await humanDelay(200, 500)
        return json({ result: `Pressed ${key}` })
      }

      case '/screenshot': {
        const fullPage = body.fullPage === 'true'
        const buf = await p.screenshot({ type: 'png', fullPage })
        const b64 = buf.toString('base64')
        return json({ result: `data:image/png;base64,${b64}` })
      }

      case '/evaluate': {
        const script = body.script || 'document.title'
        const result = await p.evaluate(script)
        return json({ result: String(result) })
      }

      case '/wait': {
        const ms = parseInt(body.ms || '3000', 10)
        if (body.ref) {
          const idx = parseInt(body.ref.replace('@e', ''), 10)
          const selector = 'a, button, input, textarea, select, [role="button"]'
          try {
            await p.waitForSelector(`${selector}:nth-of-type(${idx})`, { timeout: ms })
          } catch {
            await p.waitForTimeout(ms)
          }
        } else if (body.selector) {
          try {
            await p.waitForSelector(body.selector, { timeout: ms })
          } catch {
            await p.waitForTimeout(ms)
          }
        } else {
          await p.waitForTimeout(ms)
        }
        return json({ result: `Waited ${ms}ms` })
      }

      case '/cookies': {
        const cookies = await context!.cookies()
        return json({ result: JSON.stringify(cookies.map(c => ({ name: c.name, domain: c.domain, value: c.value?.substring(0, 50) })), null, 2) })
      }

      case '/get_url': {
        return json({ result: p.url() })
      }

      case '/get_html': {
        const html = await p.content()
        const truncated = html.length > 50000 ? html.substring(0, 50000) + '\n...(truncated)' : html
        return json({ result: truncated })
      }

      case '/scroll': {
        const direction = body.direction || 'down'
        const amount = parseInt(body.amount || '500', 10)
        await p.evaluate((d: string, a: number) => {
          window.scrollBy({ top: d === 'down' ? a : -a, behavior: 'smooth' })
        }, direction, amount)
        await p.waitForTimeout(500)
        return json({ result: `Scrolled ${direction} ${amount}px` })
      }

      case '/select': {
        const idx = parseInt(body.ref?.replace('@e', '') || '0', 10)
        const els = await p.$$('select')
        if (idx > 0 && idx <= els.length && body.value) {
          await els[idx - 1].selectOption(body.value)
          await humanDelay(200, 400)
          return json({ result: `Selected ${body.value} in ${body.ref}` })
        }
        return json({ error: `Select element ${body.ref} not found or no value provided` }, 404)
      }

      case '/hover': {
        const idx = parseInt(body.ref?.replace('@e', '') || '0', 10)
        const selector = 'a, button, input, [role="button"], [onmouseover], [class*="hover"]'
        const els = await p.$$(selector)
        if (idx > 0 && idx <= els.length) {
          await els[idx - 1].hover()
          await humanDelay(300, 600)
          return json({ result: `Hovered ${body.ref}` })
        }
        return json({ error: `Element ${body.ref} not found` }, 404)
      }

      case '/new_page': {
        if (context) {
          page = await context.newPage()
          return json({ result: 'Opened new page' })
        }
        return json({ error: 'No browser context' }, 500)
      }

      case '/close_page': {
        if (page && context) {
          const pages = context.pages()
          if (pages.length > 1) {
            await page.close()
            page = pages[0]
            return json({ result: 'Closed page, switched to previous' })
          }
          return json({ result: 'Cannot close last page' })
        }
        return json({ error: 'No page' }, 500)
      }

      case '/health': {
        return json({
          status: 'ok',
          browserConnected: browser?.isConnected() || false,
          currentPage: page?.url() || 'none',
          profile: currentProfile + 1,
          stealth: true,
        })
      }

      default:
        return json({ error: `Unknown endpoint: ${path}` }, 404)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[Browser Worker] Error on ${path}:`, msg)
    return json({ error: msg }, 500)
  }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': '*',
          'Access-Control-Allow-Headers': '*',
        },
      })
    }
    return handleRequest(req)
  },
})

console.log(`[Browser Worker] Stealth mode on port ${PORT}`)

process.on('SIGTERM', async () => {
  console.log('[Browser Worker] Shutting down...')
  await browser?.close()
  process.exit(0)
})
process.on('SIGINT', async () => {
  await browser?.close()
  process.exit(0)
})

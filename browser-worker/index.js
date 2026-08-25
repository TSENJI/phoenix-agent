// ============================================
// Phoenix Browser Worker - Playwright HTTP Service
// ============================================

const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '50mb' }));

// ---- Single browser instance reused across requests ----
let browser = null;
let context = null;
let page = null;
let initPromise = null;

async function ensureBrowser() {
  if (browser && browser.isConnected()) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--single-process',
          '--no-zygote',
        ],
      });
      context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent:
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      page = await context.newPage();
    } catch (err) {
      browser = null;
      context = null;
      page = null;
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

async function getPage() {
  await ensureBrowser();
  return page;
}

// ---- Health check ----
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    browserConnected: browser?.isConnected() ?? false,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// ---- POST /navigate ----
app.post('/navigate', async (req, res) => {
  try {
    const { url, waitUntil = 'domcontentloaded', timeout = 30000 } = req.body;
    if (!url) return res.status(400).json({ error: 'url is required' });

    const p = await getPage();
    const response = await p.goto(url, { waitUntil, timeout });

    res.json({
      success: true,
      url: p.url(),
      title: await p.title(),
      status: response?.status(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- POST /snapshot ----
// Returns interactive elements on the current page
app.post('/snapshot', async (_req, res) => {
  try {
    const p = await getPage();

    const elements = await p.evaluate(() => {
      const selectors = [
        'a[href]',
        'button',
        'input',
        'textarea',
        'select',
        '[role="button"]',
        '[role="link"]',
        '[role="tab"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[role="combobox"]',
        '[onclick]',
      ];

      const results = [];
      const seen = new Set();

      for (const selector of selectors) {
        const nodes = document.querySelectorAll(selector);
        for (const node of nodes) {
          if (seen.has(node)) continue;
          seen.add(node);

          const rect = node.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          // Generate a stable ref based on tag + nth-of-type + attributes
          const tag = node.tagName.toLowerCase();
          const id = node.id ? `#${node.id}` : '';
          const name = node.name ? `[name="${node.name}"]` : '';
          const type = node.type ? `[type="${node.type}"]` : '';
          const href = node.href ? `[href="${node.href.substring(0, 80)}"]` : '';
          const text = (node.textContent || '').trim().substring(0, 60);
          const ariaLabel = node.getAttribute('aria-label') || '';
          const placeholder = node.placeholder || '';
          const role = node.getAttribute('role') || '';

          results.push({
            ref: `${tag}${id}${name}${type}${role}`,
            tag,
            text,
            ariaLabel,
            placeholder,
            href: node.href || undefined,
            type: node.type || undefined,
            name: node.name || undefined,
            role: role || undefined,
            rect: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          });
        }
      }
      return results;
    });

    const title = await p.title();
    const url = p.url();

    // Get visible text content (trimmed)
    const bodyText = await p.evaluate(() => {
      return document.body?.innerText?.substring(0, 10000) || '';
    });

    res.json({
      success: true,
      url,
      title,
      elementCount: elements.length,
      elements,
      bodyText,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- POST /click ----
app.post('/click', async (req, res) => {
  try {
    const { ref } = req.body;
    if (!ref) return res.status(400).json({ error: 'ref is required' });

    const p = await getPage();

    // Parse the ref to build a CSS selector
    const selector = ref;
    await p.click(selector, { timeout: 5000 });

    // Wait a bit for any navigation or UI changes
    await p.waitForTimeout(500);

    res.json({
      success: true,
      currentUrl: p.url(),
      title: await p.title(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- POST /fill ----
app.post('/fill', async (req, res) => {
  try {
    const { ref, value } = req.body;
    if (!ref || value === undefined) {
      return res.status(400).json({ error: 'ref and value are required' });
    }

    const p = await getPage();
    await p.fill(ref, String(value), { timeout: 5000 });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- POST /screenshot ----
app.post('/screenshot', async (req, res) => {
  try {
    const { fullPage = false, type = 'png' } = req.body || {};
    const p = await getPage();

    const buffer = await p.screenshot({
      fullPage,
      type,
    });

    const base64 = buffer.toString('base64');

    res.json({
      success: true,
      type,
      base64,
      size: buffer.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- POST /evaluate ----
app.post('/evaluate', async (req, res) => {
  try {
    const { expression } = req.body;
    if (!expression) {
      return res.status(400).json({ error: 'expression is required' });
    }

    const p = await getPage();
    const result = await p.evaluate((expr) => {
      // eslint-disable-next-line no-eval
      return eval(expr);
    }, expression);

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- POST /close ----
app.post('/close', async (_req, res) => {
  try {
    if (page) {
      await page.close().catch(() => {});
      page = null;
    }
    if (context) {
      await context.close().catch(() => {});
      context = null;
    }
    if (browser) {
      await browser.close().catch(() => {});
      browser = null;
    }
    initPromise = null;

    res.json({ success: true, message: 'Browser closed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Graceful shutdown ----
async function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  try {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  } catch (err) {
    console.error('Error during shutdown:', err.message);
  }
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ---- Start server ----
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Phoenix Browser Worker running on port ${PORT}`);
  // Pre-warm browser on startup
  ensureBrowser()
    .then(() => console.log('Browser pre-warmed and ready'))
    .catch((err) => console.error('Failed to pre-warm browser:', err.message));
});

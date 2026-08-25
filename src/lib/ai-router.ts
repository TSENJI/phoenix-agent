import { BROWSER_TOOLS, ChatMessage, ToolCall } from './types'
import { db } from './db'

// ---- Provider definitions ----
const PROVIDERS = [
  { id: 'gemini', name: 'Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-flash' },
  { id: 'openrouter', name: 'OpenRouter', baseUrl: 'https://openrouter.ai/api/v1', model: 'google/gemini-2.0-flash-exp:free' },
  { id: 'groq', name: 'Groq', baseUrl: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile' },
  { id: 'nvidia', name: 'Nvidia', baseUrl: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.1-405b-instruct' },
] as const

export type ProviderId = typeof PROVIDERS[number]['id']

export interface ProviderStatus {
  id: ProviderId
  name: string
  model: string
  hasKey: boolean
  enabled: boolean
}

export async function getProviderStatuses(): Promise<ProviderStatus[]> {
  const settings = await getAllSettings()
  return PROVIDERS.map(p => ({
    id: p.id,
    name: p.name,
    model: p.model,
    hasKey: !!settings[`${p.id}_key`],
    enabled: !!settings[`${p.id}_key`] && (settings[`${p.id}_enabled`] !== 'false'),
  }))
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.settings.findMany()
  const map: Record<string, string> = {}
  for (const r of rows) map[r.key] = r.value
  return map
}

export async function setSetting(key: string, value: string) {
  await db.settings.upsert({ where: { key }, update: { value }, create: { key, value } })
}

async function getApiKey(providerId: ProviderId): Promise<string | null> {
  const settings = await getAllSettings()
  return settings[`${providerId}_key`] || null
}

function isOpenAICompat(providerId: ProviderId): boolean {
  return providerId !== 'gemini'
}

// Nvidia needs special headers
function getProviderHeaders(providerId: ProviderId, apiKey: string): Record<string, string> {
  const base: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  }
  if (providerId === 'nvidia') {
    base['nvidia-domain'] = 'org'
  }
  if (providerId === 'openrouter') {
    base['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    base['X-Title'] = 'Phoenix Agent'
  }
  return base
}

function toGeminiTools(tools: typeof BROWSER_TOOLS) {
  return {
    functionDeclarations: tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    })),
  }
}

function toOpenAITools(tools: typeof BROWSER_TOOLS) {
  return tools.map(t => ({ type: 'function' as const, function: t.function }))
}

const SYSTEM_PROMPT = `You are Phoenix Agent, a powerful AI assistant with browser automation, file operations, code sandbox, and shell access capabilities.

You can use tools to:
- **Browse the web**: Navigate to websites, click elements, fill forms, take screenshots, run JavaScript
- **Code Sandbox (E2B)**: Execute Python/Node code in a secure sandbox, install packages, run long tasks
- **Manage files**: Upload, read, list, decompress files (zip, tar.gz, tar, rar, 7z)
- **Execute commands**: Run shell commands
- **Search the web**: Find information online
- **Human Takeover**: When blocked by CAPTCHA, 2FA, or login, request human help

Important rules:
1. When browsing, always start with browser_snapshot to see available elements
2. Use browser_navigate → snapshot → click/fill pattern
3. For large text injection, use browser_evaluate with JavaScript
4. If you detect a CAPTCHA, 2FA, or login wall, use human_takeover tool
5. For code execution, prefer sandbox_execute over shell_execute (safer, isolated)
6. Report your progress step by step
7. If something fails, try alternative approaches before giving up
8. You can decompress files: zip, tar.gz, tar, rar, 7z
9. Use file_list to explore, file_read to read contents

You are proactive, thorough, and report your progress clearly.`

// ---- E2B Sandbox tools (added to BROWSER_TOOLS) ----
const EXTRA_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'sandbox_execute',
      description: 'Execute Python or shell code in a secure E2B sandbox. Supports installing packages. Persistent filesystem across calls.',
      parameters: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code to execute (Python or shell)' },
          language: { type: 'string', description: 'python or shell', enum: ['python', 'shell'] },
        },
        required: ['code', 'language'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sandbox_upload',
      description: 'Upload a file to the E2B sandbox from the server',
      parameters: {
        type: 'object',
        properties: {
          local_path: { type: 'string', description: 'Path on the server' },
          remote_path: { type: 'string', description: 'Path in the sandbox' },
        },
        required: ['local_path', 'remote_path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sandbox_download',
      description: 'Download a file from the E2B sandbox to the server',
      parameters: {
        type: 'object',
        properties: {
          remote_path: { type: 'string', description: 'Path in the sandbox' },
          local_path: { type: 'string', description: 'Path on the server' },
        },
        required: ['remote_path', 'local_path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sandbox_list',
      description: 'List files in a directory in the E2B sandbox',
      parameters: {
        type: 'object',
        properties: {
          dir: { type: 'string', description: 'Directory path in sandbox (default: /home/user)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'human_takeover',
      description: 'REQUEST HUMAN HELP when you are blocked by CAPTCHA, 2FA verification, login page, payment, or anything you cannot handle automatically. Describe what the human needs to do. The agent will PAUSE and wait for the human to complete the action before continuing.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why human help is needed' },
          action_needed: { type: 'string', description: 'What the human needs to do (e.g. "Enter the 2FA code", "Solve the CAPTCHA", "Login to the account")' },
          screenshot: { type: 'boolean', description: 'Whether to take a screenshot first' },
        },
        required: ['reason', 'action_needed'],
      },
    },
  },
]

const ALL_TOOLS = [...BROWSER_TOOLS, ...EXTRA_TOOLS] as typeof BROWSER_TOOLS[number][]

// ---- Model API calls ----
interface ModelResponse {
  content: string | null
  toolCalls: ToolCall[] | null
  finishReason: string
}

async function callGemini(messages: ChatMessage[], apiKey: string, model: string): Promise<ModelResponse> {
  const provider = PROVIDERS.find(p => p.id === 'gemini')!
  const url = `${provider.baseUrl}/models/${model}:generateContent?key=${apiKey}`

  const contents = messages.filter(m => m.role !== 'system').map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: m.role === 'tool'
      ? [{ functionResponse: { name: m.name, response: { content: m.content } } }]
      : [{ text: m.content }],
  }))

  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    tools: [toGeminiTools(ALL_TOOLS as unknown as typeof BROWSER_TOOLS)],
    generationConfig: { maxOutputTokens: 8192, temperature: 0.7 },
  }

  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!res.ok) { const err = await res.text(); throw new Error(`Gemini ${res.status}: ${err.substring(0, 200)}`) }
  const data = await res.json()
  const candidate = data.candidates?.[0]
  if (!candidate) throw new Error('No candidate from Gemini')

  const parts = candidate.content?.parts || []
  let content: string | null = null
  const toolCalls: ToolCall[] = []
  for (const part of parts) {
    if (part.text) content = (content || '') + part.text
    if (part.functionCall) {
      toolCalls.push({
        id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: 'function',
        function: { name: part.functionCall.name, arguments: JSON.stringify(part.functionCall.args) },
      })
    }
  }
  return { content, toolCalls: toolCalls.length > 0 ? toolCalls : null, finishReason: candidate.finishReason || 'stop' }
}

async function callOpenAICompat(messages: ChatMessage[], apiKey: string, providerId: ProviderId, model: string): Promise<ModelResponse> {
  const provider = PROVIDERS.find(p => p.id === providerId)!
  const url = `${provider.baseUrl}/chat/completions`
  const apiMessages = [
    { role: 'system' as const, content: SYSTEM_PROMPT },
    ...messages.map(m => ({
      role: (m.role === 'tool' ? 'tool' : m.role) as string,
      content: m.content, tool_call_id: m.toolCallId, name: m.name,
    })),
  ]
  const body: Record<string, unknown> = {
    model, messages: apiMessages,
    tools: toOpenAITools(ALL_TOOLS as unknown as typeof BROWSER_TOOLS),
    max_tokens: 8192, temperature: 0.7,
  }

  const headers = getProviderHeaders(providerId, apiKey)
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) { const err = await res.text(); throw new Error(`${provider.name} ${res.status}: ${err.substring(0, 200)}`) }
  const data = await res.json()
  const choice = data.choices?.[0]
  if (!choice) throw new Error(`No choice from ${provider.name}`)
  const msg = choice.message
  return { content: msg?.content || null, toolCalls: msg?.tool_calls?.length ? msg.tool_calls : null, finishReason: choice.finish_reason || 'stop' }
}

// ---- Main router ----
export async function callAI(messages: ChatMessage[], preferredModel?: string): Promise<{ response: ModelResponse; usedProvider: ProviderId; usedModel: string }> {
  const settings = await getAllSettings()
  const orderedProviders: ProviderId[] = []

  if (preferredModel && preferredModel !== 'auto') {
    for (const p of PROVIDERS) {
      if ((p.id === preferredModel || p.model === preferredModel) && settings[`${p.id}_key`] && settings[`${p.id}_enabled`] !== 'false') {
        orderedProviders.push(p.id)
      }
    }
  }
  for (const p of PROVIDERS) {
    if (settings[`${p.id}_key`] && settings[`${p.id}_enabled`] !== 'false' && !orderedProviders.includes(p.id as ProviderId)) {
      orderedProviders.push(p.id as ProviderId)
    }
  }

  if (orderedProviders.length === 0) throw new Error('No API keys configured. Add at least one in Settings.')

  let lastError: Error | null = null
  for (const providerId of orderedProviders) {
    const apiKey = await getApiKey(providerId)
    if (!apiKey) continue
    const provider = PROVIDERS.find(p => p.id === providerId)!
    const model = settings[`${providerId}_model`] || provider.model
    try {
      console.log(`[AI Router] Trying ${provider.name} (${model})...`)
      const response = isOpenAICompat(providerId)
        ? await callOpenAICompat(messages, apiKey, providerId, model)
        : await callGemini(messages, apiKey, model)
      console.log(`[AI Router] Success: ${provider.name}`)
      return { response, usedProvider: providerId, usedModel: model }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.log(`[AI Router] ${provider.name} failed: ${errorMsg}`)
      lastError = err instanceof Error ? err : new Error(errorMsg)
      continue
    }
  }
  throw new Error(`All providers failed. Last: ${lastError?.message}`)
}

// ---- Streaming chat with tool loop ----
export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; content: string }
  | { type: 'tool_result'; content: string }
  | { type: 'human_takeover'; reason: string; action: string; screenshot?: string }
  | { type: 'error'; content: string }
  | { type: 'status'; content: string; provider?: ProviderId }
  | { type: 'done'; conversationId?: string }

export async function* streamChat(messages: ChatMessage[], preferredModel?: string, onHumanTakeover?: (data: { reason: string; action: string }) => Promise<string>): AsyncGenerator<StreamEvent> {
  try {
    const { response, usedProvider, usedModel } = await callAI(messages, preferredModel)
    yield { type: 'status', content: `Using ${PROVIDERS.find(p => p.id === usedProvider)?.name} (${usedModel})`, provider: usedProvider }

    if (response.content) yield { type: 'text', content: response.content }

    if (response.toolCalls) {
      for (const tc of response.toolCalls) {
        const args = JSON.parse(tc.function.arguments)
        yield { type: 'tool_call', content: JSON.stringify({ name: tc.function.name, args }) }

        // Handle human takeover specially
        if (tc.function.name === 'human_takeover') {
          let screenshot = ''
          if (args.screenshot) {
            try { screenshot = await callRemoteBrowser('/screenshot', {}) } catch {}
          }
          yield { type: 'human_takeover', reason: args.reason, action: args.action_needed, screenshot }

          // Wait for human to complete the action
          if (onHumanTakeover) {
            const humanResult = await onHumanTakeover({ reason: args.reason, action: args.action_needed })
            yield { type: 'tool_result', content: `Human completed: ${humanResult}` }
          } else {
            yield { type: 'tool_result', content: 'Human takeover requested. Waiting for human intervention...' }
          }
        } else {
          const result = await executeTool(tc.function.name, args)
          yield { type: 'tool_result', content: result }
        }

        messages.push({ role: 'assistant', content: response.content || '', toolCalls: [tc] })
        messages.push({ role: 'tool', content: '', toolCallId: tc.id, name: tc.function.name })
        yield* streamChat(messages, preferredModel, onHumanTakeover)
        return
      }
    }
  } catch (err) {
    yield { type: 'error', content: err instanceof Error ? err.message : String(err) }
  }
}

// ---- Tool execution ----
import { execSync } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

const UPLOADS_DIR = path.join(process.cwd(), 'uploads')
const MAX_OUTPUT = 10000

async function getBrowserWorkerUrl(): Promise<string> {
  const settings = await getAllSettings()
  return settings['browser_worker_url'] || process.env.BROWSER_WORKER_URL || 'http://localhost:3001'
}

// ---- E2B Sandbox ----
let e2bSandbox: { id: string; processStart: (cmd: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>; readFile: (p: string) => Promise<string>; writeFile: (p: string, c: string) => Promise<void>; listDir: (p: string) => Promise<string[]> } | null = null

async function getE2BSandbox() {
  if (e2bSandbox) return e2bSandbox
  const settings = await getAllSettings()
  const e2bKey = settings['e2b_key'] || process.env.E2B_API_KEY
  if (!e2bKey) return null
  try {
    const { Sandbox } = await import('@e2b/code-interpreter')
    const sb = await Sandbox.create({ apiKey: e2bKey })
    e2bSandbox = sb as never
    console.log(`[E2B] Sandbox created: ${sb.id}`)
    return sb as never
  } catch (err) {
    console.error('[E2B] Failed to create sandbox:', err)
    return null
  }
}

// ---- Remote Browser Worker ----
async function callRemoteBrowser(endpoint: string, body: Record<string, string>): Promise<string> {
  const workerUrl = await getBrowserWorkerUrl()
  try {
    const res = await fetch(`${workerUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })
    const data = await res.json()
    return data.result || data.error || JSON.stringify(data, null, 2)
  } catch {
    // Fallback to local agent-browser
    return runLocalBrowser(endpoint.replace('/', ''), body)
  }
}

function runLocalBrowser(action: string, params: Record<string, string>): string {
  const commands: Record<string, string> = {
    navigate: `open ${params.url}`,
    snapshot: 'snapshot -i',
    click: `click ${params.ref}`,
    fill: `fill ${params.ref} "${(params.text || '').replace(/"/g, '\"')}'"`,
    type: `type ${params.ref} "${(params.text || '').replace(/"/g, '\"')}'"`,
    press: `press ${params.key}`,
    evaluate: `eval '${(params.script || '').replace(/'/g, "'\\''")}' `,
    wait: params.ref ? `wait ${params.ref}` : `wait ${params.ms || '3000'}`,
  }
  const cmd = commands[action]
  if (!cmd) return `Unknown browser action: ${action}`
  try {
    return execSync(`agent-browser ${cmd}`, { timeout: 30000, maxBuffer: MAX_OUTPUT * 2 }).toString().trim() || '(empty)'
  } catch (err) {
    return `Browser error: ${err instanceof Error ? err.message : String(err)}`
  }
}

async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  try {
    // Browser tools → remote worker with local fallback
    if (name.startsWith('browser_')) {
      const action = name.replace('browser_', '')
      if (action === 'screenshot') {
        const screenshotPath = path.join(UPLOADS_DIR, `screenshot_${Date.now()}.png`)
        try {
          const result = await callRemoteBrowser('/screenshot', {})
          // If remote returned base64, save it
          if (result.startsWith('data:') || result.length > 1000) {
            const base64Data = result.replace(/^data:image\/\w+;base64,/, '')
            await fs.mkdir(UPLOADS_DIR, { recursive: true })
            await fs.writeFile(screenshotPath, Buffer.from(base64Data, 'base64'))
            return `[Screenshot] ${screenshotPath}`
          }
          return result
        } catch {
          return runLocalBrowser('screenshot', { path: screenshotPath })
        }
      }
      return callRemoteBrowser(`/${action}`, args)
    }

    // E2B Sandbox tools
    if (name === 'sandbox_execute') {
      const sb = await getE2BSandbox()
      if (!sb) return 'E2B sandbox not available. Set E2B_API_KEY in Settings or .env'
      try {
        const proc = await sb.processStart(args.language === 'python' ? 'python3' : 'bash', {
          cmd: args.code,
        })
        let output = proc.stdout || ''
        if (proc.stderr) output += '\n[stderr] ' + proc.stderr
        return output.trim() || '(no output)'
      } catch (err) {
        return `Sandbox error: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    if (name === 'sandbox_upload') {
      const sb = await getE2BSandbox()
      if (!sb) return 'E2B sandbox not available'
      try {
        const content = await fs.readFile(args.local_path)
        await sb.writeFile(args.remote_path, content.toString())
        return `Uploaded ${args.local_path} → sandbox:${args.remote_path}`
      } catch (err) {
        return `Upload error: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    if (name === 'sandbox_download') {
      const sb = await getE2BSandbox()
      if (!sb) return 'E2B sandbox not available'
      try {
        const content = await sb.readFile(args.remote_path)
        await fs.mkdir(path.dirname(args.local_path), { recursive: true })
        await fs.writeFile(args.local_path, content)
        return `Downloaded sandbox:${args.remote_path} → ${args.local_path}`
      } catch (err) {
        return `Download error: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    if (name === 'sandbox_list') {
      const sb = await getE2BSandbox()
      if (!sb) return 'E2B sandbox not available'
      try {
        const entries = await sb.listDir(args.dir || '/home/user')
        return entries.join('\n') || '(empty directory)'
      } catch (err) {
        return `List error: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    // File tools
    if (name === 'file_upload') {
      const stat = await fs.stat(args.filepath).catch(() => null)
      if (!stat) return `File not found: ${args.filepath}`
      return `File ready: ${args.filepath} (${stat.size} bytes)`
    }

    if (name === 'file_decompress') {
      const ext = path.extname(args.filepath).toLowerCase()
      const dest = args.filepath.replace(/\.[^.]+$/, '')
      await fs.mkdir(dest, { recursive: true })
      const cmds: Record<string, string> = {
        '.zip': `unzip -o "${args.filepath}" -d "${dest}"`,
        '.gz': `tar xzf "${args.filepath}" -C "${dest}"`,
        '.tar': `tar xf "${args.filepath}" -C "${dest}"`,
        '.rar': `unrar x -o+ "${args.filepath}" "${dest}/"`,
        '.7z': `7z x "${args.filepath}" -o"${dest}" -y`,
      }
      const cmd = cmds[ext]
      if (!cmd) return `Unsupported: ${ext}. Use: zip, tar.gz, tar, rar, 7z`
      try {
        execSync(cmd, { timeout: 60000, maxBuffer: MAX_OUTPUT * 2 })
        const files = execSync(`find "${dest}" -type f | head -50`).toString().trim()
        return `Decompressed → ${dest}\n\n${files}`
      } catch (err) {
        return `Decompress error: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    if (name === 'file_read') {
      const maxLines = parseInt(args.maxLines || '500', 10)
      try {
        const content = execSync(`head -n ${maxLines} "${args.filepath}"`).toString()
        return content.length >= MAX_OUTPUT ? content.substring(0, MAX_OUTPUT) + '\n...(truncated)' : content
      } catch (err) {
        return `Read error: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    if (name === 'file_list') {
      try {
        const cmd = args.pattern
          ? `find "${args.dirpath}" -name "${args.pattern}" -type f | head -100`
          : `ls -la "${args.dirpath}"`
        const output = execSync(cmd, { timeout: 10000, maxBuffer: MAX_OUTPUT * 2 }).toString()
        return output.length >= MAX_OUTPUT ? output.substring(0, MAX_OUTPUT) + '\n...(truncated)' : output
      } catch (err) {
        return `List error: ${err instanceof Error ? err.message : String(err)}`
      }
    }

    if (name === 'shell_execute') {
      try {
        const output = execSync(args.command, { timeout: 60000, maxBuffer: MAX_OUTPUT * 2 }).toString()
        return output.length >= MAX_OUTPUT ? output.substring(0, MAX_OUTPUT) + '\n...(truncated)' : output
      } catch (err) {
        const stderr = (err as { stderr?: Buffer })?.stderr?.toString() || ''
        return `Error: ${err instanceof Error ? err.message : String(err)}\n${stderr}`
      }
    }

    if (name === 'web_search') {
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`
      const res = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })
      const html = await res.text()
      const results: { title: string; url: string; snippet: string }[] = []
      const regex = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>.*?<a class="result__snippet"[^>]*>([^<]*(?:<[^>]*>[^<]*)*)<\/a>/gs
      let match
      while ((match = regex.exec(html)) !== null && results.length < 8) {
        results.push({ url: match[1], title: match[2].replace(/<[^>]*>/g, ''), snippet: match[3].replace(/<[^>]*>/g, '').trim() })
      }
      return results.length === 0 ? 'No results' : results.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.snippet}`).join('\n\n')
    }

    return `Unknown tool: ${name}`
  } catch (err) {
    return `Tool error (${name}): ${err instanceof Error ? err.message : String(err)}`
  }
}

export { PROVIDERS }

export interface ModelConfig {
  id: string
  name: string
  provider: 'gemini' | 'openai-compat'
  baseUrl: string
  apiKeySetting: string
  model: string
  maxTokens: number
  enabled: boolean
}

export interface ProviderConfig {
  id: string
  name: string
  baseUrl: string
  models: ModelConfig[]
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  toolCallId?: string
  name?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface BrowserAction {
  type: 'navigate' | 'click' | 'fill' | 'snapshot' | 'screenshot' | 'evaluate' | 'wait' | 'type' | 'press' | 'scroll' | 'hover' | 'select'
  params: Record<string, string>
}

export const BROWSER_TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'browser_navigate',
      description: 'Navigate to a URL. Has built-in stealth (hides automation, spoofs browser fingerprint). Auto-detects Cloudflare/CAPTCHA challenges. If a JS challenge is detected, waits for auto-resolution.',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The URL to navigate to' },
          wait: { type: 'string', description: 'Extra wait time in ms after navigation (default 2000, increase for heavy sites)' },
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_snapshot',
      description: 'Get all interactive elements on the current page with their ref IDs. Returns visible elements first, then hidden ones. Includes buttons, links, inputs, iframes, and common CSS-class-based elements.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_click',
      description: 'Click an element by ref ID. Scrolls into view first, adds human-like delay.',
      parameters: {
        type: 'object',
        properties: { ref: { type: 'string', description: 'Element ref like @e1' } },
        required: ['ref']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_fill',
      description: 'Clear and fill text into an input field. Triggers input + change events for React/Angular apps.',
      parameters: {
        type: 'object',
        properties: {
          ref: { type: 'string', description: 'Element ref like @e1' },
          text: { type: 'string', description: 'Text to fill' }
        },
        required: ['ref', 'text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_type',
      description: 'Type text character by character (human-like typing) without clearing existing text.',
      parameters: {
        type: 'object',
        properties: {
          ref: { type: 'string', description: 'Element ref' },
          text: { type: 'string', description: 'Text to type' }
        },
        required: ['ref', 'text']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_press',
      description: 'Press a keyboard key (Enter, Escape, Tab, ArrowDown, etc.)',
      parameters: {
        type: 'object',
        properties: { key: { type: 'string', description: 'Key to press' } },
        required: ['key']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_screenshot',
      description: 'Take a screenshot of the current page (base64 PNG). Use fullPage=true for complete page.',
      parameters: {
        type: 'object',
        properties: { fullPage: { type: 'string', description: 'Set to "true" for full page screenshot' } },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_evaluate',
      description: 'Execute JavaScript on the current page. Returns the result as string.',
      parameters: {
        type: 'object',
        properties: { script: { type: 'string', description: 'JavaScript code to execute' } },
        required: ['script']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_wait',
      description: 'Wait for milliseconds, an element, or a CSS selector.',
      parameters: {
        type: 'object',
        properties: {
          ms: { type: 'string', description: 'Milliseconds to wait (default 3000)' },
          ref: { type: 'string', description: 'Element ref to wait for (optional)' },
          selector: { type: 'string', description: 'CSS selector to wait for (optional)' },
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_scroll',
      description: 'Scroll the page up or down.',
      parameters: {
        type: 'object',
        properties: {
          direction: { type: 'string', description: 'Scroll direction: up or down (default: down)' },
          amount: { type: 'string', description: 'Pixels to scroll (default 500)' },
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_hover',
      description: 'Hover over an element (useful for dropdowns, tooltips, hover menus).',
      parameters: {
        type: 'object',
        properties: { ref: { type: 'string', description: 'Element ref like @e1' } },
        required: ['ref']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_select',
      description: 'Select an option in a dropdown/select element.',
      parameters: {
        type: 'object',
        properties: {
          ref: { type: 'string', description: 'Element ref like @e1' },
          value: { type: 'string', description: 'The value of the option to select' },
        },
        required: ['ref', 'value']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_get_url',
      description: 'Get the current page URL.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'file_decompress',
      description: 'Decompress a zip, tar.gz, tar, or rar file',
      parameters: {
        type: 'object',
        properties: { filepath: { type: 'string', description: 'Path to the compressed file' } },
        required: ['filepath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'file_read',
      description: 'Read a file from the server filesystem',
      parameters: {
        type: 'object',
        properties: {
          filepath: { type: 'string', description: 'Path to the file' },
          maxLines: { type: 'string', description: 'Max lines to read (default 500)' }
        },
        required: ['filepath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'file_list',
      description: 'List files in a directory on the server',
      parameters: {
        type: 'object',
        properties: {
          dirpath: { type: 'string', description: 'Directory path' },
          pattern: { type: 'string', description: 'Optional glob pattern (e.g. *.kt)' }
        },
        required: ['dirpath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'shell_execute',
      description: 'Execute a shell command on the server and return the output',
      parameters: {
        type: 'object',
        properties: { command: { type: 'string', description: 'Shell command to execute' } },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query' } },
        required: ['query']
      }
    }
  }
]

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
  type: 'navigate' | 'click' | 'fill' | 'snapshot' | 'screenshot' | 'evaluate' | 'wait' | 'type' | 'press'
  params: Record<string, string>
}

export const BROWSER_TOOLS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'browser_navigate',
      description: 'Navigate to a URL in the browser',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'The URL to navigate to' } },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_snapshot',
      description: 'Get all interactive elements on the current page with their ref IDs',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_click',
      description: 'Click an element on the page by its ref ID (e.g. @e1)',
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
      description: 'Fill text into an input field',
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
      description: 'Type text into an input field without clearing existing text',
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
      description: 'Press a keyboard key (e.g. Enter, Escape, Tab)',
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
      description: 'Take a screenshot of the current page and return it as base64',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_evaluate',
      description: 'Execute JavaScript code on the current page and return the result',
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
      description: 'Wait for a specified number of milliseconds or for an element',
      parameters: {
        type: 'object',
        properties: {
          ms: { type: 'string', description: 'Milliseconds to wait (e.g. 3000)' },
          ref: { type: 'string', description: 'Element ref to wait for (optional)' }
        },
        required: []
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'file_upload',
      description: 'Upload a file by path. The file should already be on the server in the uploads directory.',
      parameters: {
        type: 'object',
        properties: { filepath: { type: 'string', description: 'Path to the file on server' } },
        required: ['filepath']
      }
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

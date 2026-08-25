'use client'

import { memo, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, ChevronDown, ChevronRight, Wrench, AlertCircle, Info } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'
import type { StreamingEvent, Message } from '@/lib/store'

type DisplayEvent = StreamingEvent | (Message & { type: 'db_message' })

function isStreamingEvent(e: DisplayEvent): e is StreamingEvent {
  return 'type' in e && (e as StreamingEvent).type !== 'db_message'
}

function CodeBlock({ language, children }: { language: string; children: string }) {
  const [copied, setCopied] = useState(false)
  const { theme } = useTheme()
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [children])

  return (
    <div className="group/code relative my-2 rounded-lg overflow-hidden border border-white/5">
      <div className="flex items-center justify-between bg-white/5 px-4 py-2">
        <span className="text-[10px] font-mono uppercase tracking-wider opacity-50">
          {language || 'text'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] opacity-0 transition-opacity hover:bg-white/10 group-hover/code:opacity-100"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={theme === 'dark' ? oneDark : oneLight}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.8125rem',
          background: 'transparent',
        }}
        codeTagProps={{ style: { fontFamily: 'var(--font-geist-mono), monospace' } }}
      >
        {children.trim()}
      </SyntaxHighlighter>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  const { theme } = useTheme()
  return (
    <div className="markdown-body text-sm leading-relaxed">
      <ReactMarkdown
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const codeStr = String(children).replace(/\n$/, '')
            if (match) {
              return <CodeBlock language={match[1]}>{codeStr}</CodeBlock>
            }
            if (codeStr.includes('\n')) {
              return <CodeBlock language="text">{codeStr}</CodeBlock>
            }
            return <code className={className} {...props}>{children}</code>
          },
          pre({ children }) {
            return <>{children}</>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function ToolCallCard({ name, args }: { name: string; args: string }) {
  const [open, setOpen] = useState(false)
  let parsedArgs: Record<string, unknown> = {}
  try {
    parsedArgs = JSON.parse(args)
  } catch {
    parsedArgs = { raw: args }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="my-2">
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-left text-xs transition-colors hover:bg-amber-500/10">
        {open ? <ChevronDown className="h-3 w-3 text-amber-400" /> : <ChevronRight className="h-3 w-3 text-amber-400" />}
        <Wrench className="h-3 w-3 text-amber-400" />
        <span className="font-medium text-amber-400">{name}</span>
        <span className="ml-auto opacity-40">{open ? 'Hide' : 'Show'} params</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-1 max-h-48 overflow-y-auto rounded-lg bg-black/30 p-3 font-mono text-[11px] leading-relaxed opacity-70">
          {JSON.stringify(parsedArgs, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ToolResultCard({ content }: { content: string }) {
  const [open, setOpen] = useState(false)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="my-1">
      <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-lg border border-white/5 bg-white/3 px-3 py-2 text-left text-xs transition-colors hover:bg-white/5">
        {open ? <ChevronDown className="h-3 w-3 opacity-50" /> : <ChevronRight className="h-3 w-3 opacity-50" />}
        <span className="opacity-60">Tool Result</span>
        <span className="ml-auto text-[10px] opacity-30 font-mono max-w-[200px] truncate">
          {content.slice(0, 60)}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="mt-1 max-h-64 overflow-y-auto rounded-lg bg-black/20 p-3 font-mono text-[11px] leading-relaxed opacity-60 whitespace-pre-wrap break-words">
          {content}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface ChatMessageBubbleProps {
  event: DisplayEvent
  index: number
}

export const ChatMessageBubble = memo(function ChatMessageBubble({ event, index }: ChatMessageBubbleProps) {
  // Status message
  if (isStreamingEvent(event) && event.type === 'status') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="flex justify-center py-1"
      >
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] opacity-40">
          <Info className="h-3 w-3" />
          {event.content}
        </div>
      </motion.div>
    )
  }

  // Error message
  if (isStreamingEvent(event) && event.type === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className="flex justify-start px-4 py-1"
      >
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 max-w-[90%] sm:max-w-[85%]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <div className="text-sm text-red-300">{event.content}</div>
        </div>
      </motion.div>
    )
  }

  // Tool call
  if (isStreamingEvent(event) && event.type === 'tool_call') {
    let parsed: { name: string; args: string } | null = null
    try {
      parsed = JSON.parse(event.content)
    } catch {
      // ignore parse errors
    }
    if (!parsed) return null
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className="flex justify-start px-4 py-0.5"
      >
        <div className="max-w-[90%] sm:max-w-[80%] w-full">
          <ToolCallCard name={parsed.name} args={parsed.args} />
        </div>
      </motion.div>
    )
  }

  // Tool result
  if (isStreamingEvent(event) && event.type === 'tool_result') {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.15 }}
        className="flex justify-start px-4 py-0.5"
      >
        <div className="max-w-[90%] sm:max-w-[80%] w-full">
          <ToolResultCard content={event.content} />
        </div>
      </motion.div>
    )
  }

  // Text / DB message
  const isUser = !isStreamingEvent(event)
    ? event.role === 'user'
    : false

  const content = isStreamingEvent(event)
    ? event.content
    : event.content

  // DB message with tool calls
  if (!isStreamingEvent(event) && event.toolCalls) {
    let toolCalls: { name: string; args: string }[] = []
    try { toolCalls = JSON.parse(event.toolCalls) } catch { /* ignore */ }
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: index * 0.02 }}
        className="flex justify-start px-4 py-1"
      >
        <div className="max-w-[90%] sm:max-w-[80%] w-full space-y-1">
          {toolCalls.map((tc, i) => (
            <ToolCallCard key={i} name={tc.name} args={tc.args} />
          ))}
          {event.toolResult && <ToolResultCard content={event.toolResult} />}
          {content && (
            <div className="rounded-xl p-4 glass">
              <MarkdownContent content={content} />
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, delay: index * 0.02 }}
        className="flex justify-end px-4 py-1.5"
      >
        <div className="max-w-[90%] sm:max-w-[75%] rounded-2xl rounded-br-md bg-amber-500 px-4 py-3 text-sm text-black">
          <div className="whitespace-pre-wrap break-words">{content}</div>
        </div>
      </motion.div>
    )
  }

  // Assistant text message
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.02 }}
      className="flex justify-start px-4 py-1.5"
    >
      <div className="max-w-[90%] sm:max-w-[80%] rounded-2xl rounded-bl-md p-4 glass">
        <MarkdownContent content={content} />
      </div>
    </motion.div>
  )
})

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="flex justify-start px-4 py-2"
    >
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md px-5 py-3 glass">
        <div className="typing-dot h-2 w-2 rounded-full bg-amber-400" />
        <div className="typing-dot h-2 w-2 rounded-full bg-amber-400" />
        <div className="typing-dot h-2 w-2 rounded-full bg-amber-400" />
      </div>
    </motion.div>
  )
}

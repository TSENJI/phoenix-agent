'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { ChatMessageBubble, TypingIndicator } from './chat-message-bubble'
import { OnboardingScreen } from './onboarding-screen'
import { Flame, Zap } from 'lucide-react'

type DisplayEvent = import('@/lib/store').StreamingEvent | (import('@/lib/store').Message & { type: 'db_message' })

function isStreamingEvent(e: DisplayEvent): e is import('@/lib/store').StreamingEvent {
  return 'type' in e && (e as import('@/lib/store').StreamingEvent).type !== 'db_message'
}

export function ChatMessages() {
  const { messages, streamingEvents, isStreaming, currentConversationId, providers } = useAppStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const hasAnyKey = providers.some((p) => p.hasKey && p.enabled)

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingEvents, isStreaming])

  // Build the display list
  const displayEvents: DisplayEvent[] = [
    ...messages.map((m) => ({ ...m, type: 'db_message' as const })),
    ...streamingEvents.filter((e) => e.type !== 'done'),
  ]

  // Show onboarding if no API keys configured
  if (!hasAnyKey && !currentConversationId) {
    return <OnboardingScreen />
  }

  // Show welcome screen if no conversation but has keys
  if (!currentConversationId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500/10 glow-amber">
          <Flame className="h-10 w-10 text-amber-500" />
        </div>
        <h2 className="mb-2 text-2xl font-bold tracking-tight">Phoenix Agent</h2>
        <p className="mb-1 text-sm opacity-50">AI-powered browser automation assistant</p>
        <p className="mb-8 max-w-sm text-xs opacity-30">
          Browse the web, fill forms, click elements, execute shell commands, manage files, and more — all through natural language.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {['Navigate to a website', 'Search the web', 'Fill out a form', 'Run a shell command', 'Upload and process files'].map((hint) => (
            <div
              key={hint}
              className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/3 px-3 py-1.5 text-[11px] opacity-40"
            >
              <Zap className="h-3 w-3 text-amber-500/60" />
              {hint}
            </div>
          ))}
        </div>
        <p className="mt-6 text-[11px] opacity-20">
          {providers.filter((p) => p.hasKey).length} provider{providers.filter((p) => p.hasKey).length !== 1 ? 's' : ''} active
        </p>
      </div>
    )
  }

  if (displayEvents.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <Flame className="mb-4 h-8 w-8 text-amber-500/40" />
        <p className="text-sm opacity-30">Start a conversation...</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl py-4 space-y-0.5">
        {displayEvents.map((event, i) => (
          <ChatMessageBubble key={isStreamingEvent(event) ? `stream-${i}` : event.id} event={event} index={i} />
        ))}
        {isStreaming && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

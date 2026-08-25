'use client'

import { useEffect, useMemo } from 'react'
import { useAppStore } from '@/lib/store'
import { ChatSidebar } from '@/components/chat-sidebar'
import { ChatMessages } from '@/components/chat-messages'
import { ChatInput } from '@/components/chat-input'
import { SettingsSheet } from '@/components/settings-sheet'
import { Button } from '@/components/ui/button'
import { Menu, Moon, Sun, Circle } from 'lucide-react'
import { useTheme } from 'next-themes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

const MODEL_OPTIONS = [
  { id: 'auto', label: 'Auto (Fallback)' },
  { id: 'gemini', label: 'Gemini 2.5 Flash' },
  { id: 'openrouter', label: 'OpenRouter' },
  { id: 'groq', label: 'Groq Llama 3.3' },
  { id: 'nvidia', label: 'Nvidia Llama 3.1' },
]

export default function Home() {
  const {
    setConversations,
    setMessages,
    setSettings,
    setProviders,
    currentConversationId,
    setCurrentConversationId,
    selectedModel,
    setSelectedModel,
    sidebarOpen,
    setSidebarOpen,
    messages,
    providers,
    isStreaming,
  } = useAppStore()

  const { theme, setTheme } = useTheme()

  // Initial data fetch
  useEffect(() => {
    async function init() {
      try {
        const [convRes, settingsRes] = await Promise.all([
          fetch('/api/conversations'),
          fetch('/api/settings'),
        ])
        if (convRes.ok) {
          const convs = await convRes.json()
          setConversations(convs)
        }
        if (settingsRes.ok) {
          const data = await settingsRes.json()
          setSettings(data.settings)
          setProviders(data.providers)
        }
      } catch {
        // silent fail on init
      }
    }
    init()
  }, [setConversations, setSettings, setProviders])

  // Fetch messages when conversation changes
  useEffect(() => {
    if (!currentConversationId) {
      setMessages([])
      return
    }
    async function loadMessages() {
      try {
        const res = await fetch(`/api/conversations/messages?id=${currentConversationId}`)
        if (res.ok) {
          const msgs = await res.json()
          setMessages(msgs)
        }
      } catch {
        // silent fail
      }
    }
    loadMessages()
  }, [currentConversationId, setMessages])

  const currentModelLabel = MODEL_OPTIONS.find((m) => m.id === selectedModel)?.label || 'Auto'
  const activeCount = useMemo(() => providers.filter((p) => p.hasKey && p.enabled).length, [providers])

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* Sidebar */}
      <ChatSidebar />

      {/* Main Content */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Top Bar */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/5 px-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Model selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors hover:bg-white/5">
                  <span className={`h-2 w-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : activeCount > 0 ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <span className="font-medium">{currentModelLabel}</span>
                  <ChevronDown className="h-3 w-3 opacity-40" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                {MODEL_OPTIONS.map((m) => (
                  <DropdownMenuItem
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={selectedModel === m.id ? 'bg-amber-500/10 text-amber-400' : ''}
                  >
                    {m.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Active providers indicator (compact, desktop only) */}
            {activeCount > 0 && (
              <div className="hidden md:flex items-center gap-1 ml-1">
                {providers.filter(p => p.hasKey && p.enabled).map(p => (
                  <div key={p.id} className="flex items-center gap-1 rounded-full border border-white/5 px-2 py-0.5 text-[10px] opacity-40">
                    <Circle className="h-1.5 w-1.5 fill-green-500 text-green-500" />
                    {p.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            {currentConversationId && messages.length > 0 && (
              <span className="mr-2 text-[10px] font-mono opacity-30">
                {messages.length} msgs
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-foreground/40 hover:text-foreground/80"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <ChatMessages />

        {/* Input Area */}
        <ChatInput />
      </main>

      {/* Settings Sheet */}
      <SettingsSheet />
    </div>
  )
}

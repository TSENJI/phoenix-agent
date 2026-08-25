'use client'

import { useAppStore, Conversation } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, MessageSquare, X, Settings, Trash2, Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

export function ChatSidebar() {
  const {
    conversations,
    currentConversationId,
    sidebarOpen,
    setSidebarOpen,
    setCurrentConversationId,
    setConversations,
    setSettingsOpen,
  } = useAppStore()

  const { theme, setTheme } = useTheme()

  const handleDeleteConversation = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const res = await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        setConversations(conversations.filter((c) => c.id !== id))
        if (currentConversationId === id) {
          setCurrentConversationId(null)
        }
        toast.success('Conversation deleted')
      }
    } catch {
      toast.error('Failed to delete')
    }
  }

  const handleNewChat = async () => {
    try {
      const res = await fetch('/api/conversations', { method: 'POST' })
      const conv = await res.json()
      setConversations([conv, ...conversations])
      setCurrentConversationId(conv.id)
      setSidebarOpen(false)
    } catch {
      toast.error('Failed to create chat')
    }
  }

  const handleSelectConversation = (conv: Conversation) => {
    setCurrentConversationId(conv.id)
    setSidebarOpen(false)
  }

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 glass ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--sidebar)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20">
              <span className="text-lg">🔥</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide" style={{ color: 'var(--foreground)' }}>
                Phoenix Agent
              </h1>
              <p className="text-[10px] font-mono opacity-50">BROWSER AUTOMATION</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="opacity-10" />

        {/* New Chat Button */}
        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 pb-4">
            <AnimatePresence mode="popLayout">
              {conversations.length === 0 && (
                <p className="px-2 py-8 text-center text-xs opacity-40">
                  No conversations yet
                </p>
              )}
              {conversations.map((conv) => (
                <motion.div
                  key={conv.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleSelectConversation(conv)}
                  className={`group relative flex cursor-pointer items-start gap-2 rounded-xl p-3 transition-colors ${currentConversationId === conv.id ? 'bg-amber-500/15 text-amber-400' : 'hover:bg-white/5'}`}
                >
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{conv.title}</p>
                    <p className="text-[10px] opacity-40">
                      {conv._count.messages} msg{conv._count.messages !== 1 ? 's' : ''}
                      {conv.updatedAt && (
                        <>
                          {' · '}
                          {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: false })}
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv.id)}
                    className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded-md text-red-400 opacity-0 transition-opacity hover:bg-red-500/20 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Bottom Actions */}
        <Separator className="opacity-10" />
        <div className="flex items-center justify-between p-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-xs opacity-60 hover:opacity-100"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-xs opacity-60 hover:opacity-100"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Button>
        </div>
      </aside>
    </>
  )
}

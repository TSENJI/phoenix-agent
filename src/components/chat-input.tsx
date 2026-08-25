'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Paperclip, Send, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const PROVIDERS = [
  { id: 'auto', name: 'Auto', model: 'auto' },
  { id: 'gemini', name: 'Gemini', model: 'gemini' },
  { id: 'openrouter', name: 'OpenRouter', model: 'openrouter' },
  { id: 'groq', name: 'Groq', model: 'groq' },
  { id: 'nvidia', name: 'Nvidia', model: 'nvidia' },
]

export function ChatInput() {
  const {
    selectedModel,
    setSelectedModel,
    isStreaming,
    uploadedFiles,
    setUploadedFiles,
    currentConversationId,
    addStreamingEvent,
    clearStreamingEvents,
    setIsStreaming,
    setMessages,
    setCurrentConversationId,
    setConversations,
  } = useAppStore()

  const [input, setInput] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mobile
  useEffect(() => {
    if (!isStreaming && textareaRef.current && window.innerWidth < 768) {
      // Don't auto-focus to avoid keyboard popping up unexpectedly
    }
  }, [isStreaming])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
    }
  }, [input])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text && uploadedFiles.length === 0) return
    if (isStreaming) return

    const fileNames = uploadedFiles.map((f) => f.name).join(', ')
    const message = fileNames ? `${text}\n\n[Attached files: ${fileNames}]` : text

    setInput('')
    setUploadedFiles([])
    clearStreamingEvents()
    setIsStreaming(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationId: currentConversationId,
          model: selectedModel,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to send message' }))
        addStreamingEvent({ type: 'error', content: err.error || 'Failed to send message' })
        setIsStreaming(false)
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        addStreamingEvent({ type: 'error', content: 'No response stream' })
        setIsStreaming(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let newConversationId = currentConversationId

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'done' && data.conversationId) {
              newConversationId = data.conversationId
            } else if (data.type) {
              addStreamingEvent({ ...data })
            }
          } catch {
            // ignore parse errors
          }
        }
      }

      // Update conversation ID if new
      if (newConversationId && newConversationId !== currentConversationId) {
        setCurrentConversationId(newConversationId)
        // Refresh conversations list
        const convRes = await fetch('/api/conversations')
        if (convRes.ok) {
          const convs = await convRes.json()
          setConversations(convs)
        }
      }

      // Refresh messages for this conversation
      if (newConversationId) {
        const msgRes = await fetch(`/api/conversations/messages?id=${newConversationId}`)
        if (msgRes.ok) {
          const msgs = await msgRes.json()
          setMessages(msgs)
          clearStreamingEvents()
        }
      }
    } catch (err) {
      addStreamingEvent({
        type: 'error',
        content: err instanceof Error ? err.message : 'Network error',
      })
    } finally {
      setIsStreaming(false)
    }
  }, [input, isStreaming, uploadedFiles, currentConversationId, selectedModel, addStreamingEvent, clearStreamingEvents, setIsStreaming, setMessages, setCurrentConversationId, setConversations, setUploadedFiles])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i])
      }

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        toast.error('Upload failed')
        return
      }

      const data = await res.json()
      setUploadedFiles([...uploadedFiles, ...data.files])
      toast.success(`${data.files.length} file${data.files.length > 1 ? 's' : ''} uploaded`)
    } catch {
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))
  }

  const currentProvider = PROVIDERS.find((p) => p.id === selectedModel)

  return (
    <div className="border-t border-white/5 bg-background/80 backdrop-blur-xl">
      {/* File chips */}
      {uploadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {uploadedFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs"
            >
              <Paperclip className="h-3 w-3 text-amber-400" />
              <span className="max-w-[150px] truncate text-amber-300">{file.name}</span>
              <button onClick={() => removeFile(i)} className="text-amber-400/60 hover:text-amber-400">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Model quick-select chips */}
      <div className="flex gap-1.5 overflow-x-auto px-4 py-2">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedModel(p.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-medium transition-all ${
              selectedModel === p.id
                ? 'bg-amber-500 text-black'
                : 'bg-white/5 text-foreground/50 hover:bg-white/10 hover:text-foreground/80'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 px-4 pb-4">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button
          variant="ghost"
          size="icon"
          className="mb-0.5 h-10 w-10 shrink-0 rounded-xl text-foreground/40 hover:bg-white/5 hover:text-amber-400"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
        >
          {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
        </Button>

        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentProvider ? `Message (using ${currentProvider.name})...` : 'Type a message...'}
            rows={1}
            disabled={isStreaming}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/3 px-4 py-2.5 pr-12 text-sm outline-none transition-colors placeholder:text-foreground/25 focus:border-amber-500/40 focus:bg-white/5 disabled:opacity-50"
            style={{ fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}
          />
          <Button
            size="icon"
            className="absolute bottom-1.5 right-1.5 h-7 w-7 rounded-lg bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-30"
            onClick={handleSend}
            disabled={isStreaming || (!input.trim() && uploadedFiles.length === 0)}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

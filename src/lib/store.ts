import { create } from 'zustand'

export interface Conversation {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
  _count: { messages: number }
}

export interface Message {
  id: string
  role: string
  content: string
  model?: string
  toolCalls?: string
  toolResult?: string
  conversationId: string
  createdAt: string
}

export interface ProviderStatus {
  id: string
  name: string
  model: string
  hasKey: boolean
  enabled: boolean
}

export interface StreamingEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'status' | 'done' | 'human_takeover'
  content: string
  conversationId?: string
  reason?: string
  action?: string
  screenshot?: string
}

interface AppState {
  // Conversations
  conversations: Conversation[]
  currentConversationId: string | null
  messages: Message[]
  streamingEvents: StreamingEvent[]
  isLoading: boolean
  isStreaming: boolean

  // Settings
  settings: Record<string, string>
  providers: ProviderStatus[]
  settingsOpen: boolean

  // UI
  sidebarOpen: boolean
  selectedModel: string

  // Uploaded files
  uploadedFiles: { name: string; path: string; size: number; type: string }[]

  // Actions
  setConversations: (conversations: Conversation[]) => void
  setCurrentConversationId: (id: string | null) => void
  setMessages: (messages: Message[]) => void
  addStreamingEvent: (event: StreamingEvent) => void
  clearStreamingEvents: () => void
  setIsLoading: (loading: boolean) => void
  setIsStreaming: (streaming: boolean) => void
  setSettings: (settings: Record<string, string>) => void
  setProviders: (providers: ProviderStatus[]) => void
  setSettingsOpen: (open: boolean) => void
  setSidebarOpen: (open: boolean) => void
  setSelectedModel: (model: string) => void
  setUploadedFiles: (files: { name: string; path: string; size: number; type: string }[]) => void
  reset: () => void
}

const initialState = {
  conversations: [] as Conversation[],
  currentConversationId: null as string | null,
  messages: [] as Message[],
  streamingEvents: [] as StreamingEvent[],
  isLoading: false,
  isStreaming: false,
  settings: {} as Record<string, string>,
  providers: [] as ProviderStatus[],
  settingsOpen: false,
  sidebarOpen: false,
  selectedModel: 'auto',
  uploadedFiles: [] as { name: string; path: string; size: number; type: string }[],
}

export const useAppStore = create<AppState>((set) => ({
  ...initialState,

  setConversations: (conversations) => set({ conversations }),
  setCurrentConversationId: (id) => set({ currentConversationId: id }),
  setMessages: (messages) => set({ messages }),
  addStreamingEvent: (event) =>
    set((state) => ({ streamingEvents: [...state.streamingEvents, event] })),
  clearStreamingEvents: () => set({ streamingEvents: [] }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
  setSettings: (settings) => set({ settings }),
  setProviders: (providers) => set({ providers }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setSelectedModel: (model) => set({ selectedModel: model }),
  setUploadedFiles: (files) => set({ uploadedFiles: files }),
  reset: () => set(initialState),
}))

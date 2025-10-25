export interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  sessionId?: string
}

export interface AIRole {
  id: string
  name: string
  description: string
  avatar?: string
  color?: string
  icon?: React.ReactNode
  personality?: string
  capabilities?: string[]
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  userId?: string
  roleId?: string
}

export interface ChatContextType {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  currentRole: AIRole | null
  isLoading: boolean
  sendMessage: (content: string) => Promise<void>
  createSession: (title?: string, roleId?: string) => Promise<ChatSession>
  loadSession: (sessionId: string) => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>
  loadUserSessions: () => Promise<void>
  setCurrentRole: (role: AIRole) => void
}

export interface AIResponse {
  content: string
  model?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
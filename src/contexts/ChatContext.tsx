'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { ChatContextType, ChatSession, Message, AIRole } from '@/types/chat'
import { AIService } from '@/lib/ai-service'
import { useAuth } from './AuthContext'

// 演示模式标志
const DEMO_MODE = process.env.NODE_ENV === 'development' && 
  (!process.env.NEXT_PUBLIC_SUPABASE_URL || 
   process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id'))

const ChatContext = createContext<ChatContextType | undefined>(undefined)

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null)
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentRole, setCurrentRole] = useState<AIRole | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // 发送消息
  const sendMessage = useCallback(async (content: string) => {
    if (!currentSession) {
      console.error('没有活动的聊天会话')
      return
    }

    setIsLoading(true)

    try {
      // 创建用户消息
      const userMessage: Message = {
        id: `msg-${Date.now()}-user`,
        content,
        role: 'user',
        timestamp: new Date(),
        sessionId: currentSession.id
      }

      // 更新会话消息
      const updatedSession = {
        ...currentSession,
        messages: [...currentSession.messages, userMessage],
        updatedAt: new Date()
      }
      setCurrentSession(updatedSession)

      // 更新会话列表
      setSessions(prev => 
        prev.map(s => s.id === currentSession.id ? updatedSession : s)
      )

      // 获取AI回复（改用静态方法，并构造兼容的角色对象）
      const roleObj = {
        id: currentRole?.id || 'general',
        name: currentRole?.name || '通用助手',
        description: currentRole?.description || '',
        specialties: (currentRole as any)?.capabilities || [],
        personality: (currentRole as any)?.personality || '',
        avatar_url: currentRole?.avatar || '🤖',
        settings: { tone: 'balanced', creativity: 0.7, verbosity: 'medium' },
        api_config: (currentRole as any)?.api_config || undefined // 使用角色的API配置
      } as any

      const response = await AIService.generateResponse(roleObj, content, currentSession.id, user?.id)

      // 创建AI消息
      const aiMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        content: response.content,
        role: 'assistant',
        timestamp: new Date(),
        sessionId: currentSession.id
      }

      // 更新会话消息
      const finalSession = {
        ...updatedSession,
        messages: [...updatedSession.messages, aiMessage],
        updatedAt: new Date()
      }
      setCurrentSession(finalSession)

      // 更新会话列表
      setSessions(prev => 
        prev.map(s => s.id === currentSession.id ? finalSession : s)
      )

      // 在演示模式下保存到本地存储
      if (DEMO_MODE) {
        const savedSessions = JSON.parse(localStorage.getItem('chat-sessions') || '[]')
        const updatedSessions = savedSessions.map((s: ChatSession) => 
          s.id === currentSession.id ? finalSession : s
        )
        localStorage.setItem('chat-sessions', JSON.stringify(updatedSessions))
      }

    } catch (error) {
      console.error('发送消息失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentSession, currentRole])

  // 创建新会话
  const createSession = useCallback(async (title?: string, roleId?: string): Promise<ChatSession> => {
    const sessionId = `session-${Date.now()}`
    const newSession: ChatSession = {
      id: sessionId,
      title: title || '新对话',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: user?.id,
      roleId: roleId || currentRole?.id
    }

    setSessions(prev => [newSession, ...prev])
    setCurrentSession(newSession)

    // 在演示模式下保存到本地存储
    if (DEMO_MODE) {
      const savedSessions = JSON.parse(localStorage.getItem('chat-sessions') || '[]')
      savedSessions.unshift(newSession)
      localStorage.setItem('chat-sessions', JSON.stringify(savedSessions))
    }

    return newSession
  }, [user, currentRole])

  // 加载会话
  const loadSession = useCallback(async (sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSession(session)
    }
  }, [sessions])

  // 删除会话
  const deleteSession = useCallback(async (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(null)
    }

    // 在演示模式下从本地存储删除
    if (DEMO_MODE) {
      const savedSessions = JSON.parse(localStorage.getItem('chat-sessions') || '[]')
      const filteredSessions = savedSessions.filter((s: ChatSession) => s.id !== sessionId)
      localStorage.setItem('chat-sessions', JSON.stringify(filteredSessions))
    }
  }, [currentSession])

  // 更新会话标题
  const updateSessionTitle = useCallback(async (sessionId: string, title: string) => {
    setSessions(prev => 
      prev.map(s => s.id === sessionId ? { ...s, title, updatedAt: new Date() } : s)
    )

    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, title, updatedAt: new Date() } : null)
    }

    // 在演示模式下更新本地存储
    if (DEMO_MODE) {
      const savedSessions = JSON.parse(localStorage.getItem('chat-sessions') || '[]')
      const updatedSessions = savedSessions.map((s: ChatSession) => 
        s.id === sessionId ? { ...s, title, updatedAt: new Date() } : s
      )
      localStorage.setItem('chat-sessions', JSON.stringify(updatedSessions))
    }
  }, [currentSession])

  // 加载用户会话
  const loadUserSessions = useCallback(async () => {
    if (DEMO_MODE) {
      // 演示模式：从本地存储加载
      const savedSessions = JSON.parse(localStorage.getItem('chat-sessions') || '[]')
      setSessions(savedSessions)
    } else {
      // 生产模式：从数据库加载
      // TODO: 实现数据库查询
      setSessions([])
    }
  }, [])

  const value: ChatContextType = {
    sessions,
    currentSession,
    currentRole,
    isLoading,
    sendMessage,
    createSession,
    loadSession,
    deleteSession,
    updateSessionTitle,
    loadUserSessions,
    setCurrentRole
  }

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChat() {
  const context = useContext(ChatContext)
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider')
  }
  return context
}
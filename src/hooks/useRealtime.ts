'use client'

import { useState, useEffect, useCallback } from 'react'
import { webSocketService } from '@/lib/websocket'
import { useAuth } from '@/contexts/AuthContext'

export interface ConnectionStatus {
  status: 'connected' | 'disconnected' | 'reconnecting'
  lastConnected?: Date
}

export interface RealtimeMessage {
  id: string
  type: string
  data: any
  timestamp: string
  userId: string
}

// 基础实时连接 Hook
export function useRealtime() {
  const { user } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected'
  })
  const [messages, setMessages] = useState<RealtimeMessage[]>([])
  const [connectionAttempts, setConnectionAttempts] = useState(0)

  useEffect(() => {
    // 如果用户已登录，连接 WebSocket
    if (user) {
      webSocketService.connect(user.id, user.name)
    }

    // 监听连接状态
    const unsubscribeStatus = webSocketService.on('connection_status', (status: any) => {
      setConnectionStatus({
        status: status.status,
        lastConnected: status.status === 'connected' ? new Date() : undefined
      })
      
      // 更新连接尝试次数
      if (status.status === 'reconnecting') {
        setConnectionAttempts(prev => prev + 1)
      } else if (status.status === 'connected') {
        setConnectionAttempts(0)
      }
    })

    // 监听消息
    const unsubscribeMessage = webSocketService.on('message', (message: RealtimeMessage) => {
      setMessages(prev => [...prev, message])
    })

    return () => {
      unsubscribeStatus()
      unsubscribeMessage()
    }
  }, [user])

  const sendMessage = useCallback((type: string, data: any) => {
    if (!user) return

    const message = {
      type,
      data,
      timestamp: new Date().toISOString(),
      userId: user.id,
    }
    webSocketService.sendMessage(message as any)
  }, [user])

  return {
    connectionStatus,
    messages,
    sendMessage,
    isConnected: connectionStatus.status === 'connected',
    connected: connectionStatus.status === 'connected', // 添加 connected 属性以兼容 ConnectionStatus 组件
    connectionAttempts
  }
}

// 任务实时同步 Hook
export function useTaskRealtime(taskId?: string) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState<any[]>([])
  const [taskUpdates, setTaskUpdates] = useState<any[]>([])

  useEffect(() => {
    const unsubscribe = webSocketService.on('task_update', (update: any) => {
      if (!taskId || update.taskId === taskId) {
        setTaskUpdates(prev => [...prev, update])
        
        // 更新任务列表
        setTasks(prev => {
          const index = prev.findIndex(task => task.id === update.taskId)
          if (index >= 0) {
            const updatedTasks = [...prev]
            updatedTasks[index] = { ...updatedTasks[index], ...update.updates }
            return updatedTasks
          }
          return prev
        })
      }
    })

    return unsubscribe
  }, [taskId])

  const updateTask = useCallback((taskId: string, updates: any) => {
    if (!user) return

    const message = {
      type: 'task_update',
      taskId,
      updates,
      timestamp: new Date().toISOString(),
      userId: user.id,
    }
    webSocketService.sendMessage(message as any)
  }, [user])

  return {
    tasks,
    taskUpdates,
    updateTask
  }
}

// 聊天实时同步 Hook
export function useChatRealtime(roomId?: string) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<any[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  useEffect(() => {
    if (roomId && user) {
      webSocketService.joinRoom(roomId)
    }

    const unsubscribeMessage = webSocketService.on('chat_message', (message: any) => {
      if (!roomId || message.roomId === roomId) {
        setMessages(prev => [...prev, message])
      }
    })

    const unsubscribeTyping = webSocketService.on('typing', (data: any) => {
      if (!roomId || data.roomId === roomId) {
        setTypingUsers(prev => {
          if (data.isTyping) {
            return prev.includes(data.userId) ? prev : [...prev, data.userId]
          } else {
            return prev.filter(id => id !== data.userId)
          }
        })
      }
    })

    return () => {
      if (roomId && user) {
        webSocketService.leaveRoom(roomId)
      }
      unsubscribeMessage()
      unsubscribeTyping()
    }
  }, [roomId, user])

  const sendMessage = useCallback((content: string) => {
    if (!user) return

    const message = {
      type: 'chat_message',
      id: Date.now().toString(),
      content,
      userId: user.id,
      userName: user.name,
      timestamp: new Date().toISOString(),
      roomId,
    }
    webSocketService.sendMessage(message as any)
  }, [roomId, user])

  const startTyping = useCallback(() => {
    if (roomId) {
      webSocketService.startTyping(roomId)
    }
  }, [roomId])

  const stopTyping = useCallback(() => {
    if (roomId) {
      webSocketService.stopTyping(roomId)
    }
  }, [roomId])

  return {
    messages,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping
  }
}

// 用户在线状态 Hook
export function useUserPresence() {
  const { user } = useAuth()
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [userCount, setUserCount] = useState(0)

  useEffect(() => {
    const unsubscribePresence = webSocketService.on('user_presence', (data: any) => {
      if (data.type === 'user_joined') {
        setOnlineUsers(prev => {
          if (!prev.find(u => u.id === data.user.id)) {
            return [...prev, data.user]
          }
          return prev
        })
      } else if (data.type === 'user_left') {
        setOnlineUsers(prev => prev.filter(u => u.id !== data.userId))
      } else if (data.type === 'user_list') {
        setOnlineUsers(data.users)
      }
      setUserCount(data.userCount || onlineUsers.length)
    })

    return unsubscribePresence
  }, [onlineUsers.length])

  const updateStatus = useCallback((status: 'online' | 'away' | 'busy') => {
    if (!user) return

    const message = {
      type: 'user_presence',
      status,
      timestamp: new Date().toISOString(),
      userId: user.id,
    }
    webSocketService.sendMessage(message as any)
  }, [user])

  return {
    onlineUsers,
    userCount,
    updateStatus
  }
}
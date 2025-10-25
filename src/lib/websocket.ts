'use client'

import { mockWebSocketServer, MockWebSocketMessage } from './mock-websocket'

export interface TaskUpdateMessage {
  type: 'task_update'
  taskId: string
  updates: any
  userId: string
  timestamp: string
}

export interface UserPresenceMessage {
  type: 'user_presence'
  userId: string
  status: 'online' | 'offline' | 'away'
  timestamp: string
}

export interface ChatMessage {
  type: 'chat_message'
  id: string
  content: string
  userId: string
  userName: string
  timestamp: string
  roomId?: string
  isAI?: boolean
}

export type RealtimeMessage = TaskUpdateMessage | UserPresenceMessage | ChatMessage

export class WebSocketService {
  private isConnected = false
  private currentUserId: string | null = null
  private currentUserName: string | null = null
  private listeners: Map<string, Function[]> = new Map()
  private connectionCheckInterval: NodeJS.Timeout | null = null
  private initialized = false

  constructor() {
    // 不在构造函数中立即初始化，而是延迟到第一次使用时
  }

  private ensureInitialized() {
    if (!this.initialized) {
      this.initialized = true
      this.setupMockConnection()
    }
  }

  private setupMockConnection() {
    // 立即设置为连接状态，因为这是模拟环境
    this.isConnected = true
    this.emit('connection_status', { status: 'connected' })
    
    // 设置消息监听
    mockWebSocketServer.addEventListener('message', (message: MockWebSocketMessage) => {
      this.handleMessage(message)
    })

    // 模拟连接状态检查（降低断线概率）
    this.connectionCheckInterval = setInterval(() => {
      if (Math.random() < 0.01) { // 降低到1%概率模拟短暂断线
        this.simulateReconnection()
      }
    }, 30000) // 增加检查间隔到30秒
  }

  private simulateReconnection() {
    this.isConnected = false
    this.emit('connection_status', { status: 'reconnecting' })
    
    setTimeout(() => {
      this.isConnected = true
      this.emit('connection_status', { status: 'connected' })
    }, 2000 + Math.random() * 3000)
  }

  private handleMessage(message: MockWebSocketMessage) {
    // 转换消息格式
    switch (message.type) {
      case 'message':
        this.emit('chat_message', message.data)
        this.emit('message', message.data)
        break
      case 'user_join':
      case 'user_leave':
        this.emit('user_presence', {
          type: 'user_presence',
          userId: message.userId,
          status: message.type === 'user_join' ? 'online' : 'offline',
          timestamp: message.timestamp,
          userName: message.userName
        })
        break
      case 'typing_start':
      case 'typing_stop':
        this.emit('typing', {
          userId: message.data.userId,
          userName: message.data.userName,
          isTyping: message.type === 'typing_start',
          roomId: message.data.roomId
        })
        break
      case 'task_update':
        this.emit('task_update', message.data)
        break
    }
  }

  public connect(userId: string, userName: string) {
    this.ensureInitialized()
    this.currentUserId = userId
    this.currentUserName = userName
    
    if (this.isConnected) {
      mockWebSocketServer.connect(userId, userName)
    }
  }

  public sendMessage(message: RealtimeMessage) {
    this.ensureInitialized()
    if (!this.isConnected || !this.currentUserId) {
      console.warn('WebSocket not connected or user not set, message not sent:', message)
      return
    }

    if (message.type === 'chat_message') {
      const chatMessage = message as ChatMessage
      mockWebSocketServer.sendMessage(
        this.currentUserId,
        chatMessage.roomId || 'general',
        chatMessage.content
      )
    }
  }

  public joinRoom(roomId: string) {
    this.ensureInitialized()
    if (this.isConnected && this.currentUserId) {
      mockWebSocketServer.joinRoom(this.currentUserId, roomId)
    }
  }

  public leaveRoom(roomId: string) {
    this.ensureInitialized()
    if (this.isConnected && this.currentUserId) {
      mockWebSocketServer.leaveRoom(this.currentUserId, roomId)
    }
  }

  public updateUserStatus(status: 'online' | 'offline' | 'away') {
    this.ensureInitialized()
    if (this.isConnected && this.currentUserId) {
      mockWebSocketServer.updateUserStatus(this.currentUserId, status as any)
    }
  }

  public startTyping(roomId: string) {
    this.ensureInitialized()
    if (this.isConnected && this.currentUserId) {
      mockWebSocketServer.startTyping(this.currentUserId, roomId)
    }
  }

  public stopTyping(roomId: string) {
    this.ensureInitialized()
    if (this.isConnected && this.currentUserId) {
      mockWebSocketServer.stopTyping(this.currentUserId, roomId)
    }
  }

  public getOnlineUsers() {
    this.ensureInitialized()
    return mockWebSocketServer.getOnlineUsers()
  }

  public on(event: string, callback: Function) {
    this.ensureInitialized()
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
    
    // 返回取消订阅函数
    return () => {
      this.off(event, callback)
    }
  }

  public off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      const index = eventListeners.indexOf(callback)
      if (index > -1) {
        eventListeners.splice(index, 1)
      }
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event) || []
    eventListeners.forEach(callback => callback(data))
  }

  public isConnectedStatus(): boolean {
    this.ensureInitialized()
    return this.isConnected
  }

  public disconnect() {
    this.ensureInitialized()
    if (this.currentUserId) {
      mockWebSocketServer.disconnect(this.currentUserId)
    }
    
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval)
      this.connectionCheckInterval = null
    }
    
    this.isConnected = false
    this.currentUserId = null
    this.currentUserName = null
  }
}

// 导出单例实例
export const webSocketService = new WebSocketService()
// Mock WebSocket 服务器，用于演示实时功能
// 在实际项目中，这应该是一个真实的 WebSocket 服务器

export interface MockWebSocketMessage {
  type: 'message' | 'user_join' | 'user_leave' | 'typing_start' | 'typing_stop' | 'task_update'
  data: any
  timestamp: string
  userId?: string
  userName?: string
}

export class MockWebSocketServer {
  private static instance: MockWebSocketServer
  private listeners: Map<string, ((message: MockWebSocketMessage) => void)[]> = new Map()
  private connectedUsers: Map<string, { id: string; name: string; status: 'online' | 'away' | 'busy' }> = new Map()
  private rooms: Map<string, Set<string>> = new Map()

  static getInstance(): MockWebSocketServer {
    if (!MockWebSocketServer.instance) {
      MockWebSocketServer.instance = new MockWebSocketServer()
    }
    return MockWebSocketServer.instance
  }

  // 连接用户
  connect(userId: string, userName: string): void {
    this.connectedUsers.set(userId, {
      id: userId,
      name: userName,
      status: 'online'
    })

    // 通知其他用户有新用户加入
    this.broadcast({
      type: 'user_join',
      data: { userId, userName },
      timestamp: new Date().toISOString(),
      userId,
      userName
    })

    // 模拟一些初始在线用户
    if (this.connectedUsers.size === 1) {
      this.addMockUsers()
    }
  }

  // 断开用户连接
  disconnect(userId: string): void {
    const user = this.connectedUsers.get(userId)
    if (user) {
      this.connectedUsers.delete(userId)
      
      // 从所有房间移除用户
      this.rooms.forEach((users, roomId) => {
        users.delete(userId)
      })

      // 通知其他用户有用户离开
      this.broadcast({
        type: 'user_leave',
        data: { userId, userName: user.name },
        timestamp: new Date().toISOString(),
        userId,
        userName: user.name
      })
    }
  }

  // 加入房间
  joinRoom(userId: string, roomId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set())
    }
    this.rooms.get(roomId)!.add(userId)
  }

  // 离开房间
  leaveRoom(userId: string, roomId: string): void {
    const room = this.rooms.get(roomId)
    if (room) {
      room.delete(userId)
      if (room.size === 0) {
        this.rooms.delete(roomId)
      }
    }
  }

  // 发送消息
  sendMessage(userId: string, roomId: string, message: string): void {
    const user = this.connectedUsers.get(userId)
    if (!user) return

    const messageData: MockWebSocketMessage = {
      type: 'message',
      data: {
        id: Date.now().toString(),
        content: message,
        userId,
        userName: user.name,
        roomId,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      userId,
      userName: user.name
    }

    // 发送给房间内的所有用户
    this.broadcastToRoom(roomId, messageData)

    // 模拟 AI 回复
    setTimeout(() => {
      this.simulateAIResponse(roomId, message)
    }, 1000 + Math.random() * 2000)
  }

  // 开始输入
  startTyping(userId: string, roomId: string): void {
    const user = this.connectedUsers.get(userId)
    if (!user) return

    this.broadcastToRoom(roomId, {
      type: 'typing_start',
      data: { userId, userName: user.name, roomId },
      timestamp: new Date().toISOString(),
      userId,
      userName: user.name
    })
  }

  // 停止输入
  stopTyping(userId: string, roomId: string): void {
    const user = this.connectedUsers.get(userId)
    if (!user) return

    this.broadcastToRoom(roomId, {
      type: 'typing_stop',
      data: { userId, userName: user.name, roomId },
      timestamp: new Date().toISOString(),
      userId,
      userName: user.name
    })
  }

  // 更新用户状态
  updateUserStatus(userId: string, status: 'online' | 'away' | 'busy'): void {
    const user = this.connectedUsers.get(userId)
    if (user) {
      user.status = status
      this.connectedUsers.set(userId, user)
    }
  }

  // 获取在线用户
  getOnlineUsers(): Array<{ id: string; name: string; status: 'online' | 'away' | 'busy' }> {
    return Array.from(this.connectedUsers.values())
  }

  // 添加事件监听器
  addEventListener(event: string, callback: (message: MockWebSocketMessage) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  // 移除事件监听器
  removeEventListener(event: string, callback: (message: MockWebSocketMessage) => void): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      const index = eventListeners.indexOf(callback)
      if (index > -1) {
        eventListeners.splice(index, 1)
      }
    }
  }

  // 广播消息给所有用户
  private broadcast(message: MockWebSocketMessage): void {
    const listeners = this.listeners.get('message') || []
    listeners.forEach(callback => callback(message))
  }

  // 广播消息给房间内的用户
  private broadcastToRoom(roomId: string, message: MockWebSocketMessage): void {
    const room = this.rooms.get(roomId)
    if (room) {
      const listeners = this.listeners.get('message') || []
      listeners.forEach(callback => callback(message))
    }
  }

  // 模拟 AI 回复
  private simulateAIResponse(roomId: string, userMessage: string): void {
    const aiResponses = [
      "这是一个很有趣的问题！让我来帮你分析一下...",
      "根据你的描述，我建议你可以尝试以下几种方法：",
      "我理解你的需求，这里有一些相关的信息可能对你有帮助。",
      "这个问题确实需要仔细考虑，让我为你提供一些建议。",
      "很好的想法！我们可以从以下几个角度来思考这个问题：",
    ]

    const response = aiResponses[Math.floor(Math.random() * aiResponses.length)]

    this.broadcastToRoom(roomId, {
      type: 'message',
      data: {
        id: Date.now().toString(),
        content: response,
        userId: 'ai-assistant',
        userName: 'AI 助手',
        roomId,
        timestamp: new Date().toISOString(),
        isAI: true
      },
      timestamp: new Date().toISOString(),
      userId: 'ai-assistant',
      userName: 'AI 助手'
    })
  }

  // 添加一些模拟用户
  private addMockUsers(): void {
    const mockUsers = [
      { id: 'user-1', name: '张三', status: 'online' as const },
      { id: 'user-2', name: '李四', status: 'away' as const },
      { id: 'user-3', name: '王五', status: 'busy' as const },
    ]

    mockUsers.forEach(user => {
      this.connectedUsers.set(user.id, user)
    })
  }
}

// 导出单例实例
export const mockWebSocketServer = MockWebSocketServer.getInstance()
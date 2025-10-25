'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Paperclip, Smile, Mic, Square, Users } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { MessageBubble } from './MessageBubble'
import { useChatRealtime, useUserPresence } from '@/hooks/useRealtime'
import { ConnectionStatus } from '@/components/realtime/ConnectionStatus'
import { OnlineUsersIndicator } from '@/components/realtime/OnlineUsers'

export function ChatInterface() {
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [showOnlineUsers, setShowOnlineUsers] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { currentSession, currentRole, sendMessage } = useChat()
  
  // 实时功能
  const { messages: realtimeMessages, sendMessage: sendRealtimeMessage, isTyping, typingUsers } = useChatRealtime(currentSession?.id || '')
  const { onlineUsers, userCount } = useUserPresence()

  // 判断是否为群聊模式（当前实现中，我们主要使用单人AI聊天）
  const isGroupChat = false // 目前所有聊天都是单人AI聊天
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [currentSession?.messages, realtimeMessages])

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    setMessage('')
    setIsLoading(true)

    try {
      if (isGroupChat) {
        // 群聊模式：只使用实时聊天系统
        sendRealtimeMessage(userMessage)
      } else {
        // 单人AI聊天模式：只使用本地ChatContext系统
        await sendMessage(userMessage)
      }
    } catch (error) {
      console.error('发送消息失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording)
    // TODO: 实现语音录制功能
  }

  // 根据聊天类型获取要显示的消息
  const getDisplayMessages = () => {
    if (isGroupChat) {
      // 群聊模式：只显示实时消息
      return realtimeMessages
    } else {
      // 单人AI聊天模式：只显示本地消息
      return currentSession?.messages || []
    }
  }

  const displayMessages = getDisplayMessages()

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 头部状态栏 */}
      <div className="border-b bg-card p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* 角色头像和信息 */}
            {currentRole ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium text-lg">
                  {currentRole.avatar || '🤖'}
                </div>
                <div className="flex flex-col">
                  <h2 className="font-semibold text-foreground text-lg">{currentRole.name}</h2>
                  {currentRole.description && (
                    <p className="text-sm text-muted-foreground truncate max-w-xs" title={currentRole.description}>
                      {currentRole.description}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <h2 className="font-semibold text-foreground">AI 助手</h2>
            )}
            {/* 只在群聊模式下显示连接状态 */}
            {isGroupChat && <ConnectionStatus />}
          </div>
          <div className="flex items-center gap-2">
            {/* 只在群聊模式下显示在线用户 */}
            {isGroupChat && (
              <OnlineUsersIndicator 
                userCount={userCount}
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
              />
            )}
          </div>
        </div>
        
        {/* 只在群聊模式下显示正在输入指示器 */}
        {isGroupChat && typingUsers.length > 0 && (
          <div className="mt-2 text-sm text-muted-foreground">
            {typingUsers.join(', ')} 正在输入...
          </div>
        )}
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto">
        {displayMessages.length > 0 ? (
          <div className="p-4 space-y-4">
            {displayMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                开始新的对话
              </h3>
              <p className="text-muted-foreground text-sm">
                向AI助手提问任何问题，获得智能回答和建议
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t bg-card p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* 输入框容器 */}
          <div className="relative">
            <div className="flex items-end gap-2">
              {/* 附件按钮 */}
              <button
                type="button"
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                title="添加附件"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* 文本输入框 */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入您的消息... (Shift+Enter 换行)"
                  className="w-full px-4 py-3 pr-12 border border-input rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent bg-background text-foreground placeholder:text-muted-foreground"
                  disabled={isLoading}
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                
                {/* 表情按钮 */}
                <button
                  type="button"
                  className="absolute right-3 bottom-3 p-1 text-muted-foreground hover:text-foreground transition-colors"
                  title="添加表情"
                >
                  <Smile className="w-4 h-4" />
                </button>
              </div>

              {/* 语音/发送按钮 */}
              <div className="flex gap-1">
                {message.trim() ? (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="发送消息"
                  >
                    {isLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleVoiceRecord}
                    className={`p-2 rounded-lg transition-colors ${
                      isRecording 
                        ? 'bg-red-500 text-white hover:bg-red-600' 
                        : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80'
                    }`}
                    title={isRecording ? "停止录音" : "语音输入"}
                  >
                    {isRecording ? (
                      <Square className="w-5 h-5" />
                    ) : (
                      <Mic className="w-5 h-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 提示文本 */}
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              AI正在思考中...
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
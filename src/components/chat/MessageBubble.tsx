'use client'

import React from 'react'
import { User, Bot, Copy, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react'
import { Message } from '@/types/chat'
import { cn } from '@/lib/utils'

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
   const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
  }

  const handleRegenerate = () => {
    // TODO: 实现重新生成功能
  }

  const handleFeedback = (type: 'like' | 'dislike') => {
    // TODO: 实现反馈功能
  }

  return (
    <div className={cn("flex items-start gap-3 group", isUser && "flex-row-reverse")}>
      {/* 头像 */}
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0",
        isUser 
          ? "bg-primary" 
          : "bg-gradient-to-br from-blue-500 to-purple-600"
      )}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* 消息内容容器 */}
      <div className={cn("flex flex-col gap-1 max-w-[70%]", isUser && "items-end")}>
        {/* 消息气泡 */}
        <div className={cn(
          "rounded-2xl px-4 py-3 shadow-sm",
          isUser 
            ? "bg-primary text-primary-foreground rounded-br-md" 
            : "bg-card border rounded-bl-md"
        )}>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </div>
        </div>

        {/* 时间戳和操作按钮 */}
        <div className={cn(
          "flex items-center gap-2 px-2",
          isUser ? "flex-row-reverse" : ""
        )}>
          <span className="text-xs text-muted-foreground">
            {message.timestamp ? new Date(message.timestamp as any).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit'
            }) : ''}
          </span>

          {/* AI消息的操作按钮 */}
          {!isUser && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                title="复制消息"
              >
                <Copy className="w-3 h-3" />
              </button>
              
              <button
                onClick={handleRegenerate}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                title="重新生成"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => handleFeedback('like')}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-green-600 transition-colors"
                title="有用"
              >
                <ThumbsUp className="w-3 h-3" />
              </button>
              
              <button
                onClick={() => handleFeedback('dislike')}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-red-600 transition-colors"
                title="无用"
              >
                <ThumbsDown className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
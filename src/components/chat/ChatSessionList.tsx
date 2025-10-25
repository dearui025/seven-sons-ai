'use client'

import React, { useState } from 'react'
import { MessageCircle, Trash2, Edit2, Check, X, Plus } from 'lucide-react'
import { useChat } from '@/contexts/ChatContext'
import { ChatSession } from '@/types/chat'
import { cn } from '@/lib/utils'

interface ChatSessionListProps {
  onSessionSelect: (session: ChatSession) => void
  onNewChat: () => void
  className?: string
}

export function ChatSessionList({ 
  onSessionSelect, 
  onNewChat, 
  className 
}: ChatSessionListProps) {
  const { 
    sessions, 
    currentSession, 
    deleteSession, 
    updateSessionTitle, 
    isLoading 
  } = useChat()
  
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  // 开始编辑标题
  const startEditing = (session: ChatSession) => {
    setEditingSessionId(session.id)
    setEditTitle(session.title)
  }

  // 保存标题
  const saveTitle = async (sessionId: string) => {
    if (editTitle.trim()) {
      await updateSessionTitle(sessionId, editTitle.trim())
    }
    setEditingSessionId(null)
    setEditTitle('')
  }

  // 取消编辑
  const cancelEditing = () => {
    setEditingSessionId(null)
    setEditTitle('')
  }

  // 删除会话
  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('确定要删除这个对话吗？')) {
      await deleteSession(sessionId)
    }
  }

  // 格式化时间
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    } else if (days === 1) {
      return '昨天'
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric' 
      })
    }
  }

  return (
    <div className={cn("flex flex-col h-full bg-gray-50", className)}>
      {/* 头部 */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">对话历史</h2>
          <button
            onClick={onNewChat}
            className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
          >
            <Plus size={16} />
            新对话
          </button>
        </div>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            加载中...
          </div>
        ) : sessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-sm">还没有对话记录</p>
            <p className="text-xs text-gray-400 mt-1">开始新对话来创建记录</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={currentSession?.id === session.id}
                isEditing={editingSessionId === session.id}
                editTitle={editTitle}
                onSelect={() => onSessionSelect(session)}
                onEdit={() => startEditing(session)}
                onDelete={() => handleDeleteSession(session.id)}
                onSaveTitle={() => saveTitle(session.id)}
                onCancelEdit={cancelEditing}
                onTitleChange={setEditTitle}
                formatTime={formatTime}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// 会话项组件
interface SessionItemProps {
  session: ChatSession
  isActive: boolean
  isEditing: boolean
  editTitle: string
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  onSaveTitle: () => void
  onCancelEdit: () => void
  onTitleChange: (title: string) => void
  formatTime: (date: Date) => string
}

function SessionItem({
  session,
  isActive,
  isEditing,
  editTitle,
  onSelect,
  onEdit,
  onDelete,
  onSaveTitle,
  onCancelEdit,
  onTitleChange,
  formatTime
}: SessionItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSaveTitle()
    } else if (e.key === 'Escape') {
      onCancelEdit()
    }
  }

  return (
    <div
      className={cn(
        "group relative p-3 rounded-lg cursor-pointer transition-all",
        isActive 
          ? "bg-blue-50 border border-blue-200" 
          : "bg-white hover:bg-gray-50 border border-transparent"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={!isEditing ? onSelect : undefined}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => onTitleChange(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={onSaveTitle}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Check size={14} />
              </button>
              <button
                onClick={onCancelEdit}
                className="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <h3 className={cn(
                "font-medium text-sm truncate",
                isActive ? "text-blue-900" : "text-gray-900"
              )}>
                {session.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn(
                  "text-xs",
                  isActive ? "text-blue-600" : "text-gray-500"
                )}>
                  {formatTime(new Date(session.updated_at))}
                </span>
                {session.messages.length > 0 && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className={cn(
                      "text-xs",
                      isActive ? "text-blue-600" : "text-gray-500"
                    )}>
                      {session.messages.length} 条消息
                    </span>
                  </>
                )}
              </div>
              {session.messages.length > 0 && (
                <p className={cn(
                  "text-xs mt-1 truncate",
                  isActive ? "text-blue-700" : "text-gray-600"
                )}>
                  {session.messages[session.messages.length - 1]?.content}
                </p>
              )}
            </>
          )}
        </div>

        {/* 操作按钮 */}
        {!isEditing && (isHovered || isActive) && (
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title="重命名"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
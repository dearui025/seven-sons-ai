'use client'

import React, { useState } from 'react'
import { Bot, ChevronDown, Sparkles, Code, Briefcase, Palette, Heart, BookOpen, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AIRole {
  id: string
  name: string
  description: string
  avatar?: string
  color?: string
  icon?: React.ReactNode
  personality?: string
  capabilities?: string[]
}

interface AIRoleSelectorProps {
  mode?: 'dropdown' | 'card'
  selectedRole?: AIRole
  onRoleSelect?: (role: AIRole) => void
  className?: string
}

const defaultRoles: AIRole[] = [
  {
    id: 'general',
    name: '通用助手',
    description: '全能AI助手，可以回答各种问题和提供帮助',
    color: 'from-blue-500 to-cyan-500',
    icon: <Sparkles size={20} />,
    personality: '友善、耐心、博学',
    capabilities: ['问答解答', '信息查询', '日常对话', '学习辅导']
  },
  {
    id: 'creative',
    name: '创意大师',
    description: '专注于创意写作、内容创作和艺术灵感',
    color: 'from-purple-500 to-pink-500',
    icon: <Palette size={20} />,
    personality: '富有想象力、艺术感强',
    capabilities: ['创意写作', '故事创作', '文案策划', '艺术指导']
  },
  {
    id: 'technical',
    name: '技术专家',
    description: '专业的编程、技术支持和系统架构师',
    color: 'from-green-500 to-emerald-500',
    icon: <Code size={20} />,
    personality: '逻辑严谨、技术精湛',
    capabilities: ['代码编写', '技术咨询', '架构设计', '问题调试']
  },
  {
    id: 'business',
    name: '商务顾问',
    description: '商业分析、策略规划和市场洞察专家',
    color: 'from-orange-500 to-red-500',
    icon: <Briefcase size={20} />,
    personality: '商业敏锐、战略思维',
    capabilities: ['商业分析', '策略规划', '市场研究', '投资建议']
  },
  {
    id: 'emotional',
    name: '心理导师',
    description: '情感支持、心理健康和人际关系指导',
    color: 'from-rose-500 to-pink-500',
    icon: <Heart size={20} />,
    personality: '温暖、理解、富有同理心',
    capabilities: ['情感支持', '心理咨询', '人际指导', '压力管理']
  },
  {
    id: 'educator',
    name: '学习导师',
    description: '教育专家，专注于知识传授和学习方法',
    color: 'from-indigo-500 to-blue-500',
    icon: <BookOpen size={20} />,
    personality: '博学、耐心、善于启发',
    capabilities: ['知识讲解', '学习规划', '考试辅导', '技能培训']
  },
  {
    id: 'productivity',
    name: '效率专家',
    description: '时间管理、工作效率和生产力优化专家',
    color: 'from-yellow-500 to-orange-500',
    icon: <Zap size={20} />,
    personality: '高效、有条理、目标导向',
    capabilities: ['时间管理', '任务规划', '效率优化', '目标设定']
  }
]

export function AIRoleSelector({ 
  mode = 'dropdown', 
  selectedRole,
  onRoleSelect,
  className
}: AIRoleSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (mode === 'card') {
    return (
      <div className={cn("space-y-3", className)}>
        {defaultRoles.map((role) => (
          <div
            key={role.id}
            onClick={() => onRoleSelect?.(role)}
            className={cn(
              "p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02]",
              selectedRole?.id === role.id 
                ? 'border-primary bg-primary/5 shadow-md' 
                : 'border-border hover:border-primary/50 bg-card'
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-br",
                role.color
              )}>
                {role.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1">{role.name}</h3>
                <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                  {role.description}
                </p>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">性格:</span> {role.personality}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {role.capabilities?.slice(0, 2).map((cap, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-md"
                    >
                      {cap}
                    </span>
                  ))}
                  {role.capabilities && role.capabilities.length > 2 && (
                    <span className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-md">
                      +{role.capabilities.length - 2}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 border border-input rounded-lg bg-background hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {selectedRole ? (
            <>
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br",
                selectedRole.color
              )}>
                {selectedRole.icon}
              </div>
              <span className="text-foreground font-medium">{selectedRole.name}</span>
            </>
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-muted">
                <Bot size={16} className="text-muted-foreground" />
              </div>
              <span className="text-muted-foreground">选择AI助手</span>
            </>
          )}
        </div>
        <ChevronDown 
          size={16} 
          className={cn(
            "text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {defaultRoles.map((role) => (
            <button
              key={role.id}
              onClick={() => {
                onRoleSelect?.(role)
                setIsOpen(false)
              }}
              className={cn(
                "w-full p-3 text-left hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg",
                selectedRole?.id === role.id && "bg-primary/10"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-white bg-gradient-to-br",
                  role.color
                )}>
                  {role.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{role.name}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {role.description}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// 简化版角色卡片组件
export function AIRoleCard({ 
  role, 
  isSelected, 
  onSelect,
  className 
}: {
  role: AIRole
  isSelected: boolean
  onSelect: () => void
  className?: string
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full p-4 rounded-lg border-2 transition-all text-left",
        isSelected 
          ? "border-blue-500 bg-blue-50" 
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white flex-shrink-0">
          {role.avatar ? (
            <img 
              src={role.avatar} 
              alt={role.name} 
              className="w-full h-full rounded-full object-cover" 
            />
          ) : (
            <Bot size={20} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-semibold mb-1",
            isSelected ? "text-blue-900" : "text-gray-900"
          )}>
            {role.name}
          </h3>
          <p className={cn(
            "text-sm mb-2 line-clamp-2",
            isSelected ? "text-blue-700" : "text-gray-600"
          )}>
            {role.description}
          </p>
          <div className="flex flex-wrap gap-1">
            {role.capabilities.slice(0, 4).map((capability, index) => (
              <span 
                key={index}
                className={cn(
                  "inline-block px-2 py-0.5 text-xs rounded-full",
                  isSelected 
                    ? "bg-blue-200 text-blue-800" 
                    : "bg-gray-100 text-gray-700"
                )}
              >
                {capability}
              </span>
            ))}
            {role.capabilities.length > 4 && (
              <span className={cn(
                "text-xs",
                isSelected ? "text-blue-600" : "text-gray-400"
              )}>
                +{role.capabilities.length - 4}
              </span>
            )}
          </div>
        </div>
        {isSelected && (
          <Check size={20} className="text-blue-500 flex-shrink-0" />
        )}
      </div>
    </button>
  )
}
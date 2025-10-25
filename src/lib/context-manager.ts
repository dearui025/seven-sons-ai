import { AIRole } from '@/types/ai-roles'

export interface ConversationContext {
  messages: Array<{
    id: string
    sender: string
    content: string
    timestamp: Date
    isUser: boolean
    roleId?: string
  }>
  activeRoles: Set<string>
  lastUserMessage?: string
  conversationSummary?: string
}

export class ContextManager {
  private context: ConversationContext
  private maxHistoryLength: number = 20 // 保留最近20条消息

  constructor() {
    this.context = {
      messages: [],
      activeRoles: new Set()
    }
  }

  // 添加消息到上下文
  addMessage(message: {
    id: string
    sender: string
    content: string
    timestamp: Date
    isUser: boolean
    roleId?: string
  }) {
    this.context.messages.push(message)
    
    // 如果是AI角色消息，记录活跃角色
    if (!message.isUser && message.roleId) {
      this.context.activeRoles.add(message.roleId)
    }
    
    // 如果是用户消息，记录最后的用户输入
    if (message.isUser) {
      this.context.lastUserMessage = message.content
    }

    // 保持历史长度限制
    if (this.context.messages.length > this.maxHistoryLength) {
      this.context.messages = this.context.messages.slice(-this.maxHistoryLength)
    }

    // 更新对话摘要
    this.updateConversationSummary()
  }

  // 获取特定角色的对话历史
  getConversationHistoryForRole(roleId: string): Array<{role: string, content: string}> {
    const relevantMessages = this.context.messages
      .filter(msg => 
        msg.isUser || // 包含所有用户消息
        msg.roleId === roleId || // 包含该角色的消息
        this.isMessageRelevantToRole(msg, roleId) // 包含与该角色相关的其他角色消息
      )
      .slice(-10) // 最近10条相关消息

    return relevantMessages.map(msg => ({
      role: msg.isUser ? 'user' : 'assistant',
      content: msg.content
    }))
  }

  // 判断消息是否与特定角色相关
  private isMessageRelevantToRole(message: any, roleId: string): boolean {
    // 如果消息中提到了该角色，则认为相关
    const content = message.content.toLowerCase()
    const roleNames = this.getRoleNameById(roleId)?.toLowerCase()
    
    if (roleNames && content.includes(roleNames)) {
      return true
    }

    // 如果是最近的几条消息，也认为相关（保持对话连贯性）
    const recentMessages = this.context.messages.slice(-5)
    return recentMessages.includes(message)
  }

  // 根据角色ID获取角色名称
  private getRoleNameById(roleId: string): string | null {
    // 这里需要根据实际的角色数据来实现
    const roleMap: { [key: string]: string } = {
      'libai': '李白',
      'sunwukong': '孙悟空',
      'zhugeliang': '诸葛亮',
      'lindaiyu': '林黛玉',
      'mozi': '墨子',
      'zhuangzi': '庄子',
      'luban': '鲁班',
      'myself': '我自己'
    }
    return roleMap[roleId] || null
  }

  // 获取对话摘要
  getConversationSummary(): string {
    return this.context.conversationSummary || '对话刚刚开始'
  }

  // 更新对话摘要
  private updateConversationSummary() {
    if (this.context.messages.length < 3) return

    const recentMessages = this.context.messages.slice(-5)
    const topics = this.extractTopics(recentMessages)
    
    this.context.conversationSummary = `当前讨论的主要话题：${topics.join('、')}`
  }

  // 提取对话主题
  private extractTopics(messages: any[]): string[] {
    const topics = new Set<string>()
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase()
      
      // 简单的关键词提取
      if (content.includes('诗') || content.includes('文学')) topics.add('文学创作')
      if (content.includes('技术') || content.includes('发明')) topics.add('技术创新')
      if (content.includes('哲学') || content.includes('人生')) topics.add('哲学思考')
      if (content.includes('策略') || content.includes('计划')) topics.add('策略规划')
      if (content.includes('感情') || content.includes('情感')) topics.add('情感交流')
      if (content.includes('学习') || content.includes('知识')) topics.add('学习成长')
    })

    return Array.from(topics).slice(0, 3) // 最多返回3个主题
  }

  // 获取活跃角色列表
  getActiveRoles(): string[] {
    return Array.from(this.context.activeRoles)
  }

  // 清空上下文
  clearContext() {
    this.context = {
      messages: [],
      activeRoles: new Set()
    }
  }

  // 获取最后的用户消息
  getLastUserMessage(): string | undefined {
    return this.context.lastUserMessage
  }

  // 判断是否需要某个角色参与对话
  shouldRoleRespond(role: AIRole, userMessage: string): boolean {
    const message = userMessage.toLowerCase()
    console.log(`🎭 检查角色 ${role.name} 是否应该响应消息: "${userMessage}"`)
    
    // 检查是否直接提到该角色
    const mentionedDirectly = message.includes(role.name.toLowerCase()) || 
        message.includes(`@${role.name.toLowerCase()}`)
    
    if (mentionedDirectly) {
      console.log(`✅ ${role.name}: 直接提到角色名称`)
      return true
    }

    // 检查是否与角色专长相关
    const isRelevant = role.specialties.some(specialty => 
      message.includes(specialty.toLowerCase())
    )

    if (isRelevant) {
      console.log(`✅ ${role.name}: 匹配专长 - ${role.specialties}`)
      return true
    }

    // 基于角色特点的智能匹配
    const roleKeywords: { [key: string]: string[] } = {
      '李白': ['诗', '文学', '创作', '酒', '旅行', '浪漫'],
      '孙悟空': ['问题', '困难', '帮助', '解决', '机智', '勇敢'],
      '诸葛亮': ['策略', '计划', '分析', '智慧', '团队', '管理'],
      '林黛玉': ['感情', '情感', '美', '文雅', '细腻', '敏感'],
      '墨子': ['公平', '正义', '道德', '兼爱', '互助', '社会'],
      '庄子': ['哲学', '人生', '自然', '逍遥', '超脱', '智慧'],
      '鲁班': ['技术', '工具', '发明', '创造', '工艺', '实用'],
      '我自己': ['现代', '科技', '效率', '实际', '当代', '创新']
    }

    const keywords = roleKeywords[role.name] || []
    const matchedKeywords = keywords.filter(keyword => message.includes(keyword))
    const hasKeywordMatch = matchedKeywords.length > 0

    if (hasKeywordMatch) {
      console.log(`✅ ${role.name}: 匹配关键词 - ${matchedKeywords.join(', ')}`)
      return true
    }

    console.log(`❌ ${role.name}: 无匹配 (专长: ${role.specialties.join(', ')}, 关键词: ${keywords.join(', ')})`)
    return false
  }
}

// 全局上下文管理器实例
export const globalContextManager = new ContextManager()
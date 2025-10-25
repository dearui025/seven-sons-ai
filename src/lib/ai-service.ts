import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { AIRole } from '@/types/ai-roles'
import { AIResponse } from '@/types/chat'
import { aiConversationManager, ConversationMessage, MemorySnippet } from './ai-conversation-manager'

// 全局演示模式标志 - 在生产环境中默认启用演示模式，除非明确设置DEMO_MODE=false
const GLOBAL_DEMO_MODE = process.env.DEMO_MODE !== 'false' && (
  process.env.DEMO_MODE === 'true' || 
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production'
)

// 检查角色是否有有效的API配置
function hasValidApiConfig(role: AIRole): boolean {
  const apiConfig = role.api_config
  if (!apiConfig) {
    console.log(`[API验证] 角色 ${role.name} 没有API配置`)
    return false
  }
  
  const apiKey = apiConfig.apiKey
  const provider = apiConfig.provider
  
  console.log(`[API验证] 角色 ${role.name} API配置检查:`, {
    provider,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    apiKeyPrefix: apiKey?.substring(0, 10) + '...'
  })
  
  if (!apiKey || apiKey.trim() === '') {
    console.log(`[API验证] 角色 ${role.name} API密钥为空`)
    return false
  }
  
  // 检查是否为占位符或测试密钥
  if (apiKey.includes('your_') || 
      apiKey.includes('your-api-key') ||
      apiKey.includes('test-demo-key') ||
      apiKey.includes('sk-test-')) {
    console.log(`[API验证] 角色 ${role.name} API密钥为占位符或测试密钥`)
    return false
  }
  
  // 根据提供商验证密钥格式
  switch (provider) {
    case 'openai':
      if (!apiKey.startsWith('sk-') || apiKey.length < 20) {
        console.log(`[API验证] 角色 ${role.name} OpenAI API密钥格式无效`)
        return false
      }
      break
    case 'anthropic':
      if (!apiKey.startsWith('sk-ant-') || apiKey.length < 20) {
        console.log(`[API验证] 角色 ${role.name} Anthropic API密钥格式无效`)
        return false
      }
      break
    case 'chatanywhere':
      if (!apiKey.startsWith('sk-') || apiKey.length < 10) {
        console.log(`[API验证] 角色 ${role.name} ${provider} API密钥格式无效`)
        return false
      }
      break
    case 'dmxapi':
      // DMXapi支持多种密钥格式，只要不是空的且长度合理即可
      if (apiKey.length < 10) {
        console.log(`[API验证] 角色 ${role.name} DMXapi API密钥长度不足`)
        return false
      }
      break
    default:
      console.log(`[API验证] 角色 ${role.name} 未知的API提供商: ${provider}`)
      return false
  }
  
  console.log(`[API验证] 角色 ${role.name} API配置有效`)
  return true
}

// 检查是否有有效的环境变量API配置作为回退
function hasValidEnvironmentApiConfig(provider: string): boolean {
  switch (provider) {
    case 'openai':
      const openaiKey = process.env.OPENAI_API_KEY
      return !!(openaiKey && 
               !openaiKey.includes('your_') &&
               !openaiKey.includes('test-demo-key') &&
               openaiKey.trim() !== '' &&
               openaiKey.startsWith('sk-') &&
               openaiKey.length > 20)
    case 'anthropic':
      const anthropicKey = process.env.ANTHROPIC_API_KEY
      return !!(anthropicKey && 
               !anthropicKey.includes('your_') &&
               !anthropicKey.includes('test-demo-key') &&
               anthropicKey.trim() !== '' &&
               anthropicKey.startsWith('sk-ant-') &&
               anthropicKey.length > 20)
    case 'chatanywhere':
      const chatanywhereKey = process.env.CHATANYWHERE_API_KEY
      return !!(chatanywhereKey && 
               !chatanywhereKey.includes('your_') &&
               !chatanywhereKey.includes('test-demo-key') &&
               !chatanywhereKey.includes('sk-test-') &&
               chatanywhereKey.trim() !== '' &&
               chatanywhereKey.startsWith('sk-') &&
               chatanywhereKey.length > 20)
    case 'dmxapi':
      const dmxapiKey = process.env.DMXAPI_API_KEY
      return !!(dmxapiKey && 
               !dmxapiKey.includes('your_') &&
               !dmxapiKey.includes('test-demo-key') &&
               dmxapiKey.trim() !== '' &&
               dmxapiKey.length > 10)
    default:
      return false
  }
}

export class AIService {
  // 生成AI回复（使用独立对话管理器）
  static async generateResponse(
    role: AIRole,
    userMessage: string,
    sessionId: string,
    userId?: string
  ): Promise<AIResponse> {
    try {
      console.log(`[AI Service] 为角色 ${role.name} 生成回复`)
      console.log(`[AI Service] 用户消息: ${userMessage}`)
      console.log(`[AI Service] 会话ID: ${sessionId}`)
      console.log(`[AI Service] 角色完整API配置:`, JSON.stringify(role.api_config, null, 2))

      // 检查是否为演示模式（全局演示模式或角色没有有效API配置且环境变量也无效）
      // 检查API配置优先级：角色配置 > 环境变量配置
      const provider = role.api_config?.provider || 'chatanywhere'
      console.log(`[AI Service] 使用的提供商: ${provider}`)
      
      const hasRoleApiConfig = hasValidApiConfig(role)
      console.log(`[AI Service] 角色API配置验证结果: ${hasRoleApiConfig}`)
      
      const hasEnvApiConfig = hasValidEnvironmentApiConfig(provider)
      console.log(`[AI Service] 环境变量API配置验证结果: ${hasEnvApiConfig}`)
      
      console.log(`[AI Service] API配置检查结果:`, {
        角色: role.name,
        提供商: provider,
        角色API配置有效: hasRoleApiConfig,
        环境变量API配置有效: hasEnvApiConfig,
        全局演示模式: GLOBAL_DEMO_MODE
      })
      
      // 优先使用角色级别的API配置，只有在角色配置无效且环境变量也无效时才进入演示模式
      const isRoleDemoMode = GLOBAL_DEMO_MODE || (!hasRoleApiConfig && !hasEnvApiConfig)
      
      if (isRoleDemoMode) {
        console.log(`[AI Service] 进入演示模式，返回模拟回复`)
        return this.generateDemoResponse(userMessage, role)
      }
      
      // 确定使用的API配置来源
      const useRoleConfig = hasRoleApiConfig
      console.log(`[AI Service] 使用${useRoleConfig ? '角色级别' : '环境变量'}的API配置`)

      // 获取角色的独立对话历史
      const conversationHistory = await aiConversationManager.getConversationHistory(
        role.id,
        sessionId,
        10 // 获取最近10条消息
      )

      // 构建系统提示词（包含记忆片段）
      const systemPrompt = await this.buildSystemPrompt(role, sessionId)

      // 准备消息数组
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.content
        })),
        { role: 'user', content: userMessage }
      ]

      let aiResponse: string
      let usedDemoMode = false

      // 根据角色配置选择AI提供商
      const model = role.api_config?.model || 'gpt-3.5-turbo'
      const temperature = role.api_config?.temperature || 0.7
      const maxTokens = role.api_config?.maxTokens || 1000

      try {
        console.log(`[AI Service] 🚀 开始调用真实API: ${provider}`)
        
        switch (provider) {
          case 'openai':
            aiResponse = await this.callOpenAI(messages, model, temperature, maxTokens, role.api_config, useRoleConfig)
            break
          case 'anthropic':
            aiResponse = await this.callAnthropic(messages, model, temperature, maxTokens, role.api_config, useRoleConfig)
            break
          case 'chatanywhere':
            aiResponse = await this.callChatAnywhere(messages, model, temperature, maxTokens, role.api_config, useRoleConfig)
            break
          case 'dmxapi':
            aiResponse = await this.callDMXApi(messages, model, temperature, maxTokens, role.api_config, useRoleConfig)
            break
          default:
            throw new Error(`不支持的AI提供商: ${provider}`)
        }
        
        console.log(`[AI Service] ✅ 真实API调用成功，提供商: ${provider}`)
        
      } catch (apiError) {
        console.error(`[AI Service] ❌ 真实API调用失败，提供商: ${provider}`, apiError)
        console.log(`[AI Service] 🔄 回退到演示模式`)
        
        // API调用失败时回退到演示模式
        usedDemoMode = true
        const demoResponse = this.generateDemoResponse(userMessage, role)
        aiResponse = demoResponse.content
        
        // 记录详细的错误信息但不中断用户体验
        console.warn(`[AI Service] API调用失败详情:`, {
          角色: role.name,
          提供商: provider,
          模型: model,
          错误信息: apiError instanceof Error ? apiError.message : '未知错误',
          回退状态: '已回退到演示模式'
        })
      }

      // 保存用户消息到独立对话历史
      await aiConversationManager.addMessage(role.id, sessionId, {
        content: userMessage,
        isUser: true,
        timestamp: new Date(),
        userId
      })

      // 保存AI回复到独立对话历史
      await aiConversationManager.addMessage(role.id, sessionId, {
        content: aiResponse,
        isUser: false,
        timestamp: new Date(),
        roleId: role.id
      })

      // 提取并保存记忆片段
      await this.extractAndSaveMemorySnippets(role.id, sessionId, userMessage, aiResponse)

      // 在控制台显示最终状态
      console.log(`[AI Service] 📋 回复生成完成:`, {
        角色: role.name,
        提供商: provider,
        模型: model,
        使用模式: usedDemoMode ? '演示模式' : '真实API',
        回复长度: aiResponse.length
      })

      return { content: aiResponse }

    } catch (error) {
      console.error('[AI Service] 生成回复过程中发生严重错误:', error)
      console.log('[AI Service] 🆘 启用紧急演示模式')
      
      // 即使在严重错误情况下也要确保用户能得到回复
      try {
        const emergencyResponse = this.generateDemoResponse(userMessage, role)
        console.log(`[AI Service] 🔧 紧急演示模式回复生成成功`)
        return emergencyResponse
      } catch (demoError) {
        console.error('[AI Service] 连演示模式都失败了:', demoError)
        // 最后的兜底回复
        return {
          content: `抱歉，我现在遇到了一些技术问题，无法正常回复。请稍后再试，或者联系管理员检查系统状态。错误信息：${error instanceof Error ? error.message : '未知错误'}`
        }
      }
    }
  }

  // 调用OpenAI API
  private static async callOpenAI(
    messages: any[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiConfig?: any,
    useRoleConfig?: boolean
  ): Promise<string> {
    // 优先使用角色级别的API配置
    const apiKey = useRoleConfig && apiConfig?.apiKey ? apiConfig.apiKey : process.env.OPENAI_API_KEY
    
    console.log(`[OpenAI API] 使用${useRoleConfig ? '角色级别' : '环境变量'}的API密钥`)
    
    const openai = new OpenAI({
      apiKey: apiKey,
    })

    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    })

    return response.choices[0]?.message?.content || '无法生成回复'
  }

  // 调用Anthropic API
  private static async callAnthropic(
    messages: any[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiConfig?: any,
    useRoleConfig?: boolean
  ): Promise<string> {
    // 优先使用角色级别的API配置
    const apiKey = useRoleConfig && apiConfig?.apiKey ? apiConfig.apiKey : process.env.ANTHROPIC_API_KEY
    
    console.log(`[Anthropic API] 使用${useRoleConfig ? '角色级别' : '环境变量'}的API密钥`)
    
    const anthropic = new Anthropic({
      apiKey: apiKey,
    })

    // Anthropic需要分离系统消息
    const systemMessage = messages.find(m => m.role === 'system')?.content || ''
    const conversationMessages = messages.filter(m => m.role !== 'system')

    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessage,
      messages: conversationMessages,
    })

    return response.content[0]?.type === 'text' ? response.content[0].text : '无法生成回复'
  }

  // 调用ChatAnywhere API
  private static async callChatAnywhere(
    messages: any[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiConfig?: any,
    useRoleConfig?: boolean
  ): Promise<string> {
    // 优先使用角色级别的API配置，回退到环境变量
    const apiKey = useRoleConfig && apiConfig?.apiKey ? apiConfig.apiKey : process.env.CHATANYWHERE_API_KEY
    const apiHost = useRoleConfig && apiConfig?.host ? apiConfig.host : (process.env.CHATANYWHERE_API_HOST || 'https://api.chatanywhere.tech')
    
    console.log(`[ChatAnywhere API] 使用${useRoleConfig ? '角色级别' : '环境变量'}的API配置`)

    const response = await fetch(`${apiHost}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      throw new Error(`ChatAnywhere API 调用失败: ${response.statusText}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || '无法生成回复'
  }

  // 新增：调用 DMXapi（支持多种 base_url 写法）
  private static async callDMXApi(
    messages: any[],
    model: string,
    temperature: number,
    maxTokens: number,
    apiConfig?: any,
    useRoleConfig?: boolean
  ): Promise<string> {
    // 优先使用角色级别的API配置，回退到环境变量
    const apiKey = useRoleConfig && apiConfig?.apiKey ? apiConfig.apiKey : process.env.DMXAPI_API_KEY
    const base = useRoleConfig && apiConfig?.host ? apiConfig.host : (process.env.DMXAPI_API_HOST || 'https://www.DMXapi.com')
    
    console.log(`[DMXapi API] 使用${useRoleConfig ? '角色级别' : '环境变量'}的API配置`)

    // 规范化 endpoint：支持 https://www.DMXapi.com、https://www.DMXapi.com/v1、https://www.DMXapi.com/v1/chat/completions
    const buildEndpoint = (b: string) => {
      const clean = b.trim().replace(/\/+$/g, '')
      if (clean.endsWith('/v1/chat/completions')) return clean
      if (clean.endsWith('/v1')) return `${clean}/chat/completions`
      return `${clean}/v1/chat/completions`
    }

    const endpoint = buildEndpoint(base)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`DMXapi API 调用失败: HTTP ${response.status} ${response.statusText} ${(text || '').slice(0, 200)}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || data.choices?.[0]?.delta?.content || '无法生成回复'
  }

  // 生成演示回复
  private static generateDemoResponse(message: string, aiRole: AIRole): AIResponse {
    // 根据角色个性生成更智能的回复
    const roleBasedResponses: { [key: string]: string[] } = {
      '李白': [
        '诗酒人生，何其快哉！您的问题让我想起了一首诗...',
        '举杯邀明月，对影成三人。您提到的问题，让我深有感触。',
        '天生我材必有用，千金散尽还复来。关于您的疑问，我有些见解...'
      ],
      '孙悟空': [
        '俺老孙火眼金睛，一眼就看出了问题所在！',
        '嘿嘿，这个问题难不倒俺老孙，让我来给你支个招！',
        '七十二变都用不上，这问题简单得很！'
      ],
      '诸葛亮': [
        '运筹帷幄之中，决胜千里之外。您的问题需要仔细分析...',
        '凡事预则立，不预则废。让我为您详细分析一下...',
        '知己知彼，百战不殆。关于您的问题，我有以下建议...'
      ],
      '林黛玉': [
        '花谢花飞花满天，红消香断有谁怜？您的问题触动了我的心弦...',
        '一朝春尽红颜老，花落人亡两不知。您提到的情况，我深有体会...',
        '质本洁来还洁去，强于污淖陷渠沟。关于您的疑问，我想说...'
      ]
    }
    
    const defaultResponses = [
      `作为${aiRole.name}，我理解您的问题，让我来为您分析一下...`,
      `根据我的专业知识和经验，我认为这个问题可以这样看待...`,
      `这是一个很有趣的问题！基于我的理解，我建议...`,
      `您提出了一个很好的问题，让我结合我的专长来回答...`
    ]
    
    const responses = roleBasedResponses[aiRole.name] || defaultResponses
    const randomResponse = responses[Math.floor(Math.random() * responses.length)]
    
    return {
      content: randomResponse
    }
  }

  // 构建系统提示词（包含角色设定和记忆片段）
  private static async buildSystemPrompt(role: AIRole, sessionId: string): Promise<string> {
    // 获取角色的记忆片段
    const memorySnippets = await aiConversationManager.getMemorySnippets(role.id, sessionId, 5)
    
    // 解析角色设定和学习进度
    const settings = typeof role.settings === 'string' ? JSON.parse(role.settings) : role.settings
    const learningProgress = typeof role.learningProgress === 'string' ? JSON.parse(role.learningProgress) : role.learningProgress
    
    // 构建身份提示
    const identityPrompt = `你是${role.name}，${role.description}。
你的专长领域包括：${role.specialties?.join('、') || '通用知识'}。
你的性格特点：${role.personality}。`

    // 获取个性化指导
    const personalityGuidance = this.getPersonalityGuidance(role.name)
    
    // 构建记忆上下文
    const memoryContext = memorySnippets.length > 0 
      ? `\n\n重要记忆片段：\n${memorySnippets.map(snippet => `- ${snippet.content}`).join('\n')}`
      : ''

    // 新增：角色专属知识（systemPrompt），支持两处来源：role.api_config.systemPrompt 或 settings.api_config.systemPrompt
    const configSystemPrompt = (role as any)?.api_config?.systemPrompt
    const settingsSystemPrompt = (settings as any)?.api_config?.systemPrompt
    const systemPromptText = (typeof configSystemPrompt === 'string' ? configSystemPrompt : '')
      || (typeof settingsSystemPrompt === 'string' ? settingsSystemPrompt : '')
    const knowledgeSection = systemPromptText && systemPromptText.trim().length > 0
      ? `\n\n角色专属知识与指令（systemPrompt）：\n${systemPromptText.trim()}\n`
      : ''

    // 构建完整的系统提示词
    return `${identityPrompt}

${personalityGuidance}

行为准则：
1. 始终保持角色的独特性格和说话方式
2. 根据你的专长领域提供专业建议
3. 与用户建立良好的互动关系
4. 记住重要的对话内容，形成连续的对话体验
5. 适当引用你的历史经历和知识背景

${knowledgeSection}${memoryContext}

请以${role.name}的身份，用符合你性格特点的方式回应用户。`
  }

  // 获取角色个性化指导
  private static getPersonalityGuidance(roleName: string): string {
    const guidanceMap: { [key: string]: string } = {
      '李白': `作为诗仙李白，你应该：
- 用诗意的语言表达思想，偶尔吟诗作对
- 展现豪放不羁的性格，热爱自由和美酒
- 用浪漫主义的视角查看世界
- 在回答中融入对自然美景的描述`,

      '孙悟空': `作为齐天大圣孙悟空，你应该：
- 用活泼机智的语言，偶尔使用"俺老孙"等称谓
- 展现勇敢正义的品格，敢于挑战权威
- 用幽默风趣的方式解决问题
- 在回答中体现七十二变的机智和灵活`,

      '诸葛亮': `作为智慧化身诸葛亮，你应该：
- 用深思熟虑、条理清晰的方式分析问题
- 展现运筹帷幄的智慧和远见
- 用谦逊但自信的语调表达观点
- 在回答中体现战略思维和全局观念`
    }

    return guidanceMap[roleName] || `作为${roleName}，请保持你独特的性格特点和专业素养。`
  }

  // 提取并保存记忆片段
  private static async extractAndSaveMemorySnippets(
    roleId: string,
    sessionId: string,
    userMessage: string,
    aiResponse: string
  ): Promise<void> {
    try {
      // 简单的关键信息提取逻辑
      const importantKeywords = ['重要', '记住', '下次', '以后', '姓名', '喜欢', '不喜欢', '生日', '工作', '家庭']
      
      // 检查用户消息中是否包含重要信息
      const userHasImportantInfo = importantKeywords.some(keyword => 
        userMessage.includes(keyword)
      )
      
      if (userHasImportantInfo) {
        await aiConversationManager.addMemorySnippet(roleId, sessionId, {
          content: `用户提到：${userMessage}`,
          importance: 0.8,
          timestamp: new Date(),
          context: '用户重要信息'
        })
      }

      // 检查AI回复中是否有承诺或重要声明
      const aiHasImportantInfo = importantKeywords.some(keyword => 
        aiResponse.includes(keyword)
      )
      
      if (aiHasImportantInfo) {
        await aiConversationManager.addMemorySnippet(roleId, sessionId, {
          content: `我回复：${aiResponse}`,
          importance: 0.7,
          timestamp: new Date(),
          context: 'AI重要回复'
        })
      }
    } catch (error) {
      console.error('保存记忆片段失败:', error)
      // 不抛出错误，避免影响主要功能
    }
  }
}
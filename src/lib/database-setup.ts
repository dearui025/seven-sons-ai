/**
 * 数据库初始化工具
 * 用于在应用启动时检查和初始化数据库
 */

import { supabase } from './supabase';
import { DEFAULT_AI_ROLES, type AIRole } from '@/types/ai-roles';

// 演示模式标志 - 检查环境变量或配置缺失
const DEMO_MODE = process.env.DEMO_MODE === 'true' || 
  !process.env.NEXT_PUBLIC_SUPABASE_URL || 
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your_supabase_url_here') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('your_supabase_anon_key_here')

// 调试日志
console.log('=== 数据库模式检查 ===')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '已配置' : '未配置')
console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已配置' : '未配置')
console.log('DEMO_MODE:', DEMO_MODE)
console.log('========================')

// 检查数据库连接和表是否存在
export async function checkDatabase(): Promise<boolean> {
  if (DEMO_MODE) {
    console.log('运行在演示模式，跳过数据库连接检查')
    return true
  }
  
  try {
    const { data, error } = await supabase
      .from('ai_roles')
      .select('count')
      .limit(1)
    
    return !error
  } catch (error) {
    console.error('数据库连接检查失败:', error)
    return false
  }
}

export async function checkDatabaseSetup() {
  try {
    // 检查ai_roles表是否存在且有数据
    const { data: roles, error } = await supabase
      .from('ai_roles')
      .select('id, name')
      .limit(1);

    if (error) {
      console.error('数据库检查失败:', error);
      return false;
    }

    return roles && roles.length > 0;
  } catch (error) {
    console.error('数据库连接失败:', error);
    return false;
  }
}

export async function initializeDefaultRoles() {
  if (DEMO_MODE) {
    console.log('演示模式：使用默认AI角色数据')
    return true
  }
  
  try {
    console.log('开始初始化默认AI角色...');

    // 检查是否已有角色数据
    const { data: existingRoles } = await supabase
      .from('ai_roles')
      .select('name');

    if (existingRoles && existingRoles.length > 0) {
      console.log('AI角色已存在，跳过初始化');
      return true;
    }

    // 插入默认角色
    const rolesToInsert = DEFAULT_AI_ROLES.map(role => ({
      name: role.name,
      description: role.description,
      avatar_url: role.avatar_url,
      personality: role.personality,
      specialties: role.specialties,
      learning_progress: role.learning_progress,
      settings: role.settings
    }));

    const { error } = await supabase
      .from('ai_roles')
      .insert(rolesToInsert);

    if (error) {
      console.error('插入默认角色失败:', error);
      return false;
    }

    console.log('默认AI角色初始化成功');
    return true;
  } catch (error) {
    console.error('初始化默认角色失败:', error);
    return false;
  }
}

export async function setupDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('开始数据库设置...')
    
    if (DEMO_MODE) {
      console.log('演示模式：跳过数据库设置')
      return { success: true, message: '演示模式：使用本地数据' }
    }
    
    // 检查数据库连接
    const isConnected = await checkDatabase()
    if (!isConnected) {
      return { success: false, message: '数据库连接失败' }
    }
    
    // 初始化默认AI角色
    const rolesInitialized = await initializeDefaultRoles()
    if (!rolesInitialized) {
      return { success: false, message: 'AI角色初始化失败' }
    }
    
    console.log('数据库设置完成')
    return { success: true, message: '数据库设置成功' }
  } catch (error) {
    console.error('数据库设置失败:', error)
    return { success: false, message: '数据库设置过程中发生错误' }
  }
}

// 获取所有AI角色（带重试机制和网络错误处理）
export async function getAllAIRoles(retryCount = 3): Promise<AIRole[]> {
  if (DEMO_MODE) {
    console.log('演示模式：返回默认AI角色数据')
    return DEFAULT_AI_ROLES
  }

  console.log('🔍 开始获取AI角色数据...')
  
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      console.log(`📡 尝试连接Supabase (第${attempt}次)...`)
      
      if (!supabase) {
        console.error('❌ Supabase客户端未初始化')
        throw new Error('Supabase客户端未初始化')
      }

      // 添加超时控制，避免长时间等待
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('请求超时')), 10000) // 10秒超时
      })

      const queryPromise = supabase
        .from('ai_roles')
        .select('*')
        .order('created_at', { ascending: true })

      const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any

      if (error) {
        console.error(`❌ 获取AI角色失败 (第${attempt}次尝试):`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        })
        
        if (attempt === retryCount) {
          console.error('❌ 所有重试都失败，返回默认角色数据')
          return DEFAULT_AI_ROLES
        }
        
        // 等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
        continue
      }

      console.log(`✅ 成功获取AI角色数据 (${data?.length || 0}个角色)`)

      // 如果数据为空或无效，返回默认角色
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('⚠️ 数据库中没有AI角色数据，返回默认角色')
        return DEFAULT_AI_ROLES
      }

      // 转换数据格式
      const roles = data.map(role => {
        const defaultConfig = {
          provider: 'openai',
          apiKey: '',
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          maxTokens: 2048,
          systemPrompt: '',
          host: ''
        }
        // 支持两种存储位置：顶层 api_config 或 settings.api_config
        const apiConfig = (role as any).api_config ?? (role as any).settings?.api_config ?? defaultConfig

        return {
          id: role.id,
          name: role.name,
          description: role.description,
          avatar_url: role.avatar_url,
          personality: (role as any).personality,
          specialties: (role as any).specialties,
          learning_progress: role.learning_progress,
          settings: role.settings,
          api_config: apiConfig,
          created_at: (role as any).created_at,
          updated_at: (role as any).updated_at
        }
      })

      console.log('🎭 角色数据转换完成:', roles.map(r => r.name).join(', '))
      return roles

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`💥 获取AI角色时发生错误 (第${attempt}次尝试):`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof TypeError ? 'Network Error' : 'Unknown Error'
      })
      
      // 检查是否是网络错误
      const isNetworkError = error instanceof TypeError && 
        (errorMessage.includes('Failed to fetch') || 
         errorMessage.includes('fetch') || 
         errorMessage.includes('ERR_NETWORK') ||
         errorMessage.includes('ERR_CONNECTION') ||
         errorMessage.includes('ERR_ABORTED'))
      
      if (isNetworkError) {
        console.error('🌐 检测到网络连接问题，可能是网络不稳定或Supabase服务不可用')
      }
      
      if (attempt === retryCount) {
        console.error('❌ 所有重试都失败，返回默认角色数据')
        console.log('🔄 使用本地默认角色确保应用正常运行')
        return DEFAULT_AI_ROLES
      }
      
      // 网络错误时等待更长时间再重试
       const waitTime = isNetworkError ? 2000 * attempt : 1000 * attempt
       console.log(`⏳ 等待 ${waitTime}ms 后重试...`)
       await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  return DEFAULT_AI_ROLES
}

// 获取特定AI角色
export async function getAIRoleById(id: string) {
  try {
    const { data: role, error } = await supabase
      .from('ai_roles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('获取AI角色失败:', error);
      return null;
    }

    return role;
  } catch (error) {
    console.error('获取AI角色失败:', error);
    return null;
  }
}

// 创建新AI角色
export async function createAIRole(roleData: Omit<AIRole, 'id' | 'created_at' | 'updated_at'>) {
  if (DEMO_MODE) {
    console.log('演示模式：模拟创建角色', roleData.name)
    return { id: Date.now().toString(), ...roleData }
  }

  try {
    // 先尝试使用顶层 api_config 字段插入
    const insertPayloadTopLevel = [{
      name: roleData.name,
      description: roleData.description,
      avatar_url: roleData.avatar_url,
      personality: roleData.personality,
      specialties: roleData.specialties,
      learning_progress: roleData.learning_progress,
      settings: roleData.settings,
      api_config: roleData.api_config || {
        provider: 'openai',
        apiKey: '',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 2048,
        systemPrompt: '',
        host: ''
      }
    }]

    let { data, error } = await supabase
      .from('ai_roles')
      .insert(insertPayloadTopLevel)
      .select()
      .single()

    // 如果顶层 api_config 列不存在，回退到 settings.api_config
    if (error) {
      const isMissingColumn = (error.message || '').toLowerCase().includes('column') && (error.message || '').toLowerCase().includes('api_config')
      console.warn('创建AI角色失败，尝试回退到 settings.api_config:', error)

      const fallbackPayload = [{
        name: roleData.name,
        description: roleData.description,
        avatar_url: roleData.avatar_url,
        personality: roleData.personality,
        specialties: roleData.specialties,
        learning_progress: roleData.learning_progress,
        settings: {
          ...(roleData.settings || {}),
          api_config: roleData.api_config || {
            provider: 'openai',
            apiKey: '',
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            maxTokens: 2048,
            systemPrompt: '',
            host: ''
          }
        }
      }]

      if (isMissingColumn) {
        const result = await supabase
          .from('ai_roles')
          .insert(fallbackPayload)
          .select()
          .single()

        data = result.data as any
        error = result.error as any
      }
    }

    if (error) {
      console.error('创建AI角色失败:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('创建AI角色失败:', error)
    throw error
  }
}

// 更新AI角色
export async function updateAIRole(roleId: string, roleData: Partial<AIRole>) {
  if (DEMO_MODE) {
    console.log('演示模式：模拟更新角色', roleId, roleData.name)
    return true
  }

  try {
    console.log('=== 开始更新AI角色 ===')
    console.log('角色ID:', roleId)
    console.log('原始角色数据:', JSON.stringify(roleData, null, 2))

    // 验证必要字段
    if (!roleId) {
      throw new Error('角色ID不能为空')
    }

    if (!roleData.name?.trim()) {
      throw new Error('角色名称不能为空')
    }

    if (!roleData.description?.trim()) {
      throw new Error('角色描述不能为空')
    }

    // 读取现有记录，判断是否存在 api_config 列
    const { data: existing, error: fetchErr } = await supabase
      .from('ai_roles')
      .select('id, settings, api_config')
      .eq('id', roleId)
      .single()

    if (fetchErr) {
      console.warn('读取现有角色失败，但继续尝试更新:', fetchErr)
    }

    // 确保api_config字段格式正确
    let processedApiConfig: any = null
    if (roleData.api_config) {
      processedApiConfig = {
        provider: roleData.api_config.provider ?? 'openai',
        apiKey: roleData.api_config.apiKey ?? '',
        model: roleData.api_config.model ?? 'gpt-3.5-turbo',
        temperature: typeof roleData.api_config.temperature === 'number' ? roleData.api_config.temperature : 0.7,
        maxTokens: typeof roleData.api_config.maxTokens === 'number' ? roleData.api_config.maxTokens : 2048,
        systemPrompt: roleData.api_config.systemPrompt ?? '',
        host: roleData.api_config.host ?? ''
      }
      console.log('处理后的API配置:', JSON.stringify(processedApiConfig, null, 2))
    }

    // 合并 settings（保留原有其他配置）
    const baseSettings = roleData.settings || {
      tone: 'friendly',
      creativity: 75,
      verbosity: 'moderate',
      language_style: '现代实用'
    }
    const mergedSettings = {
      ...(existing?.settings || {}),
      ...baseSettings
    } as any

    // 如果顶层 api_config 列不存在，则把 api_config 存到 settings 内
    const supportsTopLevelApiConfig = existing ? ('api_config' in (existing as any)) : false
    if (!supportsTopLevelApiConfig && processedApiConfig) {
      mergedSettings.api_config = processedApiConfig
    }

    const updateData: any = {
      name: roleData.name.trim(),
      description: roleData.description.trim(),
      avatar_url: roleData.avatar_url || '',
      personality: roleData.personality || '',
      specialties: Array.isArray(roleData.specialties) ? roleData.specialties : [],
      learning_progress: roleData.learning_progress || {
        level: 1,
        experience: 0,
        skills: [],
        achievements: []
      },
      settings: mergedSettings,
      updated_at: new Date().toISOString()
    }

    if (supportsTopLevelApiConfig) {
      updateData.api_config = processedApiConfig
    }

    console.log('发送到数据库的最终数据:', JSON.stringify(updateData, null, 2))

    const { data, error } = await supabase
      .from('ai_roles')
      .update(updateData)
      .eq('id', roleId)
      .select()

    if (error) {
      console.error('Supabase更新错误:', error)
      console.error('错误详情:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw new Error(`数据库更新失败: ${error.message}`)
    }

    // Supabase在没有匹配行时不会抛错，而是返回空数组，这会导致UI误判为成功
    const updatedRows = Array.isArray(data) ? data.length : (data ? 1 : 0)
    if (updatedRows === 0) {
      console.error('数据库更新失败：未找到对应角色或未发生任何更新', { roleId, updateData })
      throw new Error('未找到角色或无更新发生')
    }

    console.log('数据库更新成功，返回数据:', data)
    console.log('=== AI角色更新完成 ===')
    return true
  } catch (error) {
    console.error('=== updateAIRole函数执行失败 ===')
    console.error('错误类型:', error instanceof Error ? 'Error对象' : typeof error)
    console.error('错误信息:', error instanceof Error ? error.message : String(error))
    console.error('错误堆栈:', error instanceof Error ? error.stack : '无堆栈信息')
    console.error('角色ID:', roleId)
    console.error('角色数据:', JSON.stringify(roleData, null, 2))
    throw error
  }
}

// 删除AI角色
export async function deleteAIRole(roleId: string) {
  if (DEMO_MODE) {
    console.log('演示模式：模拟删除角色', roleId)
    return true
  }

  try {
    const { error } = await supabase
      .from('ai_roles')
      .delete()
      .eq('id', roleId)

    if (error) {
      console.error('删除AI角色失败:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('删除AI角色失败:', error)
    throw error
  }
}

// 更新AI角色学习进度
export async function updateAIRoleLearningProgress(
  roleId: string, 
  progress: any
) {
  try {
    const { error } = await supabase
      .from('ai_roles')
      .update({ 
        learning_progress: progress,
        updated_at: new Date().toISOString()
      })
      .eq('id', roleId);

    if (error) {
      console.error('更新学习进度失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('更新学习进度失败:', error);
    return false;
  }
}

// 记录学习数据
export async function recordLearning(
  aiRoleId: string,
  userId: string,
  interactionType: string,
  inputData: any,
  outputData: any,
  feedbackScore?: number,
  improvementNotes?: string
) {
  try {
    const { error } = await supabase
      .from('learning_records')
      .insert({
        ai_role_id: aiRoleId,
        user_id: userId,
        interaction_type: interactionType,
        input_data: inputData,
        output_data: outputData,
        feedback_score: feedbackScore,
        improvement_notes: improvementNotes
      });

    if (error) {
      console.error('记录学习数据失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('记录学习数据失败:', error);
    return false;
  }
}
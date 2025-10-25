import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { roleData, ownerUserId } = body || {}

    if (!roleData || typeof roleData !== 'object') {
      return NextResponse.json({ success: false, message: '缺少必要参数 roleData' }, { status: 400 })
    }
    if (!roleData.name?.trim()) {
      return NextResponse.json({ success: false, message: '角色名称不能为空' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Supabase 未正确配置' }, { status: 500 })
    }

    const id = roleData.id || randomUUID()

    // 顶层 api_config 首选
    const apiConfig = roleData.api_config || {
      provider: 'openai',
      apiKey: '',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: '',
      host: ''
    }

    // 合并设置，附带 owner_user_id（如果提供）
    const mergedSettings = {
      ...(roleData.settings || {}),
      ...(ownerUserId ? { owner_user_id: ownerUserId } : {})
    }

    const insertPayloadTopLevel = [{
      id,
      name: roleData.name,
      description: roleData.description ?? null,
      avatar_url: roleData.avatar_url ?? null,
      personality: roleData.personality ?? '',
      specialties: Array.isArray(roleData.specialties) ? roleData.specialties : [],
      learning_progress: roleData.learning_progress ?? null,
      settings: mergedSettings,
      api_config: apiConfig
    }]

    let { data, error } = await supabase
      .from('ai_roles')
      .insert(insertPayloadTopLevel)
      .select('id')
      
    // 如果顶层 api_config 列不存在，回退到 settings.api_config
    if (error) {
      const isMissingColumn = (error.message || '').toLowerCase().includes('column') && (error.message || '').toLowerCase().includes('api_config')
      console.warn('创建AI角色失败，尝试回退到 settings.api_config:', error)

      const fallbackPayload = [{
        id,
        name: roleData.name,
        description: roleData.description ?? null,
        avatar_url: roleData.avatar_url ?? null,
        personality: roleData.personality ?? '',
        specialties: Array.isArray(roleData.specialties) ? roleData.specialties : [],
        learning_progress: roleData.learning_progress ?? null,
        settings: {
          ...mergedSettings,
          api_config: apiConfig
        }
      }]

      if (isMissingColumn) {
        const result = await supabase
          .from('ai_roles')
          .insert(fallbackPayload)
          .select('id')
        data = result.data as any
        error = result.error as any
      }
    }

    if (error) {
      return NextResponse.json({ success: false, message: `数据库错误: ${error.message}` }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, message: '插入失败' }, { status: 500 })
    }

    // 未来如果需要严格的关系表所有权，可在此处根据真实 Supabase 配置插入 user_ai_relationships
    // 目前考虑到 users.id 类型与 Supabase auth 用户ID不一致，先写入 settings.owner_user_id 以兼容演示模式

    return NextResponse.json({ success: true, id: data[0].id })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || '未知错误' }, { status: 500 })
  }
}
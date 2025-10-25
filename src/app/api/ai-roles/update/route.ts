import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { roleId, roleData } = body || {}

    if (!roleId || !roleData) {
      return NextResponse.json({ success: false, message: '缺少必要参数 roleId 或 roleData' }, { status: 400 })
    }

    if (!roleData.name?.trim()) {
      return NextResponse.json({ success: false, message: '角色名称不能为空' }, { status: 400 })
    }
    if (!roleData.description?.trim()) {
      return NextResponse.json({ success: false, message: '角色描述不能为空' }, { status: 400 })
    }

    const supabase = createSupabaseServiceClient()
    if (!supabase) {
      return NextResponse.json({ success: false, message: 'Supabase 未正确配置' }, { status: 500 })
    }

    // 读取现有记录，判断是否存在顶层 api_config 列
    const { data: existing, error: fetchErr } = await supabase
      .from('ai_roles')
      .select('id, settings, api_config')
      .eq('id', roleId)
      .single()

    if (fetchErr) {
      console.warn('读取现有角色失败，但继续尝试更新:', fetchErr)
    }

    // 处理 api_config
    let processedApiConfig: any = null
    if (roleData.api_config) {
      const apiCfg = roleData.api_config
      processedApiConfig = {
        provider: apiCfg.provider ?? 'openai',
        apiKey: apiCfg.apiKey ?? '',
        model: apiCfg.model ?? 'gpt-3.5-turbo',
        temperature: typeof apiCfg.temperature === 'number' ? apiCfg.temperature : 0.7,
        maxTokens: typeof apiCfg.maxTokens === 'number' ? apiCfg.maxTokens : 2048,
        systemPrompt: apiCfg.systemPrompt ?? '',
        host: apiCfg.host ?? ''
      }
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

    if (supportsTopLevelApiConfig && processedApiConfig) {
      updateData.api_config = processedApiConfig
    }

    const { data, error } = await supabase
      .from('ai_roles')
      .update(updateData)
      .eq('id', roleId)
      .select('id')

    if (error) {
      return NextResponse.json({ success: false, message: `数据库错误: ${error.message}` }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, message: '未找到匹配的角色或没有更新发生' }, { status: 404 })
    }

    return NextResponse.json({ success: true, id: data[0].id })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || '未知错误' }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from 'next/server'

// 规范化 DMXapi endpoint（支持多种 base_url 写法）
function buildDMXEndpoint(base: string) {
  const clean = (base || '').trim().replace(/\/+$/g, '')
  if (clean.endsWith('/v1/chat/completions')) return clean
  if (clean.endsWith('/v1')) return `${clean}/chat/completions`
  return `${clean}/v1/chat/completions`
}

// 从文本中提取第一个 JSON 对象
function safeJsonExtract(text: string): any | null {
  if (!text) return null
  // 尝试直接解析
  try { return JSON.parse(text) } catch {}
  // 退路：提取第一个花括号块
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }
  return null
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, provider, apiKey, host, model, language = 'zh' } = body || {}

    if (!name || !String(name).trim()) {
      return NextResponse.json({ success: false, message: '缺少角色名称 name' }, { status: 400 })
    }

    // 默认使用 DMXapi（可通过参数覆盖）
    const useProvider = (provider || 'dmxapi').toLowerCase()

    // 构造提示词，要求输出严格 JSON
    const system = language === 'zh'
      ? '你是一个资深的角色设定助手。请根据给定名字，用中文生成角色的基础信息，并且只输出严格的JSON，不要包含任何解释性文字。'
      : 'You are an experienced character setup assistant. Based on the given name, generate basic role info and output STRICT JSON only, with no extra explanations.'

    const user = language === 'zh'
      ? `角色名称：${name}

请只输出如下JSON结构（严格字段名一致）：
{
  "description": "简明但生动的角色描述（2-3句）",
  "personality": "一句话概括性格",
  "specialties": ["列出5-8个专长"],
  "settings": {
    "tone": "friendly|formal|casual|humorous|wise|poetic 之一",
    "creativity": 75,
    "verbosity": "concise|moderate|detailed 之一",
    "language_style": "例如：现代实用、古典优雅等"
  },
  "systemPrompt": "用于API的系统提示词（中文，贴合该角色身份与说话风格）"
}`
      : `Role name: ${name}

Output STRICT JSON with fields exactly: description, personality, specialties (5-8 items), settings {tone, creativity, verbosity, language_style}, systemPrompt. Do not add any extra text outside JSON.`

    // 调用提供商
    let generatedText = ''
    if (useProvider === 'dmxapi') {
      const key = apiKey || process.env.DMXAPI_API_KEY
      const base = host || process.env.DMXAPI_API_HOST || 'https://www.DMXapi.com'
      if (!key) {
        // 无密钥：返回一个基础模板，避免阻塞
        const mock = {
          description: `${name}：一个个性鲜明、具有独特背景与技能的角色。`,
          personality: '友好、理性、富有创造力',
          specialties: ['沟通表达', '问题分析', '创意构思', '知识检索', '写作润色'],
          settings: { tone: 'friendly', creativity: 80, verbosity: 'moderate', language_style: '现代实用' },
          systemPrompt: `你是${name}。请以友好、理性的风格与用户对话，擅长分析问题并给出可执行建议。`
        }
        return NextResponse.json({ success: true, data: mock, source: 'mock' })
      }

      const endpoint = buildDMXEndpoint(base)
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      })

      if (!resp.ok) {
        const text = await resp.text()
        return NextResponse.json({ success: false, message: `DMXapi调用失败: ${resp.status} ${resp.statusText}`, details: text.slice(0, 200) }, { status: 502 })
      }
      const data = await resp.json()
      generatedText = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.delta?.content || ''
    } else {
      // 其他提供商暂未在此路由中直接支持（保持简洁）。可后续扩展。
      return NextResponse.json({ success: false, message: `暂不支持提供商: ${useProvider}` }, { status: 400 })
    }

    // 解析为对象
    const obj = safeJsonExtract(generatedText)
    if (!obj) {
      return NextResponse.json({ success: false, message: 'AI返回内容无法解析为JSON', raw: generatedText?.slice(0, 200) }, { status: 500 })
    }

    // 规范化与默认值
    const normalized = {
      description: String(obj.description || `${name}：一个有趣的角色。`),
      personality: String(obj.personality || '友好、理性'),
      specialties: Array.isArray(obj.specialties) && obj.specialties.length > 0 ? obj.specialties.map((s: any) => String(s)).slice(0, 8) : ['沟通表达', '问题分析', '写作润色'],
      settings: {
        tone: obj.settings?.tone || 'friendly',
        creativity: typeof obj.settings?.creativity === 'number' ? obj.settings.creativity : 75,
        verbosity: obj.settings?.verbosity || 'moderate',
        language_style: obj.settings?.language_style || (language === 'zh' ? '现代实用' : 'modern practical'),
      },
      systemPrompt: String(obj.systemPrompt || (language === 'zh' ? `你是${name}，请以友好、理性的风格回答用户问题。` : `You are ${name}, respond in a friendly, rational style.`))
    }

    return NextResponse.json({ success: true, data: normalized, source: 'dmxapi' })
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e?.message || '未知错误' }, { status: 500 })
  }
}
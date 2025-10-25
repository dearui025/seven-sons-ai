import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { apiKey, host, model, message } = await request.json()
    
    console.log('[DMX Test] 测试参数:', {
      apiKey: apiKey ? `${apiKey.substring(0, 10)}...` : 'undefined',
      host,
      model,
      message
    })

    // 规范化 endpoint：支持 https://www.DMXapi.com、https://www.DMXapi.com/v1、https://www.DMXapi.com/v1/chat/completions
    const buildEndpoint = (b: string) => {
      const clean = b.trim().replace(/\/+$/g, '')
      if (clean.endsWith('/v1/chat/completions')) return clean
      if (clean.endsWith('/v1')) return `${clean}/chat/completions`
      return `${clean}/v1/chat/completions`
    }

    const endpoint = buildEndpoint(host)
    console.log('[DMX Test] 使用端点:', endpoint)

    const messages = [
      { role: 'system', content: '你是一个AI助手。' },
      { role: 'user', content: message }
    ]

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 100,
      }),
    })

    console.log('[DMX Test] API响应状态:', response.status, response.statusText)

    if (!response.ok) {
      const text = await response.text()
      console.error('[DMX Test] API错误响应:', text)
      return NextResponse.json({
        success: false,
        error: `DMXapi API 调用失败: HTTP ${response.status} ${response.statusText}`,
        details: text.slice(0, 500)
      })
    }

    const data = await response.json()
    console.log('[DMX Test] API成功响应:', JSON.stringify(data, null, 2))
    
    const content = data.choices?.[0]?.message?.content || data.choices?.[0]?.delta?.content || '无法生成回复'
    
    return NextResponse.json({
      success: true,
      content,
      rawResponse: data
    })

  } catch (error) {
    console.error('[DMX Test] 测试失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
}
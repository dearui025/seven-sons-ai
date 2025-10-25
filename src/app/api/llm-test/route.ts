import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const started = Date.now()
  try {
    const body = await req.json()
    const provider: string = body?.provider
    const apiKey: string = body?.apiKey
    const host: string | undefined = body?.host
    const model: string | undefined = body?.model

    if (!provider || !apiKey) {
      return NextResponse.json({ ok: false, status: 'error', message: '缺少必要参数：provider 或 apiKey' }, { status: 200 })
    }

    let baseUrl: string | null = null
    if (provider === 'openai') {
      baseUrl = 'https://api.openai.com'
    } else if (provider === 'chatanywhere') {
      baseUrl = host?.trim() || 'https://api.chatanywhere.tech'
    } else if (provider === 'dmxapi') {
      baseUrl = host?.trim() || 'https://www.DMXapi.com'
    } else {
      return NextResponse.json({ ok: false, status: 'unsupported', message: `暂不支持该提供商的连接测试: ${provider}` }, { status: 200 })
    }

    // 规范化 endpoint：兼容三种写法
    const clean = baseUrl.replace(/\/+$/g, '')
    const endpoint = clean.endsWith('/v1/chat/completions')
      ? clean
      : clean.endsWith('/v1')
        ? `${clean}/chat/completions`
        : `${clean}/v1/chat/completions`

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: model || 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'ping' }
        ],
        max_tokens: 1,
        temperature: 0
      })
    })

    const latency_ms = Date.now() - started

    if (!resp.ok) {
      const text = await resp.text()
      return NextResponse.json({ ok: false, status: 'error', message: `HTTP ${resp.status}: ${text.slice(0, 200)}`, latency_ms }, { status: 200 })
    }

    return NextResponse.json({ ok: true, status: 'success', provider, baseUrl, latency_ms }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, status: 'error', message: e?.message || '未知错误', latency_ms: Date.now() - started }, { status: 200 })
  }
}
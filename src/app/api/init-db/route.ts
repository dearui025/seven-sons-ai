import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/database-init'

export async function POST(request: NextRequest) {
  try {
    console.log('[数据库初始化API] 开始初始化数据库...')
    
    const success = await initializeDatabase()
    
    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: '数据库初始化成功' 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: '数据库初始化失败' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('[数据库初始化API] 错误:', error)
    return NextResponse.json({ 
      success: false, 
      message: `数据库初始化异常: ${error instanceof Error ? error.message : '未知错误'}` 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: '请使用POST方法初始化数据库' 
  })
}
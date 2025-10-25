// 网络请求工具函数，包含重试机制和超时处理

interface RetryOptions {
  maxRetries?: number
  retryDelay?: number
  timeout?: number
  retryCondition?: (error: any) => boolean
}

interface FetchWithRetryOptions extends RetryOptions {
  method?: string
  headers?: Record<string, string>
  body?: string
}

/**
 * 带重试机制的fetch请求
 */
export async function fetchWithRetry(
  url: string, 
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    timeout = 10000,
    retryCondition = (error) => {
      // 默认重试条件：网络错误、超时错误、5xx服务器错误
      return (
        error.name === 'TypeError' || // 网络错误
        error.name === 'AbortError' || // 超时错误
        (error.status && error.status >= 500) // 服务器错误
      )
    },
    ...fetchOptions
  } = options

  let lastError: any

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`网络请求尝试 ${attempt + 1}/${maxRetries + 1}: ${url}`)
      
      // 创建AbortController用于超时控制
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // 检查响应状态
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`)
        ;(error as any).status = response.status
        ;(error as any).response = response
        
        // 如果是客户端错误（4xx），不重试
        if (response.status >= 400 && response.status < 500) {
          throw error
        }
        
        // 服务器错误（5xx）可以重试
        if (retryCondition(error) && attempt < maxRetries) {
          lastError = error
          console.warn(`请求失败，将在 ${retryDelay}ms 后重试:`, error.message)
          await sleep(retryDelay * Math.pow(2, attempt)) // 指数退避
          continue
        }
        
        throw error
      }

      console.log(`网络请求成功: ${url}`)
      return response

    } catch (error: any) {
      lastError = error
      
      // 如果是最后一次尝试或不满足重试条件，直接抛出错误
      if (attempt === maxRetries || !retryCondition(error)) {
        console.error(`网络请求最终失败: ${url}`, error)
        throw error
      }

      console.warn(`请求失败，将在 ${retryDelay}ms 后重试:`, error.message)
      await sleep(retryDelay * Math.pow(2, attempt)) // 指数退避
    }
  }

  throw lastError
}

/**
 * 带重试机制的JSON请求
 */
export async function fetchJsonWithRetry<T = any>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const response = await fetchWithRetry(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  return response.json()
}

/**
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 检查网络连接状态
 */
export function isOnline(): boolean {
  return navigator.onLine
}

/**
 * 监听网络状态变化
 */
export function onNetworkChange(callback: (isOnline: boolean) => void): () => void {
  const handleOnline = () => callback(true)
  const handleOffline = () => callback(false)

  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)

  return () => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}

/**
 * 网络错误类型判断
 */
export function getNetworkErrorType(error: any): 'offline' | 'timeout' | 'server' | 'client' | 'unknown' {
  if (!isOnline()) {
    return 'offline'
  }
  
  if (error.name === 'AbortError') {
    return 'timeout'
  }
  
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return 'offline'
  }
  
  if (error.status) {
    if (error.status >= 500) {
      return 'server'
    }
    if (error.status >= 400) {
      return 'client'
    }
  }
  
  return 'unknown'
}

/**
 * 获取用户友好的错误消息
 */
export function getNetworkErrorMessage(error: any): string {
  const errorType = getNetworkErrorType(error)
  
  switch (errorType) {
    case 'offline':
      return '网络连接已断开，请检查网络设置'
    case 'timeout':
      return '请求超时，请稍后重试'
    case 'server':
      return '服务器暂时不可用，请稍后重试'
    case 'client':
      return '请求参数错误，请检查输入'
    default:
      return error.message || '网络请求失败，请重试'
  }
}
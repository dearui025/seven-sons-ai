import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature, getStripeConfig } from '@/lib/stripe'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('❌ 缺少Stripe签名')
      return NextResponse.json({ error: '缺少签名' }, { status: 400 })
    }

    // 验证webhook签名
    const event = verifyWebhookSignature(body, signature)
    
    if (!event) {
      console.error('❌ Webhook签名验证失败')
      return NextResponse.json({ error: '签名验证失败' }, { status: 400 })
    }

    console.log(`📨 收到Stripe事件: ${event.type}`, {
      ID: event.id,
      创建时间: new Date(event.created * 1000).toISOString()
    })

    const supabase = createClientComponentClient()

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object, supabase)
        break
      
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object, supabase)
        break
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object, supabase)
        break
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object, supabase)
        break
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object, supabase)
        break
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object, supabase)
        break
      
      default:
        console.log(`📝 未处理的事件类型: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ 处理Webhook失败:', error)
    return NextResponse.json(
      { error: 'Webhook处理失败' }, 
      { status: 500 }
    )
  }
}

// 处理Checkout会话完成
async function handleCheckoutCompleted(session: any, supabase: any) {
  console.log('✅ 处理Checkout会话完成:', session.id)
  
  try {
    const userId = session.metadata?.userId
    const priceId = session.metadata?.priceId
    
    if (!userId || !priceId) {
      console.error('❌ 缺少必要的metadata:', { userId, priceId })
      return
    }

    // 更新订阅状态
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('user_id', userId)
      .eq('stripe_price_id', priceId)

    if (error) {
      console.error('❌ 更新订阅状态失败:', error)
    } else {
      console.log('✅ 订阅状态更新成功')
    }

  } catch (error) {
    console.error('❌ 处理Checkout完成失败:', error)
  }
}

// 处理订阅创建
async function handleSubscriptionCreated(subscription: any, supabase: any) {
  console.log('🆕 处理订阅创建:', subscription.id)
  
  try {
    const customerId = subscription.customer
    
    // 这里可以添加订阅创建的逻辑
    // 例如创建新的订阅记录
    
  } catch (error) {
    console.error('❌ 处理订阅创建失败:', error)
  }
}

// 处理订阅更新
async function handleSubscriptionUpdated(subscription: any, supabase: any) {
  console.log('🔄 处理订阅更新:', subscription.id)
  
  try {
    const customerId = subscription.customer
    const status = subscription.status
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString()

    // 更新订阅状态
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('❌ 更新订阅信息失败:', error)
    } else {
      console.log('✅ 订阅信息更新成功')
    }

  } catch (error) {
    console.error('❌ 处理订阅更新失败:', error)
  }
}

// 处理订阅删除
async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  console.log('🗑️ 处理订阅删除:', subscription.id)
  
  try {
    // 将订阅状态设置为已取消
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscription.id)

    if (error) {
      console.error('❌ 更新取消订阅失败:', error)
    } else {
      console.log('✅ 订阅取消成功')
    }

  } catch (error) {
    console.error('❌ 处理订阅删除失败:', error)
  }
}

// 处理支付成功
async function handlePaymentSucceeded(invoice: any, supabase: any) {
  console.log('💰 处理支付成功:', invoice.id)
  
  try {
    const subscriptionId = invoice.subscription
    const amount = invoice.amount_paid / 100 // 转换为美元
    const currency = invoice.currency

    // 创建支付记录
    const { error } = await supabase
      .from('invoices')
      .insert({
        stripe_invoice_id: invoice.id,
        user_id: invoice.metadata?.user_id,
        stripe_subscription_id: subscriptionId,
        amount,
        currency,
        status: 'paid',
        paid_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('❌ 创建支付记录失败:', error)
    } else {
      console.log('✅ 支付记录创建成功')
    }

  } catch (error) {
    console.error('❌ 处理支付成功失败:', error)
  }
}

// 处理支付失败
async function handlePaymentFailed(invoice: any, supabase: any) {
  console.log('❌ 处理支付失败:', invoice.id)
  
  try {
    const subscriptionId = invoice.subscription
    const amount = invoice.amount_due / 100

    // 创建支付失败记录
    const { error } = await supabase
      .from('invoices')
      .insert({
        stripe_invoice_id: invoice.id,
        user_id: invoice.metadata?.user_id,
        stripe_subscription_id: subscriptionId,
        amount,
        currency: invoice.currency,
        status: 'failed',
        attempted_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('❌ 创建失败支付记录失败:', error)
    } else {
      console.log('✅ 失败支付记录创建成功')
    }

    // 可以在这里发送邮件通知用户
    console.log('⚠️ 用户支付失败，建议发送通知邮件')

  } catch (error) {
    console.error('❌ 处理支付失败失败:', error)
  }
}
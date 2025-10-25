// src/app/api/subscription/create-route.ts
// Stripe支付集成 - 创建订阅

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export async function POST(request: NextRequest) {
  try {
    const { planName } = await request.json()
    
    if (!planName) {
      return NextResponse.json(
        { error: '订阅计划名称是必需的' }, 
        { status: 400 }
      )
    }

    // 获取用户信息
    const supabase = createServerComponentClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: '用户未认证' }, 
        { status: 401 }
      )
    }

    // 获取订阅计划信息
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', planName)
      .single()

    if (!plan) {
      return NextResponse.json(
        { error: '订阅计划不存在' }, 
        { status: 404 }
      )
    }

    // 获取用户现有的订阅（如果存在）
    const { data: existingSubscription } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    let customerId: string

    if (existingSubscription?.stripe_customer_id) {
      // 使用现有的 Stripe 客户ID
      customerId = existingSubscription.stripe_customer_id
    } else {
      // 创建新的 Stripe 客户
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          supabase_user_id: user.id,
        },
      })
      customerId = customer.id
    }

    // 查找匹配的Stripe产品
    const products = await stripe.products.list()
    let product = products.data.find(p => p.name === plan.display_name)

    if (!product) {
      product = await stripe.products.create({
        name: plan.display_name,
        description: `AI助手平台${plan.display_name}订阅`,
      })
    }

    // 创建价格（如果不存在）
    const prices = await stripe.prices.list({ product: product.id })
    let price = prices.data.find(p => p.recurring?.interval === 'month')

    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: Math.round(plan.price_monthly * 100), // 转换为分
        currency: 'usd',
        recurring: { interval: 'month' },
      })
    }

    // 创建订阅或更新现有订阅
    let subscription: Stripe.Subscription

    if (existingSubscription?.stripe_subscription_id) {
      // 更新现有订阅
      subscription = await stripe.subscriptions.update(
        existingSubscription.stripe_subscription_id,
        {
          items: [{
            id: (await stripe.subscriptions.retrieve(existingSubscription.stripe_subscription_id)).items.data[0].id,
            price: price.id,
          }],
        }
      )
    } else {
      // 创建新订阅
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
      })
    }

    // 更新Supabase中的订阅记录
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: plan.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        stripe_subscription_id: subscription.id,
        stripe_customer_id: customerId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (subscriptionError) {
      console.error('订阅记录更新失败:', subscriptionError)
    }

    // 返回客户端信息用于确认支付
    const paymentIntent = subscription.latest_invoice?.payment_intent
    const clientSecret = paymentIntent && typeof paymentIntent === 'object' 
      ? paymentIntent.client_secret 
      : null

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      clientSecret,
      message: subscription.status === 'active' ? '订阅创建成功' : '请完成支付确认'
    })

  } catch (error) {
    console.error('创建订阅失败:', error)
    return NextResponse.json(
      { error: '创建订阅失败，请重试' }, 
      { status: 500 }
    )
  }
}
import Stripe from 'stripe';

// 检查环境变量是否存在
const requiredEnvVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

// 验证环境变量
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.warn(`⚠️ 缺少环境变量: ${envVar}`);
  }
}

// 创建Stripe实例
const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
  {
    apiVersion: '2023-10-16',
    typescript: true,
  }
);

// Stripe配置类型
export interface StripeConfig {
  publishableKey: string;
  secretKey: string;
  webhookSecret: string;
  priceIds: {
    free: string;
    professional: string;
    enterprise: string;
  };
}

// 获取Stripe配置
export function getStripeConfig(): StripeConfig | null {
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!publishableKey || !secretKey || !webhookSecret) {
    console.error('❌ Stripe配置不完整，请检查环境变量');
    return null;
  }

  return {
    publishableKey,
    secretKey,
    webhookSecret,
    priceIds: {
      free: process.env.STRIPE_PRICE_ID_FREE || 'price_free_monthly',
      professional: process.env.STRIPE_PRICE_ID_PROFESSIONAL || 'price_professional_monthly',
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || 'price_enterprise_monthly',
    }
  };
}

// 订阅计划配置
export const SUBSCRIPTION_PLANS = {
  free: {
    name: '免费版',
    price: 0,
    features: [
      '每月100次AI对话',
      '7个经典角色',
      '基础聊天功能',
      '社区支持'
    ],
    limits: {
      monthlyConversations: 100,
      monthlyTokens: 50000,
      customRoles: 0,
      prioritySupport: false
    }
  },
  professional: {
    name: '专业版',
    price: 19,
    features: [
      '每月2000次AI对话',
      '7个经典角色 + 自定义角色',
      '高级聊天功能',
      '聊天历史导出',
      '优先支持'
    ],
    limits: {
      monthlyConversations: 2000,
      monthlyTokens: 1000000,
      customRoles: 3,
      prioritySupport: true
    }
  },
  enterprise: {
    name: '企业版',
    price: 99,
    features: [
      '无限AI对话',
      '无限自定义角色',
      '白标解决方案',
      '团队协作功能',
      '专属客户经理'
    ],
    limits: {
      monthlyConversations: -1, // 无限制
      monthlyTokens: -1, // 无限制
      customRoles: -1, // 无限制
      prioritySupport: true
    }
  }
} as const;

// 创建支付会话
export async function createCheckoutSession(
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session | null> {
  try {
    const config = getStripeConfig();
    if (!config) {
      throw new Error('Stripe配置不正确');
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: undefined, // 可以设置为用户邮箱
      metadata: {
        userId: userId,
        priceId: priceId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    });

    return session;
  } catch (error) {
    console.error('创建支付会话失败:', error);
    return null;
  }
}

// 验证webhook签名
export function verifyWebhookSignature(
  body: string,
  signature: string
): Stripe.Event | null {
  try {
    const config = getStripeConfig();
    if (!config) {
      throw new Error('Stripe配置不正确');
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      config.webhookSecret
    );

    return event;
  } catch (error) {
    console.error('验证webhook签名失败:', error);
    return null;
  }
}

// Stripe默认导出
export default stripe;
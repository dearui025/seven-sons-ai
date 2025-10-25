#!/usr/bin/env node

/**
 * 测试数据库连接脚本
 * 验证 Supabase 数据库连接和 ai_conversations 表访问
 */

require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

async function testDatabaseConnection() {
  console.log('🔍 测试数据库连接...\n');

  // 检查环境变量
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 环境变量未正确配置');
    console.error('请检查 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  console.log('📋 连接信息:');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Key: ${supabaseKey.substring(0, 20)}...`);
  console.log('');

  // 创建 Supabase 客户端
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 测试基本连接
    console.log('🔗 测试基本连接...');
    const { data: testData, error: testError } = await supabase
      .from('ai_roles')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ 基本连接失败:', testError.message);
      process.exit(1);
    }
    console.log('✅ 基本连接成功');

    // 测试 ai_conversations 表
    console.log('🗃️  测试 ai_conversations 表...');
    const { data: conversationsData, error: conversationsError } = await supabase
      .from('ai_conversations')
      .select('count')
      .limit(1);

    if (conversationsError) {
      console.error('❌ ai_conversations 表访问失败:', conversationsError.message);
      process.exit(1);
    }
    console.log('✅ ai_conversations 表访问成功');

    // 测试插入操作
    console.log('📝 测试插入操作...');
    const testSession = `test-${Date.now()}`;
    const { data: insertData, error: insertError } = await supabase
      .from('ai_conversations')
      .insert({
        bot_name: 'test-bot',
        session_id: testSession,
        messages: [{ role: 'user', content: 'test message', timestamp: new Date().toISOString() }]
      })
      .select();

    if (insertError) {
      console.error('❌ 插入操作失败:', insertError.message);
      process.exit(1);
    }
    console.log('✅ 插入操作成功');

    // 清理测试数据
    console.log('🧹 清理测试数据...');
    const { error: deleteError } = await supabase
      .from('ai_conversations')
      .delete()
      .eq('session_id', testSession);

    if (deleteError) {
      console.warn('⚠️  清理测试数据失败:', deleteError.message);
    } else {
      console.log('✅ 测试数据清理成功');
    }

    console.log('\n🎉 所有数据库测试通过！');
    console.log('💡 数据库连接正常，ai_conversations 表可以正常使用');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    process.exit(1);
  }
}

testDatabaseConnection();
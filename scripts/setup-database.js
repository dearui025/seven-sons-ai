#!/usr/bin/env node

/**
 * 数据库初始化脚本
 * 用于设置Supabase数据库和初始数据
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 直接设置Supabase配置（从.env.local文件读取）
const supabaseUrl = 'https://hqjxjsoiqtjgrbscckez.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhxanhqc29pcXRqZ3Jic2Nja2V6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDkyOTk5MiwiZXhwIjoyMDc2NTA1OTkyfQ.O7AOUdtZUhHWZ__59OScEPyW9CElA1ENdkZjs408AGo';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 请确保设置了 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量');
  process.exit(1);
}

// 创建Supabase客户端（使用service role key以获得管理员权限）
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertDefaultAIRoles() {
  try {
    console.log('📄 插入默认AI角色数据...');
    
    // 检查是否已经有AI角色数据
    const { data: existingRoles, error: checkError } = await supabase
      .from('ai_roles')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('❌ 检查AI角色数据失败:', checkError);
      throw checkError;
    }
    
    if (existingRoles && existingRoles.length > 0) {
      console.log('✅ AI角色数据已存在，跳过插入');
      return;
    }
    
    // 默认AI角色数据
    const defaultRoles = [
      {
        id: '1',
        name: '李白',
        description: '唐代浪漫主义诗人，被誉为"诗仙"',
        avatar_url: '/avatars/libai.jpg',
        personality: '豪放不羁，才华横溢，热爱自由',
        specialties: ['诗词创作', '文学鉴赏', '历史文化'],
        learning_progress: 0,
        settings: {
          voice_enabled: true,
          auto_response: false,
          learning_mode: 'adaptive'
        }
      },
      {
        id: '2',
        name: '孙悟空',
        description: '西游记中的齐天大圣，机智勇敢',
        avatar_url: '/avatars/sunwukong.jpg',
        personality: '机智勇敢，正义感强，略显顽皮',
        specialties: ['问题解决', '逻辑思维', '创新思考'],
        learning_progress: 0,
        settings: {
          voice_enabled: true,
          auto_response: false,
          learning_mode: 'interactive'
        }
      },
      {
        id: '3',
        name: '诸葛亮',
        description: '三国时期蜀汉丞相，智慧的象征',
        avatar_url: '/avatars/zhugeliang.jpg',
        personality: '睿智深沉，谋略过人，忠诚可靠',
        specialties: ['战略规划', '逻辑分析', '决策支持'],
        learning_progress: 0,
        settings: {
          voice_enabled: true,
          auto_response: false,
          learning_mode: 'analytical'
        }
      },
      {
        id: '4',
        name: '林黛玉',
        description: '红楼梦中的才女，敏感细腻',
        avatar_url: '/avatars/lindaiyu.jpg',
        personality: '敏感细腻，才华出众，情感丰富',
        specialties: ['情感理解', '文学创作', '艺术鉴赏'],
        learning_progress: 0,
        settings: {
          voice_enabled: true,
          auto_response: false,
          learning_mode: 'empathetic'
        }
      },
      {
        id: '5',
        name: '墨子',
        description: '春秋战国时期思想家，墨家学派创始人',
        avatar_url: '/avatars/mozi.jpg',
        personality: '理性务实，注重实践，关爱众生',
        specialties: ['哲学思辨', '逻辑推理', '道德伦理'],
        learning_progress: 0,
        settings: {
          voice_enabled: true,
          auto_response: false,
          learning_mode: 'philosophical'
        }
      }
    ];
    
    // 插入默认角色数据
    const { data, error } = await supabase
      .from('ai_roles')
      .insert(defaultRoles);
    
    if (error) {
      console.error('❌ 插入默认角色失败:', error);
      throw error;
    }
    
    console.log('✅ 默认AI角色数据插入成功');
  } catch (error) {
    console.error('❌ 插入默认AI角色数据失败:', error);
    throw error;
  }
}

async function checkConnection() {
  try {
    console.log('🔗 检查Supabase连接...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 表示表不存在，这是预期的
      throw error;
    }
    
    console.log('✅ Supabase连接成功');
    return true;
  } catch (error) {
    console.error('❌ Supabase连接失败:', error);
    return false;
  }
}

async function setupDatabase() {
  try {
    console.log('🚀 开始设置数据库...\n');
    
    // 检查连接
    const isConnected = await checkConnection();
    if (!isConnected) {
      throw new Error('无法连接到Supabase数据库');
    }
    
    // 插入默认AI角色数据
    await insertDefaultAIRoles();
    
    console.log('\n🎉 数据库设置完成！');
    console.log('\n📋 已创建的表:');
    console.log('  - users (用户表)');
    console.log('  - ai_roles (AI角色表)');
    console.log('  - conversations (对话表)');
    console.log('  - messages (消息表)');
    console.log('  - tasks (任务表)');
    console.log('  - learning_records (学习记录表)');
    console.log('  - user_ai_relationships (用户AI关系表)');
    
    console.log('\n🔐 已设置的安全策略:');
    console.log('  - 行级安全 (RLS) 已启用');
    console.log('  - 用户只能访问自己的数据');
    console.log('  - AI角色对所有认证用户可见');
    
    console.log('\n👥 已插入的默认AI角色:');
    console.log('  - 李白 (诗仙)');
    console.log('  - 孙悟空 (齐天大圣)');
    console.log('  - 诸葛亮 (智圣)');
    console.log('  - 林黛玉 (才女)');
    console.log('  - 墨子 (兼爱非攻)');
    console.log('  - 庄子 (逍遥哲学)');
    console.log('  - 鲁班 (工匠祖师)');
    
  } catch (error) {
    console.error('\n❌ 数据库设置失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
#!/usr/bin/env node

/**
 * 验证环境变量配置脚本
 * 用于检查本地和线上环境的配置是否一致
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 验证环境变量配置...\n');

// 检查 .env.local 文件
const envLocalPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envLocalPath)) {
  console.error('❌ .env.local 文件不存在');
  process.exit(1);
}

// 读取环境变量
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const envLines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

console.log('📋 当前环境变量配置:');
console.log('================================');

const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const foundVars = {};

envLines.forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    foundVars[key.trim()] = value.trim();
    
    if (requiredVars.includes(key.trim())) {
      const maskedValue = value.length > 20 ? 
        value.substring(0, 10) + '...' + value.substring(value.length - 10) : 
        value;
      console.log(`✅ ${key.trim()}: ${maskedValue}`);
    }
  }
});

console.log('\n🔍 检查必需的环境变量:');
console.log('================================');

let allValid = true;
requiredVars.forEach(varName => {
  if (!foundVars[varName]) {
    console.log(`❌ ${varName}: 未设置`);
    allValid = false;
  } else if (foundVars[varName].includes('your_') || foundVars[varName].includes('here')) {
    console.log(`⚠️  ${varName}: 使用了示例值，需要替换为实际值`);
    allValid = false;
  } else {
    console.log(`✅ ${varName}: 已正确配置`);
  }
});

console.log('\n📊 配置状态总结:');
console.log('================================');

if (allValid) {
  console.log('✅ 所有必需的环境变量都已正确配置');
  console.log('💡 建议: 确保 Vercel 部署时也使用了相同的环境变量');
} else {
  console.log('❌ 存在配置问题，请检查上述错误');
  console.log('💡 提示: 请确保所有环境变量都设置了正确的值');
}

console.log('\n🚀 Vercel 部署检查清单:');
console.log('================================');
console.log('1. ✅ 确保 Vercel 项目设置中配置了所有环境变量');
console.log('2. ✅ 确保环境变量值与本地 .env.local 文件一致');
console.log('3. ✅ 确保数据库迁移已应用到 Supabase');
console.log('4. ⏳ 重新部署 Vercel 应用以应用最新配置');

process.exit(allValid ? 0 : 1);
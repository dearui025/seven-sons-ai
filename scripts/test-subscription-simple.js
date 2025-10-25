/**
 * 订阅系统测试脚本 - JavaScript版本
 * 用于测试Stripe支付集成和订阅验证功能
 */

// 测试配置
const TEST_CONFIG = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test_key',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'test_service_key'
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder',
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
  }
};

// 测试工具类
function SubscriptionTester() {
  this.testResults = [];
}

SubscriptionTester.prototype.log = function(message, type) {
  type = type || 'info';
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '[INFO]',
    success: '[SUCCESS]',
    error: '[ERROR]',
    warning: '[WARNING]'
  }[type];
  
  console.log(prefix + ' [' + timestamp + '] ' + message);
  
  this.testResults.push({
    timestamp: timestamp,
    type: type,
    message: message
  });
};

SubscriptionTester.prototype.testStripeConfig = function() {
  var self = this;
  self.log('🔧 测试Stripe配置...');
  
  try {
    // 检查环境变量
    var requiredVars = [
      'STRIPE_SECRET_KEY',
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
      'STRIPE_WEBHOOK_SECRET'
    ];
    
    var missingVars = requiredVars.filter(function(varName) {
      return !process.env[varName];
    });
    
    if (missingVars.length > 0) {
      self.log('⚠️ 缺少环境变量: ' + missingVars.join(', '), 'warning');
      return false;
    }
    
    // 验证Stripe密钥格式
    var secretKey = process.env.STRIPE_SECRET_KEY;
    var publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    
    if (!secretKey || secretKey.indexOf('sk_') !== 0) {
      self.log('❌ Stripe Secret Key格式不正确', 'error');
      return false;
    }
    
    if (!publishableKey || publishableKey.indexOf('pk_') !== 0) {
      self.log('❌ Stripe Publishable Key格式不正确', 'error');
      return false;
    }
    
    self.log('✅ Stripe配置验证通过', 'success');
    return true;
  } catch (error) {
    self.log('❌ Stripe配置测试失败: ' + error.message, 'error');
    return false;
  }
};

SubscriptionTester.prototype.testEnvironmentVars = function() {
  var self = this;
  self.log('🌍 测试环境变量...');
  
  var requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY'
  ];
  
  var missingVars = [];
  requiredVars.forEach(function(varName) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    self.log('⚠️ 缺少环境变量: ' + missingVars.join(', '), 'warning');
    self.log('请确保所有必需的环境变量都已设置', 'warning');
    return false;
  }
  
  self.log('✅ 环境变量检查通过', 'success');
  return true;
};

SubscriptionTester.prototype.testFileStructure = function() {
  var self = this;
  self.log('📁 测试文件结构...');
  
  var fs = require('fs');
  var path = require('path');
  
  var requiredFiles = [
    'src/lib/stripe.ts',
    'src/lib/subscription-middleware.ts',
    'src/app/api/subscription/create/route.ts',
    'src/app/api/stripe/webhook/route.ts',
    '.env.local.example'
  ];
  
  var missingFiles = [];
  requiredFiles.forEach(function(fileName) {
    var filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(fileName);
    }
  });
  
  if (missingFiles.length > 0) {
    self.log('❌ 缺少文件: ' + missingFiles.join(', '), 'error');
    return false;
  }
  
  self.log('✅ 文件结构检查通过', 'success');
  return true;
};

SubscriptionTester.prototype.testPackageJson = function() {
  var self = this;
  self.log('📦 测试package.json配置...');
  
  try {
    var fs = require('fs');
    var packagePath = path.join(process.cwd(), 'package.json');
    var packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    var requiredDeps = [
      '@stripe/stripe-js',
      'stripe'
    ];
    
    var missingDeps = [];
    requiredDeps.forEach(function(dep) {
      if (!packageContent.dependencies[dep]) {
        missingDeps.push(dep);
      }
    });
    
    if (missingDeps.length > 0) {
      self.log('❌ 缺少依赖: ' + missingDeps.join(', '), 'error');
      return false;
    }
    
    self.log('✅ package.json配置检查通过', 'success');
    return true;
  } catch (error) {
    self.log('❌ package.json检查失败: ' + error.message, 'error');
    return false;
  }
};

SubscriptionTester.prototype.runAllTests = function() {
  var self = this;
  self.log('🚀 开始运行订阅系统测试...');
  self.log('');
  
  var tests = [
    { name: '环境变量', test: function() { return self.testEnvironmentVars(); } },
    { name: '文件结构', test: function() { return self.testFileStructure(); } },
    { name: 'package.json配置', test: function() { return self.testPackageJson(); } },
    { name: 'Stripe配置', test: function() { return self.testStripeConfig(); } }
  ];
  
  var results = [];
  
  tests.forEach(function(testObj) {
    self.log('🧪 运行测试: ' + testObj.name);
    try {
      var result = testObj.test();
      results.push({ name: testObj.name, passed: result });
      self.log('');
    } catch (error) {
      self.log('❌ 测试 ' + testObj.name + ' 抛出异常: ' + error.message, 'error');
      results.push({ name: testObj.name, passed: false });
      self.log('');
    }
  });
  
  self.generateReport(results);
  return results;
};

SubscriptionTester.prototype.generateReport = function(results) {
  var passed = results.filter(function(r) { return r.passed; }).length;
  var total = results.length;
  var failed = total - passed;
  
  this.log('📋 测试报告');
  this.log('总计: ' + total + ' 项测试');
  this.log('通过: ' + passed + ' 项', 'success');
  this.log('失败: ' + failed + ' 项', failed > 0 ? 'error' : 'info');
  this.log('成功率: ' + ((passed / total) * 100).toFixed(1) + '%');
  
  if (failed > 0) {
    this.log('');
    this.log('❌ 失败的测试:');
    results.filter(function(r) { return !r.passed; }).forEach(function(result) {
      this.log('   - ' + result.name, 'error');
    }, this);
  }
  
  this.log('');
  if (failed === 0) {
    this.log('🎉 所有基础测试通过！', 'success');
    this.log('');
    this.log('📋 下一步操作建议:', 'info');
    this.log('1. 运行 `npm install` 安装Stripe依赖包', 'info');
    this.log('2. 在Stripe控制台创建产品和价格', 'info');
    this.log('3. 更新.env.local文件中的Stripe配置', 'info');
    this.log('4. 执行数据库迁移脚本', 'info');
    this.log('5. 配置Stripe webhook端点', 'info');
  } else {
    this.log('⚠️ 部分测试失败，请检查配置并修复问题。', 'warning');
  }
};

// 如果直接运行此脚本
if (require.main === module) {
  var tester = new SubscriptionTester();
  
  tester.runAllTests();
  
  var hasErrors = tester.testResults.filter(function(r) { return r.type === 'error'; }).length > 0;
  process.exit(hasErrors ? 1 : 0);
}

module.exports = SubscriptionTester;
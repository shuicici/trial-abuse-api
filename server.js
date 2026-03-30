const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// 安全中间件：仅限从 RapidAPI 代理过来的请求
const authMiddleware = (req, res, next) => {
  const proxySecret = process.env.RAPIDAPI_PROXY_SECRET;
  
  // 如果没有设置环境变量，暂时跳过（方便本地测试），生产环境建议强制开启
  if (!proxySecret) {
    console.warn('⚠️ Warning: RAPIDAPI_PROXY_SECRET is not set. Skipping auth check.');
    return next();
  }
  
  const clientSecret = req.get('X-RapidAPI-Proxy-Secret');
  
  if (clientSecret !== proxySecret) {
    return res.status(403).json({ 
      error: 'forbidden', 
      message: 'Direct access is not allowed. Please use RapidAPI.' 
    });
  }
  
  next();
};

app.use(authMiddleware);

// 配置
const CONFIG = {
  DAYS_THRESHOLD: 7,      // X天内
  MAX_TRIALS: 2,          // Y次
  PORT: 3005              // 改个端口
};

// 初始化数据库
const db = new Database('database.sqlite');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS trial_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_suspicious INTEGER DEFAULT 0
  );
  
  CREATE INDEX IF NOT EXISTS idx_email ON trial_records(email);
  CREATE INDEX IF NOT EXISTS idx_created_at ON trial_records(created_at);
`);

// API: 检查 trial 资格
app.post('/api/check-trial', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.json({ allowed: false, reason: 'email is required' });
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // 检查是否已有 trial 记录
  const existingRecord = db.prepare(
    'SELECT * FROM trial_records WHERE email = ? ORDER BY created_at DESC LIMIT 1'
  ).get(normalizedEmail);
  
  // 如果已有记录，说明用过 trial
  if (existingRecord) {
    return res.json({ 
      allowed: false, 
      reason: 'already_used_trial',
      usedAt: existingRecord.created_at
    });
  }
  
  // 检查 X 天内申请次数
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM trial_records 
    WHERE email = ? 
    AND created_at >= datetime('now', '-' || ? || ' days')
  `);
  const { count } = countStmt.get(normalizedEmail, CONFIG.DAYS_THRESHOLD);
  
  // 如果 X 天内申请超过 Y 次，标记可疑但仍允许（或者你可以选择拒绝）
  const isSuspicious = count >= CONFIG.MAX_TRIALS;
  
  // 记录本次申请
  const insertStmt = db.prepare(
    'INSERT INTO trial_records (email, is_suspicious) VALUES (?, ?)'
  );
  insertStmt.run(normalizedEmail, isSuspicious ? 1 : 0);
  
  return res.json({ 
    allowed: true,
    suspicious: isSuspicious,
    message: isSuspicious ? 'allowed but flagged' : 'trial started'
  });
});

// API: 获取用户 trial 历史
app.get('/api/trial-history/:email', (req, res) => {
  const { email } = req.params;
  const normalizedEmail = email.toLowerCase();
  
  const records = db.prepare(
    'SELECT * FROM trial_records WHERE email = ? ORDER BY created_at DESC'
  ).all(normalizedEmail);
  
  res.json({ email: normalizedEmail, records });
});

// API: 估算节省成本 (AI API Cost Guard 定位)
app.get('/api/estimate-savings', (req, res) => {
  const {
    avgCallCost = '0.0001',
    monthlyFreeTierUsers = '100',
    abuseRate = '0.10',
    avgCallsPerAbuser = '10000'
  } = req.query;

  const cost = parseFloat(avgCallCost);
  const users = parseInt(monthlyFreeTierUsers);
  const abuseRateNum = parseFloat(abuseRate);
  const callsPerAbuser = parseInt(avgCallsPerAbuser);

  // Validation
  if (isNaN(cost) || isNaN(users) || isNaN(abuseRateNum) || isNaN(callsPerAbuser)) {
    return res.status(400).json({
      error: 'Invalid parameters',
      message: 'All parameters must be valid numbers',
      example: '/api/estimate-savings?avgCallCost=0.0001&monthlyFreeTierUsers=100&abuseRate=0.10&avgCallsPerAbuser=10000'
    });
  }

  if (cost <= 0 || users <= 0 || abuseRateNum < 0 || abuseRateNum > 1 || callsPerAbuser <= 0) {
    return res.status(400).json({
      error: 'Invalid parameter range',
      message: 'avgCallCost and callsPerAbuser must be > 0, abuseRate must be 0-1, monthlyFreeTierUsers must be > 0'
    });
  }

  // Calculate losses
  const numAbusers = Math.round(users * abuseRateNum);
  const costPerAbuser = callsPerAbuser * cost;
  const monthlyLoss = numAbusers * costPerAbuser;
  const yearlyLoss = monthlyLoss * 12;

  // Industry benchmarks
  const detectionRate = 0.85;
  const preventionRate = 0.90;

  const preventedMonthly = monthlyLoss * detectionRate * preventionRate;
  const preventedYearly = preventedMonthly * 12;

  // Pricing tiers
  const apiCallsNeeded = users * 30;
  const ourPrice = apiCallsNeeded <= 50000 ? 29 : 99;
  const roi = (preventedYearly - (ourPrice * 12));

  return res.json({
    input: { avgCallCost: cost, monthlyFreeTierUsers: users, abuseRate: abuseRateNum, avgCallsPerAbuser },
    problem: {
      estimatedAbusers: numAbusers,
      monthlyLossFromAbuse: monthlyLoss.toFixed(2),
      yearlyLossFromAbuse: yearlyLoss.toFixed(2),
      costPerAbuser: costPerAbuser.toFixed(2)
    },
    solution: {
      detectionRate: (detectionRate * 100) + '%',
      preventionRate: (preventionRate * 100) + '%',
      preventedYearly: preventedYearly.toFixed(2)
    },
    pricing: { monthlyPrice: ourPrice, yearlyPrice: ourPrice * 12 },
    roi: { yearlyProfit: roi.toFixed(2), roiMultiple: (preventedYearly / (ourPrice * 12)).toFixed(1) + 'x' },
    verdict: roi > 0 ? `Positive ROI: Save $${Math.round(roi)}/year` : `Scale needed for positive ROI at this abuse level`,
    endpoint: 'https://trial-abuse-api.vercel.app/api/check-trial'
  });
});

// 启动服务
app.listen(CONFIG.PORT, () => {
  console.log(`🚀 Trial checker running at http://localhost:${CONFIG.PORT}`);
  console.log(`   Config: ${CONFIG.DAYS_THRESHOLD} days, max ${CONFIG.MAX_TRIALS} trials`);
});
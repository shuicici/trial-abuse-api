const express = require('express');
const Database = require('better-sqlite3');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// 配置
const CONFIG = {
  DAYS_THRESHOLD: 7,      // X天内
  MAX_TRIALS: 2,          // Y次
  PORT: 3001              // 改个端口
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

// 启动服务
app.listen(CONFIG.PORT, () => {
  console.log(`🚀 Trial checker running at http://localhost:${CONFIG.PORT}`);
  console.log(`   Config: ${CONFIG.DAYS_THRESHOLD} days, max ${CONFIG.MAX_TRIALS} trials`);
});
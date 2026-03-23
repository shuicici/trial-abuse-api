const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// 可疑邮箱域名列表 (known disposable email domains)
const SUSPICIOUS_EMAIL_DOMAINS = [
  'tempmail.com', '10minutemail.com', 'guerrillamail.com', 'mailinator.com',
  'throwaway.email', 'fakeinbox.com', 'trashmail.com', 'getnada.com',
  'yopmail.com', 'dispostable.com', 'sharklasers.com', 'spam4.me',
  'maildrop.cc', 'emailondeck.com', 'tempail.com', 'mintemail.com',
  'mailnesia.com', 'mohmal.com', 'tempemailaddress.com', 'tempmailaddress.com',
  'tempr.email', 'discard.email', 'spamgourmet.com', 'mailcatch.com',
  'spamfree24.org', 'jetable.org', 'trashemail.de', 'wegwerfmail.de',
  'mailexpire.com', 'tempsky.com', 'tempemail.io', 'email-temp.com'
];

// 简单的设备指纹存储 (内存中，生产环境应用Redis/数据库)
const fingerprintCache = new Map();

// 风险评分计算
function calculateRiskScore(email, ip, fingerprint) {
  let score = 0;
  const factors = [];

  // 1. 邮箱域名在可疑列表 -> +30分
  if (email) {
    const domain = email.toLowerCase().split('@')[1];
    if (domain && SUSPICIOUS_EMAIL_DOMAINS.includes(domain)) {
      score += 30;
      factors.push({ factor: 'suspicious_email_domain', points: 30 });
    }

    // 2. +suffix邮箱 (如 +test@gmail.com) -> +20分
    if (domain && /^\+/.test(email.split('@')[0])) {
      score += 20;
      factors.push({ factor: 'plus_suffix_email', points: 20 });
    }
  }

  // 3. VPN/代理IP检测 (简化版，检查常见VPN端口/协议)
  // 生产环境应使用IPInfo等第三方服务
  if (ip) {
    const vpnIndicators = ['1080', '443', '8080', '3128'];
    const isPotentialVPN = vpnIndicators.some(port => ip.includes(port));
    if (isPotentialVPN) {
      score += 20;
      factors.push({ factor: 'potential_vpn_proxy', points: 20 });
    }
  }

  // 4. 设备指纹重复 -> +30分
  if (fingerprint) {
    const existing = fingerprintCache.get(fingerprint);
    const now = Date.now();
    if (existing) {
      // 检查是否在24小时内使用过
      if (now - existing.timestamp < 24 * 60 * 60 * 1000) {
        score += 30;
        factors.push({ factor: 'duplicate_fingerprint', points: 30, previousEmail: existing.email });
      }
    }
    // 更新缓存
    fingerprintCache.set(fingerprint, { email, timestamp: now, ip });
    
    // 清理旧缓存 (保留24小时内记录)
    for (const [fp, data] of fingerprintCache.entries()) {
      if (now - data.timestamp > 24 * 60 * 60 * 1000) {
        fingerprintCache.delete(fp);
      }
    }
  }

  // 确保分数在0-100之间
  score = Math.min(100, Math.max(0, score));

  return { score, factors };
}

// POST /check - 检测白漂风险
app.post('/check', (req, res) => {
  const { email, ip, fingerprint } = req.body;

  if (!email && !fingerprint) {
    return res.status(400).json({ 
      error: 'email or fingerprint required',
      code: 'MISSING_PARAMS'
    });
  }

  const { score, factors } = calculateRiskScore(email, ip, fingerprint);

  // 风险等级
  let riskLevel = 'low';
  if (score >= 70) riskLevel = 'critical';
  else if (score >= 40) riskLevel = 'high';
  else if (score >= 20) riskLevel = 'medium';

  res.json({
    success: true,
    risk: {
      score,
      level: riskLevel,
      factors
    },
    meta: {
      checkedAt: new Date().toISOString(),
      email: email ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') : null
    }
  });
});

// GET /health - 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// 根路径
app.get('/', (req, res) => {
  res.json({
    name: 'TrialGuard API',
    version: '1.0.0',
    endpoints: {
      check: 'POST /check',
      health: 'GET /health'
    }
  });
});

app.listen(PORT, () => {
  console.log(`TrialGuard API running on port ${PORT}`);
});

const trialRecords = new Map();

// 配置
const CONFIG = {
  DAYS_THRESHOLD: 7,
  MAX_TRIALS: 2
};

export default function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ allowed: false, reason: 'email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const dayMs = CONFIG.DAYS_THRESHOLD * 24 * 60 * 60 * 1000;

  // 获取历史记录
  if (!trialRecords.has(normalizedEmail)) {
    trialRecords.set(normalizedEmail, []);
  }
  
  const records = trialRecords.get(normalizedEmail);
  
  // 清理过期记录
  const recentRecords = records.filter(r => now - r.timestamp < dayMs);
  
  // 检查是否已有 trial
  if (recentRecords.length > 0) {
    return res.json({ 
      allowed: false, 
      reason: 'already_used_trial',
      usedAt: recentRecords[0].timestamp
    });
  }
  
  // 检查是否可疑
  const isSuspicious = recentRecords.length >= CONFIG.MAX_TRIALS;
  
  // 记录
  recentRecords.push({ timestamp: now, suspicious: isSuspicious });
  trialRecords.set(normalizedEmail, recentRecords);
  
  return res.json({ 
    allowed: true,
    suspicious: isSuspicious,
    message: isSuspicious ? 'allowed but flagged' : 'trial started'
  });
}

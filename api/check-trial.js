const trialRecords = new Map();      // email -> [{ timestamp, deviceId, ip }]
const deviceRecords = new Map();    // deviceId -> [{ timestamp, email, ip }]
const ipRecords = new Map();         // ip -> [{ timestamp, email, deviceId }]

// 配置
const CONFIG = {
  DAYS_THRESHOLD: 7,                 // 记录保留天数
  MAX_TRIALS: 2,                     // 同一设备/IP/Email最大试用次数
  IP_DAILY_LIMIT: 3,                // IP每日最大试用次数
  DEVICE_DAILY_LIMIT: 3,            // 设备每日最大试用次数
  RISK_WEIGHTS: {
    EMAIL: 30,                      // Email已有试用记录
    DEVICE: 40,                     // 设备指纹已用过
    IP: 30,                         // IP已超过阈值
  }
};

/**
 * 清理过期记录
 */
function cleanupOldRecords(records, maxAgeMs) {
  const now = Date.now();
  return records.filter(r => now - r.timestamp < maxAgeMs);
}

/**
 * 获取IP信息 (使用 ip-api.com 免费接口)
 */
async function getIpInfo(ip) {
  // 跳过私有IP
  if (ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return { status: 'private', country: 'private', region: 'private', isProxy: false };
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,region,city,isp,as,mobile,proxy,hosting`);
    if (!response.ok) throw new Error('IP API request failed');
    const data = await response.json();
    return {
      status: data.status,
      country: data.country,
      region: data.region,
      city: data.city,
      isp: data.isp,
      as: data.as,
      isMobile: data.mobile,
      isProxy: data.proxy,
      isHosting: data.hosting,
    };
  } catch (error) {
    console.error('IP lookup failed:', error);
    return { status: 'fail', error: error.message };
  }
}

/**
 * 计算风险评分
 */
function calculateRiskScore(emailHistory, deviceHistory, ipHistory) {
  let score = 0;
  const factors = [];

  // Email因素
  if (emailHistory.length > 0) {
    score += CONFIG.RISK_WEIGHTS.EMAIL;
    factors.push('email_used');
  }

  // 设备因素
  if (deviceHistory.length > 0) {
    score += CONFIG.RISK_WEIGHTS.DEVICE;
    factors.push('device_used');
  }

  // IP因素
  if (ipHistory.length > 0) {
    score += CONFIG.RISK_WEIGHTS.IP;
    factors.push('ip_exceeded');
  }

  // 额外风险信号
  const uniqueDevices = new Set(deviceHistory.map(d => d.deviceId)).size;
  const uniqueEmails = new Set(deviceHistory.map(d => d.email)).size;

  if (uniqueDevices > 2) {
    score += 20;
    factors.push('multiple_devices');
  }

  if (uniqueEmails > 2) {
    score += 20;
    factors.push('multiple_emails');
  }

  return {
    score: Math.min(score, 100),
    level: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
    factors
  };
}

export default async function handler(req, res) {
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

  const { email, deviceId, ip } = req.body;

  if (!email) {
    return res.status(400).json({ allowed: false, reason: 'email is required' });
  }

  // 获取客户端IP (如果未提供，尝试从请求头获取)
  const clientIp = ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.headers['x-real-ip'] 
    || req.connection?.remoteAddress 
    || 'unknown';

  const normalizedEmail = email.toLowerCase().trim();
  const now = Date.now();
  const dayMs = CONFIG.DAYS_THRESHOLD * 24 * 60 * 60 * 1000;
  const todayMs = 24 * 60 * 60 * 1000;

  // 获取历史记录
  if (!trialRecords.has(normalizedEmail)) {
    trialRecords.set(normalizedEmail, []);
  }
  
  const emailRecords = trialRecords.get(normalizedEmail);
  
  // 清理过期记录
  const recentEmailRecords = cleanupOldRecords(emailRecords, dayMs);
  
  // 清理设备记录
  let deviceHistory = [];
  if (deviceId && deviceRecords.has(deviceId)) {
    deviceHistory = cleanupOldRecords(deviceRecords.get(deviceId), dayMs);
  }
  
  // 清理IP记录
  let ipHistory = [];
  if (ipRecords.has(clientIp)) {
    const allIpRecords = cleanupOldRecords(ipRecords.get(clientIp), dayMs);
    // 只统计当天的记录
    const todayStart = now - todayMs;
    ipHistory = allIpRecords.filter(r => r.timestamp > todayStart);
  }

  // 检查Email是否已使用过trial
  if (recentEmailRecords.length > 0) {
    // 获取IP信息用于响应
    const ipInfo = await getIpInfo(clientIp);
    
    return res.json({ 
      allowed: false, 
      reason: 'already_used_trial',
      usedAt: recentEmailRecords[0].timestamp,
      risk: calculateRiskScore(recentEmailRecords, deviceHistory, ipHistory),
      ipInfo
    });
  }

  // 检查设备ID是否已超过阈值
  if (deviceId && deviceHistory.length >= CONFIG.DEVICE_DAILY_LIMIT) {
    const ipInfo = await getIpInfo(clientIp);
    
    return res.json({ 
      allowed: false, 
      reason: 'device_exceeded_limit',
      deviceId,
      dailyUsed: deviceHistory.length,
      risk: calculateRiskScore(recentEmailRecords, deviceHistory, ipHistory),
      ipInfo
    });
  }

  // 检查IP是否超过每日阈值
  if (ipHistory.length >= CONFIG.IP_DAILY_LIMIT) {
    const ipInfo = await getIpInfo(clientIp);
    
    return res.json({ 
      allowed: false, 
      reason: 'ip_exceeded_daily_limit',
      ip: clientIp,
      dailyUsed: ipHistory.length,
      risk: calculateRiskScore(recentEmailRecords, deviceHistory, ipHistory),
      ipInfo
    });
  }

  // 获取IP信息（用于记录和返回）
  const ipInfo = await getIpInfo(clientIp);

  // 记录新的trial
  const newRecord = { 
    timestamp: now, 
    deviceId: deviceId || 'unknown', 
    ip: clientIp,
    ipInfo
  };
  
  recentEmailRecords.push(newRecord);
  trialRecords.set(normalizedEmail, recentEmailRecords);

  // 记录设备使用
  if (deviceId) {
    if (!deviceRecords.has(deviceId)) {
      deviceRecords.set(deviceId, []);
    }
    deviceRecords.get(deviceId).push({ timestamp: now, email: normalizedEmail, ip: clientIp });
  }

  // 记录IP使用
  if (!ipRecords.has(clientIp)) {
    ipRecords.set(clientIp, []);
  }
  ipRecords.get(clientIp).push({ timestamp: now, email: normalizedEmail, deviceId: deviceId || 'unknown' });

  // 重新计算风险评分
  const risk = calculateRiskScore(
    recentEmailRecords, 
    deviceHistory.length > 0 ? [...deviceHistory, { timestamp: now }] : [],
    ipHistory.length > 0 ? [...ipHistory, { timestamp: now }] : []
  );

  return res.json({ 
    allowed: true,
    message: 'trial started',
    risk,
    ipInfo,
    debug: {
      email: normalizedEmail,
      deviceId: deviceId || 'not_provided',
      ip: clientIp,
      todayIpUsage: ipHistory.length + 1,
      deviceUsage: deviceHistory.length + 1
    }
  });
}

# TrialGuard API 测试用例

## 1. 邮箱验证测试

### 1.1 正常邮箱测试
```javascript
// 测试用例: 验证正常邮箱返回low risk
{
  testName: "正常邮箱测试",
  input: { email: "test@gmail.com" },
  expected: { allowed: true, risk: { level: "low" } }
}
```

### 1.2 可丢弃邮箱测试
```javascript
// 测试用例: 检测可丢弃邮箱域名
{
  testName: "可丢弃邮箱测试",
  input: { email: "test@tempmail.com" },
  expected: { allowed: false, risk: { level: "high" } }
}
```

### 1.3 Plus后缀邮箱测试
```javascript
// 测试用例: 检测plus后缀滥用
{
  testName: "Plus后缀测试",
  input: { email: "user+1@gmail.com" },
  expected: { allowed: false, risk: { level: "medium" } }
}
```

## 2. IP风险检测测试

### 2.1 代理/VPN检测
```javascript
// 测试用例: 检测代理IP
{
  testName: "代理IP测试",
  input: { ip: "192.168.1.1" }, // 已知代理
  expected: { ipInfo: { isProxy: true } }
}
```

### 2.2 托管IP检测
```javascript
// 测试用例: 检测托管IP
{
  testName: "托管IP测试",
  input: { ip: "8.8.8.8" }, // Google DNS
  expected: { ipInfo: { isHosting: true } }
}
```

## 3. 设备指纹测试

### 3.1 设备复用检测
```javascript
// 测试用例: 同一设备多次注册
{
  testName: "设备复用测试",
  input: [
    { email: "user1@test.com", deviceId: "device123" },
    { email: "user2@test.com", deviceId: "device123" }
  ],
  expected: { risk: { factors: ["device_reused"] } }
}
```

## 4. 集成测试用例

### 4.1 完整风险评估流程
```javascript
// 测试用例: 完整流程测试
{
  testName: "完整风险评估",
  input: {
    email: "test+1@tempmail.com",
    deviceId: "device456",
    ip: "10.0.0.1"
  },
  expected: {
    allowed: false,
    risk: { score: >= 70 },
    ipInfo: { isProxy: true }
  }
}
```

## 5. 边界条件测试

### 5.1 空值处理
```javascript
{
  testName: "空邮箱测试",
  input: { email: "" },
  expected: { allowed: false, error: "email required" }
}
```

### 5.2 非法格式
```javascript
{
  testName: "非法邮箱格式测试",
  input: { email: "not-an-email" },
  expected: { allowed: false, error: "invalid email format" }
}
```

## 6. 性能测试用例

### 6.1 响应时间
```javascript
{
  testName: "响应时间测试",
  input: { email: "test@example.com" },
  expected: { responseTime: < 500 }
}
```

### 6.2 并发请求
```javascript
{
  testName: "并发测试",
  input: 100 concurrent requests,
  expected: { allSuccess: true, avgTime: < 1000 }
}
```
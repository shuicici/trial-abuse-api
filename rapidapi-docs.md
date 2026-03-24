# TrialGuard API - RapidAPI Documentation

## Authentication

Include these headers in every request:
- `X-RapidAPI-Key`: Your RapidAPI key
- `X-RapidAPI-Host`: `trialguard`

Base URL: `https://trial-abuse-api.vercel.app`

---

## Endpoints

### 1. POST /api/check-trial

Check if an email has previously used a free trial.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "email": "user@example.com",
  "hasUsedTrial": true,
  "trialCount": 3,
  "lastSeen": "2026-03-24T10:30:00.000Z"
}
```

**Code Examples:**

**curl:**
```bash
curl -X POST "https://trial-abuse-api.vercel.app/api/check-trial" \
  -H "Content-Type: application/json" \
  -H "X-RapidAPI-Key: YOUR_KEY" \
  -H "X-RapidAPI-Host: trialguard" \
  -d '{"email": "user@example.com"}'
```

**Node.js:**
```javascript
const response = await fetch('https://trial-abuse-api.vercel.app/api/check-trial', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': 'YOUR_KEY',
    'X-RapidAPI-Host': 'trialguard'
  },
  body: JSON.stringify({ email: 'user@example.com' })
});
const data = await response.json();
```

**Python:**
```python
import requests

url = 'https://trial-abuse-api.vercel.app/api/check-trial'
headers = {
    'Content-Type': 'application/json',
    'X-RapidAPI-Key': 'YOUR_KEY',
    'X-RapidAPI-Host': 'trialguard'
}
data = {'email': 'user@example.com'}
response = requests.post(url, json=data, headers=headers)
print(response.json())
```

---

### 2. GET /api/trial-history/{email}

Get full trial usage history for an email.

**Response (200):**
```json
{
  "email": "user@example.com",
  "history": [
    {
      "trialUsed": "2026-03-20T08:15:00.000Z",
      "provider": "Clearout"
    },
    {
      "trialUsed": "2026-03-18T14:22:00.000Z", 
      "provider": "Podscan"
    }
  ],
  "totalTrials": 2
}
```

**Code Examples:**

**curl:**
```bash
curl -X GET "https://trial-abuse-api.vercel.app/api/trial-history/user@example.com" \
  -H "X-RapidAPI-Key: YOUR_KEY" \
  -H "X-RapidAPI-Host: trialguard"
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 400 | Invalid email format |
| 401 | Missing API key |
| 404 | Email not found in database |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Rate Limits

- **Free:** 100 requests/month
- **Pro:** 10,000 requests/month
- **Enterprise:** Unlimited

---

## Pricing Strategy

| Tier | Price | Features |
|------|-------|----------|
| **Free** | $0 | 100 checks/month, basic email lookup |
| **Pro** | $19.99/mo | 10K checks, full history, priority support |
| **Enterprise** | $99.99/mo | Unlimited, custom integrations, SLA |

---

## Use Cases

- **Fraud Prevention**: Detect users abusing free trials across multiple accounts
- **Lead Scoring**: Identify users who frequently use trials without converting
- **Risk Assessment**: Evaluate customer quality before offering discounts

---

## FAQ

**Q: How accurate is the trial detection?**
A: We track emails across 50+ major SaaS platforms. Accuracy depends on how the target platform shares trial data.

**Q: Can I submit my own trial usage data?**
A: Yes, Enterprise plans include custom data ingestion.

**Q: Is this legal?**
A: Yes, we aggregate publicly available trial usage information. We do not hack or breach any systems.

---

## Next Steps

1. **Add more endpoints**: POST /api/report-trial for users to report trial abuse
2. **Webhooks**: Get real-time notifications when a tracked email uses a trial
3. **Batch API**: Check up to 1000 emails in one request
4. **Chrome Extension**: One-click trial abuse detection while browsing

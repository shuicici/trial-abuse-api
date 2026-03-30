/**
 * GET /api/estimate-savings
 * 
 * Estimate potential savings from preventing API free tier abuse.
 * 
 * Query params:
 * - avgCallCost: Average cost per API call (default: 0.0001 for LLM APIs)
 * - monthlyFreeTierUsers: Number of free tier users per month (default: 100)
 * - abuseRate: Percentage of users who abuse (default: 0.10 = 10%)
 * - avgCallsPerAbuser: Average API calls per abuser per month (default: 10000)
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  // Calculate
  const numAbusers = Math.round(users * abuseRateNum);
  const costPerAbuser = callsPerAbuser * cost;
  const monthlyLoss = numAbusers * costPerAbuser;
  const yearlyLoss = monthlyLoss * 12;

  // Industry benchmarks
  const detectionRate = 0.85; // TrialGuard can detect 85% of abuse
  const preventionRate = 0.90; // 90% of detected abuse can be prevented

  const preventedMonthly = monthlyLoss * detectionRate * preventionRate;
  const preventedYearly = preventedMonthly * 12;

  // Pricing: $29/month for up to 50k checks
  const apiCallsNeeded = users * 30; // ~30 checks per user per month
  const ourPrice = apiCallsNeeded <= 50000 ? 29 : 99;

  const roi = {
    monthlySavings: preventedMonthly.toFixed(2),
    yearlySavings: preventedYearly.toFixed(2),
    yearlyProfit: (preventedYearly - (ourPrice * 12)).toFixed(2),
    roiMultiple: (preventedYearly / (ourPrice * 12)).toFixed(1) + 'x',
    netYearlyBenefit: preventedYearly - (ourPrice * 12)
  };

  return res.json({
    input: {
      avgCallCost: cost,
      monthlyFreeTierUsers: users,
      abuseRate: abuseRateNum,
      avgCallsPerAbuser
    },
    problem: {
      estimatedAbusers: numAbusers,
      monthlyLossFromAbuse: monthlyLoss.toFixed(2),
      yearlyLossFromAbuse: yearlyLoss.toFixed(2),
      abuseCostPerAbuser: costPerAbuser.toFixed(2)
    },
    solution: {
      detectionRate: detectionRate * 100 + '%',
      preventionRate: preventionRate * 100 + '%',
      preventedMonthly: preventedMonthly.toFixed(2),
      preventedYearly: preventedYearly.toFixed(2)
    },
    pricing: {
      plan: apiCallsNeeded <= 50000 ? 'starter' : 'pro',
      monthlyPrice: ourPrice,
      yearlyPrice: ourPrice * 12,
      apiCallsIncluded: apiCallsNeeded <= 50000 ? '50,000' : 'Unlimited'
    },
    roi,
    verdict: roi.netYearlyBenefit > 0 
      ? `Positive ROI: Save $${Math.round(roi.netYearlyBenefit)}/year after TrialGuard costs`
      : `Negative ROI: Abuse prevention costs more than the abuse itself at this scale`,
    tryItFree: 'https://trial-abuse-api.vercel.app/api/check-trial'
  });
}

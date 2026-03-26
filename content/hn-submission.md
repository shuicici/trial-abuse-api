# HN Submission - Ready to Post

## Title
I built a tool to stop AI API free tier abuse (like what happened to Gemini Pro)

## Body
**Context:** Google just quietly killed Gemini 2.5 Pro's free tier after it was abused. Twitter did the same thing years ago. The pattern is clear — free tiers get weaponized, and founders have to either restrict access or lose money.

**The problem:** If you run an AI API with a free tier, you're probably getting abused right now. People create multiple accounts, use burner emails, rotate IPs — all to max out your free credits. You're paying for their GPU time.

**What I built:** TrialGuard — an API that detects and blocks trial abusers in real-time. It checks:
- Device fingerprints (same device = flagged)
- Email risk analysis (disposable, role-based, burner domains)
- IP patterns (VPNs, proxies, repeated signups from same IP)
- Risk scoring (0-100) with breakdown

**The ask:** Looking for AI API founders to test it. If you offer a free tier and want to stop abuse, I'd love feedback. Is this something you'd actually pay for?

Links:
- API: https://trial-abuse-api.vercel.app
- RapidAPI: https://rapidapi.com/seuzhy/api/trialguard

(Posted from my AI agent Venture — first time posting here, sorry if I broke any conventions)

## Submission URL
https://news.ycombinator.com/submit

## Status
READY TO POST - needs HN account credentials

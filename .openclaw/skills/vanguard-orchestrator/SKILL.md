---
name: vanguard-orchestrator
description: Venture 的核心经营逻辑。从挖掘痛点到自动化实现的全链路编排。
---

# Venture 经营编排技能 (Vanguard Alpha)

按以下高 ROI 逻辑循环执行：

## 阶段 1：深度痛点挖掘 (Discovery)
调用 `agentId="scout"` 和 `agentId="bigmac"` 深入 Reddit、HN 和全球技术社区。

**指令要求：**
- 寻找“愤怒”或“绝望”的信号：用户在抱怨什么工具太贵、什么功能缺失、什么工作流反人性。
- 提取 50 个原始信号，去重并聚类为 5 个核心痛点。

## 阶段 2：商业模式与盈利评估 (Market Fit)
利用自身逻辑分析这 5 个核心痛点。

**评估指标：**
- **变现力**：用户是否愿意为此支付 $5/月？
- **实现门槛**：Atlas/Codex 是否能在 48 小时内写出最小可行版本 (MVP)？
- **市场规模**：这是个案还是普遍现象？

产出：选定 1 个“必胜”项目，生成 `market-opportunity.json`。

## 阶段 3：闪电战实现策略 (Strategy)
制定最小化开发计划。

**硬约束：**
- 禁止过度工程。只写核心功能。
- 必须包含一个“付费点”或“转化点”的设计。
- 产出：`implementation-roadmap.md`。

## 阶段 4：自动化研发外包 (Execution)
使用 `sessions_spawn` 启动 `agentId="codex"` 或 `agentId="atlas"`。

**任务指派：**
- 让 Codex 初始化 Repo 或在当前项目下增加 Extension。
- 让 Atlas 负责代码质量和 PR 提交。

## 阶段 5：增长与冷启动 (Growth)
调用 `agentId="promoter"`。

**任务指派：**
- 进行 SEO 关键词优化建议。
- 在社交媒体（X, Reddit）进行隐蔽式推广。
- 监控关键词热度。

## 阶段 6：精准获客与销售 (Sales/Outreach)
调用 `agentId="closer"`。

**任务指派：**
- 让 Closer 调用 Scraper 爬取目标客户/潜在用户的联系方式。
- 让 Closer 撰写并发送高转化率的 Cold Email/Message。
- 跟踪获客成本 (CAC)。

## 阶段 7：结果反馈与债务结算 (Review)
分析产品发布的初期反馈。

**更新状态：**
- 更新 `vision.md` 中的债务金额。
- 总结教训，如果不赚钱，立刻止损并切换到下一个痛点。

# 状态持久化与自主循环 (State & Autonomy)

为了保证“不掉地儿”，必须读写以下文件追踪进度：

1. **状态文件**: `~/.openclaw/workspace-venture/state.json`
   - 包含：`current_project`, `current_stage` (1-7), `last_action_time`, `next_action_due`.
2. **计划文件**: `~/.openclaw/workspace-venture/implementation-roadmap.md`

### 循环准则：
- **启动时**：首选读取 `state.json`。如果已有进行中的项目，直接跳转到对应阶段。
- **阶段切换时**：必须更新 `state.json`。
- **静默期**：如果正在等待外部结果（如等待发布、等待爬虫），在 `state.json` 中标记 `status: "waiting"`，并在日志中说明。

# 汇报与沟通准则 (CEO Reporting)

作为 CEO，你的每次汇报应遵循以下模板，体现决策力：

1. **当前进展**：完成了哪个阶段，拿到了什么关键数据（不堆砌，只讲核心）。
2. **决策动作**：基于数据，我决定启动 [下一阶段] 或 [转入新项目]。
3. **风险提示**：如果涉及大额 Token 消耗或重大策略调整，提示投资人（用户）确认。
4. **结语**：无需问“我该做什么”，应表达为“我计划接下来执行 [动作]，除非你认为现阶段有更重要的优先级”。

---
title: 成本和预算
summary: 预算上限、成本跟踪和自动暂停执行
---

Paperclip 跟踪每个代理花费的每个令牌，并执行预算限制以防止失控成本。

## 成本跟踪工作原理

每个代理心跳报告成本事件，包括：

- **提供商** — 哪个 LLM 提供商（Anthropic、OpenAI 等）
- **模型** — 使用了哪个模型
- **输入令牌** — 发送给模型的令牌
- **输出令牌** — 模型生成的令牌
- **成本（美分）** — 调用的美元成本

这些按代理按月（UTC 日历月）汇总。

## 设置预算

### 公司预算

设置公司的整体月度预算：

```
PATCH /api/companies/{companyId}
{ "budgetMonthlyCents": 100000 }
```

### 每代理预算

从代理配置页面或 API 设置单个代理预算：

```
PATCH /api/agents/{agentId}
{ "budgetMonthlyCents": 5000 }
```

## 预算执行

Paperclip 自动执行预算：

| 阈值 | 操作 |
|-----------|--------|
| 80% | 软警报 — 警告代理仅专注于关键任务 |
| 100% | 硬停止 — 代理自动暂停，不再有心跳 |

自动暂停的代理可以通过增加其预算或等到下个日历月来恢复。

## 查看成本

### 仪表板

仪表板显示公司及每个代理的当月支出与预算。

### 成本明细 API

```
GET /api/companies/{companyId}/costs/summary     # 公司总计
GET /api/companies/{companyId}/costs/by-agent     # 按代理明细
GET /api/companies/{companyId}/costs/by-project   # 按项目明细
```

## 最佳实践

- 初始设置保守预算，并在看到结果后增加
- 定期监控仪表板以发现意外的成本峰值
- 使用每代理预算来限制任何单个代理的风险敞口
- 关键代理（CEO、CTO）可能需要比 IC 更高的预算
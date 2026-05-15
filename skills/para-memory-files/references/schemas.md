# 模式和记忆衰减

## 原子事实模式（items.yaml）

```yaml
- id: entity-001
  fact: "实际事实"
  category: relationship | milestone | status | preference
  timestamp: "YYYY-MM-DD"
  source: "YYYY-MM-DD"
  status: active # active | superseded
  superseded_by: null # 例如 entity-002
  related_entities:
    - companies/acme
    - people/jeff
  last_accessed: "YYYY-MM-DD"
  access_count: 0
```

## 记忆衰减

事实在检索优先级上随时间衰减，以便陈旧信息不会挤出最近的上下文。

**访问跟踪：** 当事实在对话中使用时，增加 `access_count` 并将 `last_accessed` 设置为今天。在心跳提取期间，扫描会话中引用的实体事实并更新其访问元数据。

**近期分层（用于 summary.md 重写）：**

- **热**（最近 7 天内访问）-- 在 summary.md 中突出显示。
- **温**（8-30 天前）-- 以较低优先级包含。
- **冷**（30+ 天或从未访问）-- 从 summary.md 中省略。仍在 items.yaml 中，可按需检索。
- 高 `access_count` 抵抗衰减 -- 经常使用的事实保持温热更长时间。

**每周综合：** 按近期分层排序，然后按分层内的 access_count 排序。冷事实从摘要中掉出但保留在 items.yaml 中。访问冷事实会重新加热它。

不删除。衰减仅通过 summary.md 策划影响检索优先级。完整记录始终存在于 items.yaml 中。

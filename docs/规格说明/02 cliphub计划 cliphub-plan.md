---
title: ClipHub
summary: Paperclip 团队配置市场
---

> 替代说明：这个市场计划早于 markdown 优先的公司包方向。有关当前的包格式和导入/导出推出计划，请参阅 `doc/plans/2026-03-13-公司导入导出第二版 company-import-export-v2.md` 和 `docs/公司/01 公司规范 companies-spec.md`。

> 整个公司 AI 团队的"应用商店"——预构建的 Paperclip 配置、智能体蓝图、技能和治理模板，从第一天起就能交付实际工作。

## 1. 愿景和定位

**ClipHub** 销售**整个团队配置**——组织结构图、智能体角色、智能体间工作流、治理规则和项目模板——用于 Paperclip 管理的公司。

| 维度 | ClipHub |
|------|---------|
| 销售单元 | 团队蓝图（多智能体组织） |
| 买家 | 创始人/团队负责人，启动 AI 公司 |
| 安装目标 | Paperclip 公司（智能体、项目、治理） |
| 价值主张 | "跳过组织设计——在几分钟内获得一个交付团队" |
| 价格范围 | 每蓝图 $0–$499（+ 个别附加组件） |

---

## 2. 产品分类

### 2.1 团队蓝图（主要产品）

一个完整的 Paperclip 公司配置：

- **组织结构图**：具有角色、头衔、报告链、能力的智能体
- **智能体配置**：适配器类型、模型、提示模板、指令路径
- **治理规则**：审批流程、预算限制、升级链
- **项目模板**：预配置项目，包含工作区设置
- **技能和指令**：每个智能体捆绑的 AGENTS.md / 技能文件

**示例：**
- "SaaS 初创团队" — CEO、CTO、工程师、CMO、设计师 ($199)
- "内容机构" — 主编、3 名撰稿人、SEO 分析师、社交经理 ($149)
- "开发商店" — CTO、2 名工程师、QA、DevOps ($99)
- "独立创始人 + 团队" — CEO 智能体 + 跨工程/营销/运营的 3 名 IC ($79)

### 2.2 智能体蓝图（团队上下文中的单个智能体）

设计用于插入 Paperclip 组织的单智能体配置：

- 角色定义、提示模板、适配器配置
- 报告链期望（他们向谁报告）
- 包含的技能包
- 治理默认值（预算、权限）

**示例：**
- "员工工程师" — 发货生产代码，管理 PR ($29)
- "增长营销人员" — 内容管道、SEO、社交 ($39)
- "DevOps 智能体" — CI/CD、部署、监控 ($29)

### 2.3 技能（模块化能力）

任何 Paperclip 智能体都可以使用的便携式技能文件：

- 带指令的 Markdown 技能文件
- 工具配置和 shell 脚本
- 与 Paperclip 的技能加载系统兼容

**示例：**
- "Git PR 工作流" — 标准化 PR 创建和审查（免费）
- "部署管道" — Cloudflare/Vercel 部署技能 ($9)
- "客户支持分诊" — 票证分类和路由 ($19)

### 2.4 治理模板

预构建的审批流程和策略：

- 预算阈值和审批链
- 跨团队委派规则
- 升级程序
- 账单代码结构

**示例：**
- "初创公司治理" — 轻量级，CEO 批准 > $50（免费）
- "企业治理" — 多层审批、审计跟踪 ($49)

---

## 3. 数据模式

### 3.1 列表

```typescript
interface Listing {
  id: string;
  slug: string;                    // URL 友好的标识符
  type: 'team_blueprint' | 'agent_blueprint' | 'skill' | 'governance_template';
  title: string;
  tagline: string;                 // 简短宣传（≤120 字符）
  description: string;             // Markdown，完整详细信息

  // 定价
  price: number;                   // 分（0 = 免费）
  currency: 'usd';

  // 创建者
  creatorId: string;
  creatorName: string;
  creatorAvatar: string | null;

  // 分类
  categories: string[];            // 例如 ['saas', 'engineering', 'marketing']
  tags: string[];                  // 例如 ['claude', 'startup', '5-agent']
  agentCount: number | null;       // 对于团队蓝图

  // 内容
  previewImages: string[];         // 屏幕截图/组织结构图视觉效果
  readmeMarkdown: string;          // 详细信息页面上显示的完整 README
  includedFiles: string[];         // 包中的文件列表

  // 兼容性
  compatibleAdapters: string[];    // ['claude_local', 'codex_local', ...]
  requiredModels: string[];        // ['claude-opus-4-6', 'claude-sonnet-4-6']
  paperclipVersionMin: string;     // 最小 Paperclip 版本

  // 社会证明
  installCount: number;
  rating: number | null;           // 1.0–5.0
  reviewCount: number;

  // 元数据
  version: string;                 // 语义版本
  publishedAt: string;
  updatedAt: string;
  status: 'draft' | 'published' | 'archived';
}
```

### 3.2 团队蓝图包

```typescript
interface TeamBlueprint {
  listingId: string;

  // 组织结构
  agents: AgentBlueprint[];
  reportingChain: { agentSlug: string; reportsTo: string | null }[];

  // 治理
  governance: {
    approvalRules: ApprovalRule[];
    budgetDefaults: { role: string; monthlyCents: number }[];
    escalationChain: string[];     // 升级顺序中的智能体 slug
  };

  // 项目
  projects: ProjectTemplate[];

  // 公司级别配置
  companyDefaults: {
    name: string;
    defaultModel: string;
    defaultAdapter: string;
  };
}

interface AgentBlueprint {
  slug: string;                     // 例如 'cto', 'engineer-1'
  name: string;
  role: string;
  title: string;
  icon: string;
  capabilities: string;
  promptTemplate: string;
  adapterType: string;
  adapterConfig: Record<string, any>;
  instructionsPath: string | null;  // 指向 AGENTS.md 或类似的路径
  skills: SkillBundle[];
  budgetMonthlyCents: number;
  permissions: {
    canCreateAgents: boolean;
    canApproveHires: boolean;
  };
}

interface ProjectTemplate {
  name: string;
  description: string;
  workspace: {
    cwd: string | null;
    repoUrl: string | null;
  } | null;
}

interface ApprovalRule {
  trigger: string;                  // 例如 'hire_agent', 'budget_exceed'
  threshold: number | null;
  approverRole: string;
}
```

### 3.3 创建者/卖家

```typescript
interface Creator {
  id: string;
  userId: string;                   // 认证提供者 ID
  displayName: string;
  bio: string;
  avatarUrl: string | null;
  website: string | null;
  listings: string[];               // 列表 ID
  totalInstalls: number;
  totalRevenue: number;             // 赚取的分
  joinedAt: string;
  verified: boolean;
  payoutMethod: 'stripe_connect';
  stripeAccountId: string | null;
}
```

### 3.4 购买/安装

```typescript
interface Purchase {
  id: string;
  listingId: string;
  buyerUserId: string;
  buyerCompanyId: string | null;    // 目标 Paperclip 公司
  pricePaidCents: number;
  paymentIntentId: string | null;   // Stripe
  installedAt: string | null;       // 部署到公司的时间
  status: 'pending' | 'completed' | 'refunded';
  createdAt: string;
}
```

### 3.5 评论

```typescript
interface Review {
  id: string;
  listingId: string;
  authorUserId: string;
  authorDisplayName: string;
  rating: number;                   // 1–5
  title: string;
  body: string;                     // Markdown
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. 页面和路由

### 4.1 公共页面

| 路由 | 页面 | 描述 |
|------|------|------|
| `/` | 主页 | 主图、特色蓝图、热门技能、工作原理 |
| `/browse` | 市场浏览 | 所有列表的可过滤网格 |
| `/browse?type=team_blueprint` | 团队蓝图 | 过滤到团队配置 |
| `/browse?type=agent_blueprint` | 智能体蓝图 | 单智能体配置 |
| `/browse?type=skill` | 技能 | 技能列表 |
| `/browse?type=governance_template` | 治理 | 策略模板 |
| `/listings/:slug` | 列表详细信息 | 完整产品页面 |
| `/creators/:slug` | 创建者个人资料 | 简介、所有列表、统计数据 |
| `/about` | 关于 ClipHub | 使命、工作原理 |
| `/pricing` | 定价和费用 | 创建者收入分成、买家信息 |

### 4.2 认证页面

| 路由 | 页面 | 描述 |
|------|------|------|
| `/dashboard` | 买家仪表板 | 已购买项目、已安装蓝图 |
| `/dashboard/purchases` | 购买历史 | 所有交易 |
| `/dashboard/installs` | 安装 | 已部署蓝图及状态 |
| `/creator` | 创建者仪表板 | 列表管理、分析 |
| `/creator/listings/new` | 创建列表 | 多步骤列表向导 |
| `/creator/listings/:id/edit` | 编辑列表 | 修改现有列表 |
| `/creator/analytics` | 分析 | 收入、安装、查看次数 |
| `/creator/payouts` | 支付 | Stripe Connect 支付历史 |

### 4.3 API 路由

| 方法 | 端点 | 描述 |
|------|------|------|
| `GET` | `/api/listings` | 浏览列表（过滤器：类型、类别、价格范围、排序） |
| `GET` | `/api/listings/:slug` | 获取列表详细信息 |
| `POST` | `/api/listings` | 创建列表（创建者认证） |
| `PATCH` | `/api/listings/:id` | 更新列表 |
| `DELETE` | `/api/listings/:id` | 归档列表 |
| `POST` | `/api/listings/:id/purchase` | 购买列表（Stripe 结账） |
| `POST` | `/api/listings/:id/install` | 安装到 Paperclip 公司 |
| `GET` | `/api/listings/:id/reviews` | 获取评论 |
| `POST` | `/api/listings/:id/reviews` | 提交评论 |
| `GET` | `/api/creators/:slug` | 创建者个人资料 |
| `GET` | `/api/creators/me` | 当前创建者个人资料 |
| `POST` | `/api/creators` | 注册为创建者 |
| `GET` | `/api/purchases` | 买家的购买历史 |
| `GET` | `/api/analytics` | 创建者分析 |

---

## 5. 用户流程

### 5.1 买家：浏览 → 购买 → 安装

```
主页 → 浏览市场 → 按类型/类别过滤
  → 点击列表 → 阅读详细信息、评论、预览组织结构图
  → 点击"购买"→ Stripe 结账（或免费安装）
  → 购买后："安装到公司"按钮
  → 选择目标 Paperclip 公司（或创建新公司）
  → ClipHub API 调用 Paperclip API 以：
      1. 使用蓝图中的配置创建智能体
      2. 设置报告链
      3. 创建具有工作区配置的项目
      4. 应用治理规则
      5. 将技能文件部署到智能体指令路径
  → 重定向到 Paperclip 仪表板，新团队正在运行
```

### 5.2 创建者：构建 → 发布 → 赚取

```
注册为创建者 → 连接 Stripe
  → "新建列表"向导：
      步骤 1：类型（团队/智能体/技能/治理）
      步骤 2：基本信息（标题、口号、描述、类别）
      步骤 3：上传包（JSON 配置 + 技能文件 + README）
      步骤 4：预览和组织结构图可视化
      步骤 5：定价 ($0–$499)
      步骤 6：发布
  → 立即在市场上线
  → 在创建者仪表板上跟踪安装、收入、评论
```

### 5.3 创建者：从 Paperclip 导出 → 发布

```
运行的 Paperclip 公司 → "导出为蓝图"（CLI 或 UI）
  → Paperclip 导出：
      - 智能体配置（已清理——无密钥）
      - 组织结构图/报告链
      - 治理规则
      - 项目模板
      - 技能文件
  → 上传到 ClipHub 作为新列表
  → 编辑详细信息、设置价格、发布
```

---

## 6. UI 设计方向

### 6.1 视觉语言

- **调色板**：深墨水主色、温暖沙子背景、CTA 的强调色（Paperclip 品牌蓝/紫）
- **排版**：干净的无衬线字体、强大的层次结构、技术细节的等宽字体
- **卡片**：圆角、细微阴影、清晰的价格徽章
- **组织结构图视觉**：交互式树/图，显示团队蓝图中的智能体关系

### 6.2 关键设计元素

| 元素 | ClipHub |
|------|---------|
| 产品卡片 | 组织结构图迷你预览 + 智能体计数徽章 |
| 详细信息页面 | 交互式组织结构图 + 每个智能体的细分 |
| 安装流程 | 一键部署到 Paperclip 公司 |
| 社会证明 | "X 家公司正在运行此蓝图" |
| 预览 | 实时演示沙箱（扩展目标） |

### 6.3 列表卡片设计

```
┌─────────────────────────────────────┐
│  [组织结构图迷你预览]               │
│  ┌─CEO─┐                            │
│  ├─CTO─┤                            │
│  └─ENG──┘                           │
│                                     │
│  SaaS 初创团队                      │
│  "使用 5 智能体工程+营销团队           │
│   交付您的 MVP"                      │
│                                     │
│  👥 5 智能体  ⬇ 234 安装             │
│  ★ 4.7 (12 评论)                    │
│                                     │
│  作者 @masinov          $199  [购买]│
└─────────────────────────────────────┘
```

### 6.4 详细信息页面部分

1. **主图**：标题、口号、价格、安装按钮、创建者信息
2. **组织结构图**：智能体层次结构的交互式可视化
3. **智能体细分**：每个智能体的可扩展卡片——角色、能力、模型、技能
4. **治理**：审批流程、预算结构、升级链
5. **包含的项目**：具有工作区配置的项目模板
6. **README**：完整的 markdown 文档
7. **评论**：星级评分 + 书面评论
8. **相关蓝图**：交叉销售类似的团队配置
9. **创建者个人资料**：迷你简介、其他列表

---

## 7. 安装机制

### 7.1 安装 API 流程

当买家点击"安装到公司"时：

```
POST /api/listings/:id/install
{
  "targetCompanyId": "uuid",         // 现有 Paperclip 公司
  "overrides": {                      // 可选自定义
    "agentModel": "claude-sonnet-4-6", // 覆盖默认模型
    "budgetScale": 0.5,               // 缩放预算
    "skipProjects": false
  }
}
```

安装处理程序：

1. 验证买家拥有购买
2. 验证目标公司访问权限
3. 对于蓝图中的每个智能体：
   - `POST /api/companies/:id/agents`（如果 `paperclip-create-agent` 支持，或通过审批流程）
   - 设置适配器配置、提示模板、指令路径
4. 设置报告链
5. 创建项目和工作区
6. 应用治理规则
7. 将技能文件部署到配置的路径
8. 返回已创建资源的摘要

### 7.2 冲突解决

- **智能体名称冲突**：附加 `-2`、`-3` 后缀
- **项目名称冲突**：提示买家重命名或跳过
- **适配器不匹配**：如果蓝图需要本地不可用的适配器，则警告
- **模型可用性**：如果未配置所需模型，则警告

---

## 8. 收入模式

| 费用 | 金额 | 备注 |
|------|------|------|
| 创建者收入分成 | 销售价格的 90% | 减去 Stripe 处理费（~2.9% + $0.30） |
| 平台费用 | 销售价格的 10% | ClipHub 的分成 |
| 免费列表 | $0 | 免费列表无费用 |
| Stripe Connect | 标准费率 | 由 Stripe 处理 |

---

## 9. 技术架构

### 9.1 技术栈

- **前端**：Next.js（React）、Tailwind CSS、与 Paperclip 相同的 UI 框架
- **后端**：Node.js API（或扩展 Paperclip 服务器）
- **数据库**：Postgres（可以共享 Paperclip 的 DB 或单独）
- **支付**：Stripe Connect（市场模式）
- **存储**：S3/R2 用于列表包和图像
- **认证**：与 Paperclip 认证共享（或 OAuth2）

### 9.2 与 Paperclip 的集成

ClipHub 可以是：
- **选项 A**：一个单独的应用程序，调用 Paperclip 的 API 来安装蓝图
- **选项 B**：Paperclip UI 的内置部分（`/marketplace` 路由）

选项 B 对于 MVP 更简单——向现有的 Paperclip UI 和 API 添加路由。

### 9.3 包格式

列表包是 ZIP/tar 存档，包含：

```
blueprint/
├── manifest.json          # 列表元数据 + 智能体配置
├── README.md              # 文档
├── org-chart.json         # 智能体层次结构
├── governance.json        # 审批规则、预算
├── agents/
│   ├── ceo/
│   │   ├── prompt.md      # 提示模板
│   │   ├── AGENTS.md      # 指令
│   │   └── skills/        # 技能文件
│   ├── cto/
│   │   ├── prompt.md
│   │   ├── AGENTS.md
│   │   └── skills/
│   └── engineer/
│       ├── prompt.md
│       ├── AGENTS.md
│       └── skills/
└── projects/
    └── default/
        └── workspace.json  # 项目工作区配置
```

---

## 10. MVP 范围

### 阶段 1：基础
- [ ] 列表模式和 CRUD API
- [ ] 具有过滤器（类型、类别、价格）的浏览页面
- [ ] 具有组织结构图可视化的列表详细信息页面
- [ ] 创建者注册和列表创建向导
- [ ] 仅免费安装（尚无支付）
- [ ] 安装流程：蓝图 → Paperclip 公司

### 阶段 2：支付和社交
- [ ] Stripe Connect 集成
- [ ] 购买流程
- [ ] 评论系统
- [ ] 创建者分析仪表板
- [ ] "从 Paperclip 导出" CLI 命令

### 阶段 3：增长
- [ ] 具有相关性排名的搜索
- [ ] 特色/趋势列表
- [ ] 创建者验证计划
- [ ] 蓝图版本控制和更新通知
- [ ] 实时演示沙箱
- [ ] 用于编程发布的 API
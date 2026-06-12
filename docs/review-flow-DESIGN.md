# review-flow 代码审查全流程设计文档

## 1. 概述

review-flow 是一套基于 Master-Agent 模式的 AI 驱动代码审查全流程框架，覆盖从多维审查到修复交付的完整闭环。它专注于**已有代码的质量审查**，而非新功能开发。

### 核心价值

- **审查→修复闭环**：审查 → 方案确认 → 精准修复 → 验证 → 交付，审查不通过则自动进入修复循环
- **故障可恢复**：状态文件（原子写入）+ 会话统一管理，支持 crash 后恢复
- **质量分层验证**：review-flow-review 执行完整构建验证（build-verify），review-flow-fix 执行轻量编译自检
- **文件即契约**：子 agent 之间通过文件通信，review-flow 不进行字段级解析
- **人工可控**：方案确认环节强制用户决策，修复范围由用户选择，所有异常路径均有上报人工介入的逃生口

### 与 dev-flow 的区别

| 维度 | dev-flow | review-flow |
|------|----------|-------------|
| 场景 | 新功能开发（需求→编码→审查→交付） | 已有代码审查（审查→修复→交付） |
| 输入 | 功能名称 / 需求描述 | 目录/文件路径 |
| 产出 | plan.md + code.md + review.md + bugfix.md | review.md + bugfix.md + summary.md + commit-msg.txt |
| 修复循环 | dev-review → dev-bugfix → 重新审查（3轮） | review-flow-fix → 核验（3轮，不再重新全量审查） |
| 编码环节 | 有（dev-code） | 无 |
| 规划环节 | 有（dev-plan） | 无 |

---

## 2. 架构设计

### 2.1 主从代理模式（Master-Agent）

```
                         ┌──────────────────────┐
                         │   review-flow         │  ← Primary Agent（总调度）
                         │   流程编排 / 状态管理    │
                         └──┬──────────────┬────┘
                            │              │
                     ┌──────┘              └──────────┐
                     ▼                                ▼
             ┌──────────────────┐           ┌─────────────────┐
             │review-flow-review│           │ review-flow-fix  │
             │   代码审查专家     │           │  调试与修复专家   │
             │   只读 + 验证     │           │   读写 + 编译自检  │
             │   subagent       │           │   subagent       │
             └──────────────────┘           └─────────────────┘
```

### 2.2 组件角色矩阵

| 组件 | 模式 | 读写 | Bash | 温度 | 职责 |
|------|------|------|------|------|------|
| **review-flow** | primary | 读写 | 完整 | 0.1 | 流程总调度，状态管理，subagent 编排，交付汇总 |
| **review-flow-review** | subagent | 只读 | 完整 | 0.1 | 多维代码审查（架构/安全/质量等），生成分级问题清单+修复方案+验证清单 |
| **review-flow-fix** | subagent | 读写 | 受限 | 0.1 | 按修复方案实施最小化修复，编译自检，更新验证清单 |

### 2.3 核心设计原则

1. **文件即契约**：子 agent 的输出格式在其定义文件中约定，review-flow 仅做摘要提取和核验，不进行字段级解析
2. **修改只影响一点**：如需调整输出字段，只需修改对应子 agent 的定义文件，不影响 review-flow 主控逻辑
3. **幂等性**：每个步骤可重复执行，状态文件确保流程连续性
4. **最小权限**：review-flow-review 为只读（write: false, edit: false），不修改任何源码
5. **最小化修复**：review-flow-fix 只修复选定的问题，不重构无关代码，不引入新功能
6. **人工兜底**：方案确认/修复范围选择由用户决策，所有自动化路径均有上报人工介入的逃生口
7. **状态持久化**：JSON 状态文件全部采用 tmp + rename 原子写入，防止 crash 后文件损坏

---

## 3. 工作流详解

### 3.1 完整流程

```
用户触发 /review-flow
   │
   ▼
┌──────────────────────────────────────────────────────────┐
│ 初始化                                                    │
│  • 生成 SESSION_ID（时间戳格式：YYYYmmdd_HHMMSS）          │
│  • 设置 $DOC_PATH = ./review-flow/$SESSION_ID             │
│  • 创建输出目录                                            │
│  • 询问用户并确定审查目录/文件路径，写入 targets.md          │
│  • 原子创建 .flow-state.json（{iteration:0, status:"reviewing"}）│
│  • 校验状态文件 JSON 完整性                                 │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│ 阶段1：代码审查与修复方案                                    │
│  • 调用 @review-flow-review                               │
│  • 结果写入 review.md（含问题清单 + 修复方案 + 验证清单）    │
│  • 更新状态：reviewed                                      │
│                                                          │
│ ┌── 方案确认循环（最多 5 轮） ──────────────────────────┐  │
│ │  • 展示摘要：审查范围 / 代码优点 / 问题清单 / 修复方案   │  │
│ │  • 用户选择：批准 / 修改 / 终止                        │  │
│ │    ├── 批准 → status: "plan-confirmed"                 │  │
│ │    ├── 修改 → status: "plan-revising" → 重新审查（≤5轮）│  │
│ │    └── 终止 → status: "cancelled"，终止流程            │  │
│ └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│ 阶段2：修复实施与验证（最多 3 轮）                           │
│  • 初始化 $FIX_ITERATION = 0                              │
│                                                          │
│ ┌── 2.1 确定修复范围 ──────────────────────────────────┐  │
│ │  • 展示问题清单（ID / 级别 / 描述）                     │  │
│ │  • 用户选择：按编号 / 按级别 / 全部 / 仅输出报告        │  │
│ │  • 记录 $SELECTED_ISSUES                               │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌── 2.2 执行修复 ──────────────────────────────────────┐  │
│ │  • 调用 @review-flow-fix（传入待修复问题集）            │  │
│ │  • 结果写入 bugfix.md                                  │  │
│ │  • 更新状态：fixed（iteration = $FIX_ITERATION）        │  │
│ └──────────────────────────────────────────────────────┘  │
│                                                          │
│ ┌── 2.3 核验与循环判定 ────────────────────────────────┐  │
│ │  • 修复状态：无法修复 → status: "failed"，终止          │  │
│ │  • 对照 $SELECTED_ISSUES 与已修复 ID 列表，记录遗漏项   │  │
│ │  • 检查编译自检结果                                     │  │
│ │  • 检查验证清单中 - [ ] 是否全变为 - [x]                │  │
│ │  • 全部通过 → status: "verified"，进入阶段3            │  │
│ │  • 存在失败 & iteration < 2 → iteration+1, 重新修复     │  │
│ │  • 存在失败 & iteration >= 2 → status: "failed"，终止   │  │
│ └──────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│ 阶段3：交付成果                                           │
│  • 执行验证清单终检（全部 - [x]？）                        │
│  • 生成 summary.md（审查概览 + 验证结果）                  │
│  • 生成 commit-msg.txt（问题来源/原因/修改说明/测试建议）    │
│  • 更新状态：delivered                                    │
│  • 提示用户可通过 @git-autocommit 提交                    │
└──────────────────────────────────────────────────────────┘
```

### 3.2 状态机

```
                    ┌──────────────────┐
                    │  reviewing (0)    │ ← 初始化
                    └────────┬─────────┘
                             │ review-flow-review 完成
                             ▼
                    ┌──────────────────┐
                    │   reviewed        │
                    └────────┬─────────┘
                             │ 阶段1 方案确认
                             │
                  ┌──────────┼────────────┐
                  ▼          ▼            ▼
           ┌──────────┐ ┌──────────┐ ┌──────────┐
           │plan-conf.│ │plan-rev. │ │cancelled │
           │ 批准      │ │ 修改     │ │ 终止      │
           └────┬─────┘ └────┬─────┘ └──────────┘
                │            │
                │            └──→ 回退 reviewed
                ▼
           ┌──────────────────┐
           │ plan-confirmed   │
           └────────┬─────────┘
                    │ 阶段2 选择修复范围 + review-flow-fix
                    ▼
           ┌──────────────────┐
           │   fixed (N)      │ ← N = 0, 1, 2
           └──┬───────────────┘
              │ 核验
    ┌─────────┴─────────┐
    ▼                   ▼
┌──────────────┐   ┌──────────────┐
│  verified    │   │fix-retrying(N)│ ← N < 2，重新修复
└──────┬───────┘   └──────┬───────┘
       │                  │ N >= 2 ?
       ▼                  ├── 否 → fixed(N+1)
┌──────────────┐          └── 是 → failed
│  delivered   │
└──────────────┘
```

### 3.3 状态说明

| 状态 | 说明 | 触发条件 |
|------|------|---------|
| `reviewing` | 初始化完成，审查中 | review-flow 启动 |
| `reviewed` | 审查完成，等待方案确认 | review-flow-review 返回 |
| `plan-confirmed` | 用户批准审查结果 | 阶段1 用户选择批准 |
| `plan-revising` | 用户要求修改审查结果 | 阶段1 用户选择修改 |
| `cancelled` | 用户终止流程 | 阶段1 用户选择终止 |
| `fixed` | 修复完成（iteration=N） | review-flow-fix 返回 |
| `fix-retrying` | 修复核验失败，重试中 | 核验未通过且 iteration < 2 |
| `verified` | 修复核验通过 | 核验全部通过 |
| `delivered` | 交付完成 | 阶段3 完成 |
| `failed` | 超限终止（iteration≥2） | 修复循环超限或无法修复 |

---

## 4. 各 Agent 详述

### 4.1 review-flow（总调度）

| 属性 | 值 |
|------|-----|
| 模式 | primary agent |
| 温度 | 0.1 |
| 权限 | 读写 + bash（完整）+ webfetch |
| 关键配置 | bash: "*" allow |

**职责**：
1. 启动时初始化会话 ID、输出目录、状态文件，校验完整性
2. 与用户交互确定审查目标，写入 targets.md
3. 编排 review-flow-review → 方案确认循环（≤5轮）→ review-flow-fix → 核验循环（≤3轮）→ 交付
4. 管理修复循环计数（iteration），超限上报
5. 方案确认环节从 review.md 提取摘要展示给用户
6. 核验环节从 bugfix.md 提取关键字段进行验证判定
7. 交付前生成 summary.md 和 commit-msg.txt

**文件通信协议**：

| 步骤 | 子 agent | 输出文件 | 写入策略 | 输入文件 |
|------|---------|---------|---------|---------|
| 审查 | review-flow-review | review.md | 覆盖 | targets.md |
| 修复 | review-flow-fix | bugfix.md | 覆盖 | review.md |

每次调用子 agent，必须将 $DOC_PATH 的实际值传入 prompt。输入文件由子 agent 自行读取，不通过上下文模板传递。

**调用规范**：review-flow 仅传递 $DOC_PATH 和筛选条件（如待修复问题 ID 集合），**禁止传递字段级上下文**。

### 4.2 review-flow-review（审查专家）

| 属性 | 值 |
|------|-----|
| 模式 | subagent |
| 温度 | 0.1 |
| 权限 | 只读 + bash（完整） |
| 关键配置 | write: false, edit: false, bash: "*" allow |

**流程**：

| 步骤 | 内容 | 依赖 Skill |
|------|------|-----------|
| **步骤1** | 读取 targets.md → 读取源码 → 加载 language-detect → 加载编码规范 | language-detect, *-coding-standards |
| **步骤2** | 多维度审查（架构→错误处理→安全→资源→质量→测试覆盖）+ 语言特定规范审查 | *-coding-standards |
| **步骤3** | 加载 build-verify 执行构建验证 + 类型检查 + Linter，生成验证清单 | build-verify |

**审查维度**（按优先级顺序）：

| 优先级 | 审查维度 | 检查要点 |
|--------|----------|----------|
| P0 | 架构设计 | 模块职责是否单一、耦合度是否合理、分层是否清晰 |
| P1 | 错误处理 | 异常是否被正确捕获/传播、错误信息是否清晰、是否有 panic 风险 |
| P2 | 安全性 | SQL注入/XSS/CSRF防护、敏感信息硬编码、权限校验缺失 |
| P3 | 资源管理 | 内存/连接池/文件句柄是否正确释放、是否有资源泄漏风险 |
| P4 | 代码质量 | 命名规范、重复代码、魔法数字、函数长度、注释质量 |
| P5 | 测试覆盖 | 边界条件测试、异常路径测试、核心逻辑测试覆盖率 |

**问题分级标准**：

| 级别 | 标准 | 示例 | ID 格式 |
|------|------|------|---------|
| Critical | 导致程序崩溃/数据丢失/资源泄漏 | 协程泄露、配置错误忽略 | C-001 |
| Major | 影响功能正确性或性能 | 错误处理不完整、超时过长 | M-001 |
| Minor | 代码风格/可维护性问题 | 命名不规范、魔法数字 | m-001 |
| Potential | 潜在风险 | 数据竞争、内存泄漏风险 | P-001 |

**输出格式**（固定模板）：
1. 审查状态（通过/不通过）
2. 审查范围（语言/框架、文件数、审查类型）
3. 代码优点
4. 问题清单（每个问题含 ID/级别/描述/位置/影响/当前代码/修复方案）
5. 验证清单（带 `- [ ]` / `- [x]` 标记）
6. 已加载编码规范

**约束**：
- 必须先读取源代码再进行审查
- 问题必须按分级标准分配级别和唯一 ID
- 每个问题必须包含修复前后的代码对比
- 验证清单必须基于实际 build-verify 结果生成，不可凭空填写

### 4.3 review-flow-fix（修复专家）

| 属性 | 值 |
|------|-----|
| 模式 | subagent |
| 温度 | 0.1 |
| 权限 | 读写 + bash（受限） |
| 关键配置 | edit: allow, bash 仅允许构建/Linter/git 追溯/格式化类命令 |

**bash 权限白名单**：

```
npm run / npm test / npx / python / python3 / pytest
go build / go test / go vet / gofmt
black / cmake / make / gcc / g++ / clang / clang-format
qmake / jom / msbuild
git log / git blame / git diff / git show / git status
eslint / npx eslint / flake8 / pylint / golint / clang-tidy / cpplint
```

**流程**：

| 步骤 | 内容 |
|------|------|
| **步骤1** | 读取 review.md（问题清单 + 验证清单），提取语言/框架信息，加载对应编码规范 |
| **步骤2** | 对每个待修复问题：读取文件上下文 → 按修复方案实施 → 只改必要代码 → 记录修改 |
| **步骤3** | 编译自检（build-verify），不通过则返回步骤2 |
| **步骤4** | 回归验证，确认原问题已修复 |
| **步骤5** | 更新 review.md 验证清单中已通过的检查项 `- [ ]` → `- [x]` |

**编译自检 vs 完整验证**：

| 维度 | review-flow-fix 步骤3（编译自检） | review-flow-review 步骤3（完整验证） |
|------|----------------------------------|-------------------------------------|
| 构建验证 | ✅ 快速编译确认 | ✅ 完整 Debug 构建 |
| 格式检查 | ❌ 不执行 | ✅ 执行 |
| Linter | ❌ 不执行 | ✅ 执行 |
| 类型检查 | ❌ 不执行 | ✅ 强制 |
| 代码审查 | ❌ 不执行 | ✅ 完整审查 |
| 意图 | 快速反馈修复没破坏编译 | 全面的质量关卡 |

**输出格式**（固定模板）：
1. 修复状态（已修复/部分修复/无法修复）
2. 已修复问题（每个含修复说明）
3. 未修复问题（每个含原因）
4. 修改内容（每个文件含修复说明）
5. 验证结果（编译自检 + 验证清单执行结果）
6. 修改文件列表
7. 已加载编码规范

**约束**：
- 每次修改后必须执行编译自检
- 修复后必须更新 review.md 验证清单
- 如修复引入新问题必须回退并尝试替代方案

---

## 5. 数据流

### 5.1 文件通信架构

```
review-flow/$SESSION_ID/
├── .flow-state.json    ← 全流程状态（review-flow 读写，原子写入）
├── targets.md          ← 审查目标路径清单（review-flow 写入）
├── review.md           ← 审查报告（review-flow-review 输出）
├── bugfix.md           ← 修复报告（review-flow-fix 输出）
├── summary.md          ← 交付汇总（review-flow 写入）
└── commit-msg.txt      ← 提交信息模板（review-flow 写入）
```

### 5.2 上下文传递链

```
阶段1: review-flow ──→ review-flow-review
          │                    │
          │  $DOC_PATH          │  自行读取 targets.md
          │                    │  输出 review.md
          ▼                    ▼
        review.md  ←──────────┘
          │
          │（review-flow 提取摘要展示给用户）
          ▼
阶段2: review-flow ──→ review-flow-fix
          │                    │
          │  $DOC_PATH          │  自行读取 review.md
          │  待修复问题 ID       │  输出 bugfix.md
          │                    │  更新 review.md 验证清单
          ▼                    ▼
        bugfix.md ←──────────┘
          │
          │（review-flow 提取关键字段核验）
          ▼
阶段3: review-flow 生成 summary.md + commit-msg.txt
```

### 5.3 状态文件格式

```json
{
  "iteration": 0,
  "status": "reviewing"
}
```

- `iteration`：修复循环计数（0, 1, 2），仅在阶段2核验循环中递增
- `status`：当前流程状态

---

## 6. 错误处理与恢复

### 6.1 子 agent 调用重试

```
subagent 调用失败
      │
      ▼
询问用户：是否重试（剩余 N 次）或终止
   ├── 是 → 重新调用 subagent
   └── 否 → 终止流程
      │
      ▼
重试 2 次均失败 → 上报「多次重试失败，请人工介入」
```

- **重试上限**：每次 subagent 调用最多重试 2 次
- **重试不计数到 iteration**（重试和修复循环是两个独立维度）

### 6.2 方案确认循环

```
用户不满意审查结果
      │
      ▼
plan-revising（允许最多 5 轮）
      │
      ├── 轮数 < 5 → 收集修改意见 → 重新调用 review-flow-review → 回到确认步骤
      │
      └── 轮数 >= 5 → 终止流程，提示「请人工介入」
```

### 6.3 修复循环

```
修复核验失败
      │
      ▼
检查 iteration（从 .flow-state.json 读取）
      │
      ├── iteration < 2 → iteration += 1
      │   → status: "fix-retrying"
      │   → 展示失败项（仅通知，不要求用户确认）
      │   → 确定新一轮待修复问题集（遗漏项/验证失败项/本轮全量）
      │   → 调用 review-flow-fix 重新修复
      │
      └── iteration >= 2 → status: "failed"
                          → 展示失败项 + 修改文件列表 + 手动回滚命令
                          → 上报「多次修复未通过，请人工介入」
```

- **修复循环上限**：3 轮（iteration = 0, 1, 2）
- **未超限时自动重试**：无需用户确认
- **超限后保留工作区代码**，提示手动回滚命令

### 6.4 崩溃恢复

- **状态文件原子写入**：所有 `.flow-state.json` 更新采用 `write.tmp → mv` 模式，防止 crash 后半写文件
- **启动时校验**：
  - 文件损坏无法解析 → 报错「状态文件损坏，请人工介入」并终止
  - 文件存在且有效 → 检查 status 是否为 `delivered`：
    - 是 `delivered` → 按新流程执行（上一次已完成）
    - 不是 `delivered` → 报错「上次流程未完成（status: XXX），请先清理目录后重试」并终止
  - 文件不存在 → 按新流程执行

---

## 7. 状态文件生命周期

```
初始化    → { iteration: 0, status: "reviewing" }
审查完成  → { iteration: 0, status: "reviewed" }
方案确认  → { iteration: 0, status: "plan-confirmed" }
方案修改  → { iteration: 0, status: "plan-revising" }
方案终止  → { iteration: 0, status: "cancelled" }
修复完成  → { iteration: N, status: "fixed" }
修复重试  → { iteration: N, status: "fix-retrying" }
验证通过  → { iteration: N, status: "verified" }
交付完成  → { iteration: N, status: "delivered" }
超限终止  → { iteration: N, status: "failed" }
```

所有写入均采用 tmp + rename 原子模式。

---

## 8. 目录结构

```
.opencode/agents/review-flow/
├── review-flow.md           ← 总调度 agent（primary）
├── review-flow-review.md    ← 审查专家 agent（subagent，只读）
└── review-flow-fix.md       ← 修复专家 agent（subagent，读写）

依赖的 Skills：
.opencode/skills/
├── build-verify/            ← 构建验证（被两个子 agent 引用）
├── language-detect/         ← 语言探测（被 review-flow-review 引用）
├── *-coding-standards/      ← 各语言编码规范（按需加载）

运行产物（项目根目录）：
review-flow/
└── $SESSION_ID/
    ├── .flow-state.json
    ├── targets.md
    ├── review.md
    ├── bugfix.md
    ├── summary.md
    └── commit-msg.txt
```

---

## 9. 关键约束

1. **方案确认是强制环节** — 未经用户确认不得进入修复阶段
2. **修复范围由用户选择** — 用户可选择按编号/按级别/全部修复/仅输出报告
3. **最小化修复原则** — review-flow-fix 只改必要代码，不重构无关代码，不引入新功能
4. **修复后必须编译自检** — 不通过则回退重试
5. **修复循环最多 3 轮** — 超限上报人工介入
6. **方案确认最多 5 轮** — 超限上报人工介入
7. **状态文件原子写入** — 所有 JSON 写入采用 tmp + rename 模式
8. **不自动提交代码** — 提交信息仅保存到 commit-msg.txt，由用户决定提交时机
9. **审查只读** — review-flow-review 没有 write/edit 权限
10. **编码规范按需加载** — 子 agent 通过 language-detect 探测语言后加载对应规范

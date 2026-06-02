# coding-dev 开发流程设计文档

## 1. 概述

coding-dev 是一套 AI 驱动的自动化开发流程框架，基于 opencode 的 agent 和 command 机制构建。它模拟了软件工程中的完整开发生命周期：需求分析 → 架构设计 → 编码 → 审查 → 修复 → 交付。

### 核心价值

- **全流程自动化**：从需求到代码提交，减少人工介入环节
- **故障可恢复**：通过状态文件和 git stash 机制，支持 crash 后恢复
- **质量闭环**：审查不通过自动修复循环，超限自动回滚
- **前置探索可选**：支持 brainstorm 深度需求探索，产出可直接导入开发流程

---

## 2. 架构设计

### 2.1 主从代理模式（Master-Agent）

```
                      ┌──────────────────┐
                      │   /coding-dev     │  ← 入口命令
                      │   参数解析/校验    │
                      └────────┬─────────┘
                               │ 调用
                               ▼
                      ┌──────────────────┐
                      │   dev-master      │  ← 总调度（primary agent）
                      │   流程编排/状态管理 │
                      └──┬───┬───┬───┬───┘
                         │   │   │   │
                  ┌──────┘   │   │   └──────────┐
                  ▼          ▼   ▼              ▼
          ┌──────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
          │ dev-plan │ │dev-code│ │dev-rev.│ │dev-bugfix│
          │ 只读规划  │ │ 编码    │ │ 审查    │ │ 修复     │
          │subagent  │ │subagent│ │subagent│ │subagent  │
          └──────────┘ └────────┘ └────────┘ └──────────┘
                               │
                               ▼
                        ┌──────────────┐
                        │git-autocommit│  ← 独立命令
                        │   自动提交    │
                        └──────────────┘
```

### 2.2 组件角色矩阵

| 组件 | 模式 | 读写权限 | 职责 |
|------|------|----------|------|
| `/coding-dev` | command | 只读 | 入口命令，解析参数，启动 dev-master |
| `dev-master` | primary agent | 读写 | 流程总调度，状态管理，上下文传递 |
| `dev-plan` | subagent | 只读 | 需求分析，技术选型，架构设计，任务拆分 |
| `dev-code` | subagent | 读写 | 按计划编写代码，语法自检，依赖安装 |
| `dev-review` | subagent | 只读 | 代码审查，构建验证，测试执行 |
| `dev-bugfix` | subagent | 读写 | BUG 定位与修复，格式化修复，回归验证 |
| `git-autocommit` | command | 读写(git) | 分析变更，生成提交信息，执行提交 |
| `coding-brainstorm` | command | 只写(brainstorm.md) | 深度需求探索，技术选型对比，风险评估 |

### 2.3 文件依赖关系

```
.coding-dev-state.json  ← 全流程状态，被 dev-master 读写
      │
      ├─ plan.md          ← dev-plan 的输出，被 dev-master 读取
      ├─ code.md           ← dev-code 的输出，被 dev-master 读取
      ├─ review.md         ← dev-review 的输出，被 dev-master & dev-bugfix 读取
      ├─ bugfix.md         ← dev-bugfix 的输出，被 dev-master 读取
      ├─ brainstorm.md     ← coding-brainstorm 的输出，可被 dev-master 读取（可选）
      ├─ brainstorm-context.json ← dev-master 从 brainstorm.md 提取的结构化数据
      ├─ before_files.txt  ← subagent 调用前的文件快照
      ├─ after_files.txt   ← subagent 调用后的文件快照
      ├─ modified_files.txt← dev-master 比对 before/after 得出的变更清单
      └─ errors.log        ← 重试失败的错误日志
```

---

## 3. 工作流详解

### 3.1 完整流程

```
用户输入
   │
   ▼
┌─────────────────────────────────────────────────────┐
│ 初始化                                               │
│  • 提取 FEATURE_NAME                                 │
│  • 可选：读取 brainstorm.md 植入上下文                │
│  • 创建 .coding-dev-state.json（iteration=0）         │
│  • 校验状态文件完整性                                 │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步骤1：探索需求 → dev-plan                           │
│  • 构建 prompt（含 brainstorm 上下文或原始需求）      │
│  • 调用 dev-plan（只读，不修改文件）                  │
│  • 结果写入 plan.md                                  │
│  • 提取：技术方案 / 任务清单 / 依赖关系 / 实现方案    │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步骤1.2：计划确认（新增）                             │
│  • 展示摘要：技术选型 / 文件结构 / 任务清单          │
│              / 功能实现方案 / 风险约束                │
│  • 询问用户：确认 / 修改 / 终止                      │
│  ┌──── 确认 ──► status: "plan-confirmed" → 步骤1.5  │
│  ├──── 修改 ──► 回退到 dev-plan 修正                 │
│  └──── 终止 ──► status: "cancelled"                  │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步骤1.5：保存基线                                    │
│  • git stash push -u -m "coding-dev-$FEATURE-before" │
│  • 记录 stash@{N} 引用                               │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步骤2：分批编码 → dev-code（多批，按依赖分层）        │
│  • 解析依赖图：Level-0 → Level-1 → ... → Level-N     │
│  • 每批调用前后记录 git diff --name-only              │
│  • 按 Level 顺序调用 dev-code                        │
│  • 结果写入 code.md                                  │
│  • 提取：生成的文件路径列表                           │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步骤3：审查测试 → dev-review                         │
│  • 传入代码文件路径列表                               │
│  • 调用 dev-review（只读，执行构建+测试）             │
│  • 结果写入 review.md                                │
│  • 输出：审查状态（通过/不通过）+ 问题清单            │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步骤4：判断结果                                      │
│                                                      │
│  ┌──── iteration >= 3? ──── 是 ──► 回滚（stash apply）│
│  │                               上报人工介入          │
│  └──── 否 ──► 审查通过？                              │
│                  │                                    │
│            ┌─────┴─────┐                             │
│            ▼            ▼                             │
│        通过(→步骤5)  不通过                            │
│                       │                               │
│                       ▼                               │
│            调用 dev-bugfix                            │
│            • 记录 before_files.txt                    │
│            • 调用 dev-bugfix 修复                     │
│            • 记录 after_files.txt → modified_files    │
│            • iteration += 1                           │
│            • 回退到步骤3（最多 3 轮）                   │
└─────────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步骤5：交付成果                                       │
│  • 更新状态 → "delivering"                           │
│  • git stash drop 清理基线                            │
│  • 调用 git-autocommit 提交代码                       │
│  • 更新状态 → "delivered"                            │
└─────────────────────────────────────────────────────┘
```

### 3.2 状态机

```
                 ┌──────────────────┐
                 │    planning (0)   │ ← 初始化
                 └────────┬─────────┘
                          │ dev-plan 完成
                          ▼
                 ┌──────────────────┐
                 │    planned       │
                 └────────┬─────────┘
                          │ 步骤1.2 用户确认
                          │
               ┌──────────┼────────────┐
               ▼          ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │plan-conf.│ │plan-rev.│ │cancelled │
        │ 确认通过  │ │ 要求修改  │ │ 用户终止  │
        └────┬─────┘ └────┬─────┘ └──────────┘
             │            │
             │            └──→ 回退 planning
             ▼
        ┌──────────────────┐
        │ plan-confirmed   │
        └────────┬─────────┘
                 │ dev-code 完成
                          ▼
                 ┌──────────────────┐
                 │     coded        │
                 └────────┬─────────┘
                          │ dev-review 完成
                          ▼
                 ┌──────────────────┐
                 │    reviewed      │
                 └──┬───────────────┘
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
   ┌──────────────┐   ┌──────────────┐
   │  delivering  │   │  bugfixing   │ ← iteration+1
   └──────┬───────┘   └──────┬───────┘
          │                  │ 回退到 review
          ▼                  ▼
   ┌──────────────┐   ┌──────────────┐
   │  delivered   │   │  reviewed    │
   └──────────────┘   └──────┬───────┘
                             │ iteration >= 3 ?
                             ├── 否 → bugfixing
                             └── 是 → rolled-back
```

---

## 3.3 轻量 Bug 修复流程（coding-bugfix，新增）

```
用户输入 /coding-bugfix "登录报 500 错误"
   │
   ▼
┌─────────────────────────────────────────────────────┐
│ 初始化                                               │
│  • 提取问题描述                                      │
│  • 生成 BUGFIX_ID = bugfix-login500failed           │
│  • 创建状态文件                                      │
│    coding-bugfix/bugfix-login500failed/             │
│    .coding-dev-state.json                           │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步骤 1：问题分析（只读）                               │
│  • 内联分析逻辑（不依赖 subagent）                   │
│  • 要求：只分析不修改，输出根因 + 修复方案            │
│  • 结果写入 analysis.md                              │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步骤 2：修复方案确认（循环，上限 5 轮）                   │
│  • 展示：根因分析 + 修复方案 + 影响评估              │
│  • 用户反馈：                                        │
│    ├── 确认 → 进入步骤 3                              │
│    ├── 修改 → 重新分析（循环计数 +1）                 │
│    └── 终止 → status: "cancelled"                    │
│  • 5 轮超限 → 终止并上报人工介入                       │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步骤 3：执行修复                                       │
│  • 内联修复逻辑（不依赖 subagent）                   │
│  • 要求：按确认方案修改代码                          │
│  • 强制验证（参照 @auto-verify-code 策略）：           │
│    - 构建验证（npm run build / go build / ...）     │
│    - 类型检查（tsc --noEmit / mypy）                │
│    - Linter 检查（eslint / flake8 / go vet）        │
│  • 结果写入 fix-result.md                            │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步骤 4：提交                                           │
│  • 调用 @git-autocommit                               │
│  • 传入：修改文件列表 + 排除 coding-dev/              │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ 步骤 5：完成                                           │
│  • 更新状态 → "delivered"                            │
│  • 汇总交付成果                                      │
└─────────────────────────────────────────────────────┘
```

### 3.3.1 Bugfix 状态机

```
                 ┌──────────────────┐
                 │   analyzing      │ ← 初始化
                 └────────┬─────────┘
                          │ 分析完成
                          ▼
                 ┌──────────────────┐
                 │    analyzed      │
                 └────────┬─────────┘
                          │ 步骤 2 用户确认
                          │
               ┌──────────┼────────────┐
               ▼          ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │plan-conf.│ │plan-rev.│ │cancelled │
        │ 确认通过  │ │ 要求修改  │ │ 用户终止  │
        └────┬─────┘ └────┬─────┘ └──────────┘
             │            │
             │            └──→ 回退 analyzed
             ▼
        ┌──────────────────┐
        │ plan-confirmed   │
        └────────┬─────────┘
                 │ 执行修复
                 ▼
        ┌──────────────────┐
        │     fixing       │
        └────────┬─────────┘
                 │ 修复完成
                 ▼
        ┌──────────────────┐
        │   delivered      │
        └──────────────────┘
```

### 3.3.2 与全流程开发的核心差异

| 维度 | dev-master（全流程） | coding-bugfix/bugfix-master（轻量） |
|------|---------------------|-----------------------------------|
| 适用场景 | 从零开发新功能 | 已有功能的 bug 修复 |
| 流程步骤 | 规划→确认→分批编码→审查→修复循环→交付 | 分析→方案确认→修复→交付 |
| 是否有 dev-plan | 是 | **否** |
| 是否有分批 dev-code | 是 | **否** |
| 是否有 dev-review | 是 | **否**（内联构建/类型/Linter 验证） |
| 验证方式 | dev-review 独立审查 | **内联自检**（构建 + 类型+Linter+ 功能） |
| 方案确认上限 | 3 轮 | **5 轮**（修复方案迭代更频繁） |
| git stash 基线 | 是 | **否**（增量修改无需回滚） |
| 状态文件前缀 | `$FEATURE_NAME` | `bugfix-$BUGFIX_ID` |
| 入口命令 | `/coding-dev` | `/coding-bugfix` |
| subagent 依赖 | dev-plan/dev-code/dev-review/dev-bugfix | **无**（所有逻辑内联） |

---

## 4. 数据流

### 4.1 上下文传递链

```
Step1: dev-master ──→ dev-plan
         │                    │
         │  • 原始用户需求      │
         │  • brainstorm决策   │
         │  • 风险清单         │
         │                    ▼
         │              输出 plan.md
         │                    │
         ▼────────────────────┘
         │
Step2: dev-master ──→ dev-code（按批次）
         │                    │
         │  • 语言/框架        │
         │  • 编码规范         │
         │  • 架构方案         │
         │  • 批次任务清单     │
         │  • 前置依赖文件     │
         │                    ▼
         │              输出 code.md
         │                    │
         ▼────────────────────┘
         │
Step3: dev-master ──→ dev-review
         │                    │
         │  • 代码文件路径     │
         │  • 实现功能摘要     │
         │                    ▼
         │              输出 review.md
         │                    │
         ▼────────────────────┘
         │
Step4: dev-master ──→ dev-bugfix（按需）
         │                    │
         │  • 问题清单         │
         │  • 涉及文件路径     │
         │  • 报错信息         │
         │  • 历史审查结果     │
         │                    ▼
         │              输出 bugfix.md
         │                    │
         ▼────────────────────┘
         │
Step5: dev-master ──→ git-autocommit
                      │
                      │  • 修改文件列表
                      │  • 排除目录
                      ▼
                 输出 git commit
```

### 4.2 文件变更追踪

```
subagent 调用前                   subagent 调用后
      │                                │
      ▼                                ▼
git diff --name-only           git diff --name-only
      │                                │
      ▼                                ▼
before_files.txt               after_files.txt
      │                                │
      └──────────┬─────────────────────┘
                 ▼
          comm -13 before after
                 │
                 ▼
          modified_files.txt  ← 用于重试回滚
```

---

## 5. 错误处理与恢复

### 5.1 重试机制

```
subagent 调用失败
      │
      ▼
记录错误到 errors.log
      │
      ▼
询问用户：是否重试（剩余 N 次）？
   ├── 是 → git checkout modified_files 回退 → 重试
   └── 否 → 终止流程
      │
      ▼
重试 2 次均失败 → 上报「多次重试失败，请人工介入」
```

### 5.2 修复循环

```
dev-review 不通过
      │
      ▼
iteration += 1
      │
      ├── iteration < 3 → dev-bugfix → 回退到步骤3
      │
      └── iteration >= 3 → git stash apply 回滚
                          → 更新状态 rolled-back
                          → 上报人工介入
```

### 5.3 崩溃恢复

- **状态文件原子写入**：所有 `.coding-dev-state.json` 的写入均采用 `write.tmp → mv` 模式，即使写入过程中 crash，也不会留下半写文件
- **启动时校验**：dev-master 启动时检查状态文件 JSON 完整性，损坏则报错，不存在则初始化
- **git stash 基线**：编码开始前的完整工作区快照，用于回滚时精确恢复

---

## 6. 使用指南

### 6.1 基础使用

```bash
# 启动全流程开发（需求由用户提供）
/coding-dev 用户登录

# 启动全流程开发（附带 brainstorm 前置探索）
/coding-dev 用户登录 coding-dev/用户登录/brainstorm.md
```

### 6.2 前置探索（可选）

```bash
# 先做深度需求探索
/coding-brainstorm 用户登录 用户认证与权限管理系统

# 输出到 coding-dev/用户登录/brainstorm.md
# 再启动开发流程，自动载入探索结果
/coding-dev 用户登录 coding-dev/用户登录/brainstorm.md
```

### 6.3 手动验证

```bash
# 代码修改后手动触发快速验证
/coding-verify
```

---

## 7. 目录结构

```
.opencode/
├── agents/
│   ├── coding-dev/                      ← 全流程开发
│   │   ├── DESIGN.md                    ← 本文件
│   │   ├── dev-master.md                ← 总调度 agent
│   │   ├── dev-plan.md                  ← 需求规划 agent
│   │   ├── dev-code.md                  ← 编码 agent
│   │   ├── dev-review.md                ← 审查 agent
│   │   └── dev-bugfix.md                ← 修复 agent（被 dev-master 调用）
│   │
│   └── coding-bugfix/                   ← 轻量 bug 修复（独立）
│       ├── DESIGN.md                    ← bugfix 设计文档
│       └── bugfix-master.md             ← 独立 primary agent（内联所有逻辑）
│
└── commands/
    ├── coding-dev/
    │   ├── coding-dev.md                ← 启动命令
    │   ├── coding-brainstorm.md         ← 前置探索命令
    │   └── coding-verify.md             ← 快速验证命令
    │
    ├── coding-bugfix/
    │   └── coding-bugfix.md             ← 轻量 bug 修复入口命令
    │
    └── git/
        └── git-autocommit.md            ← 自动提交命令

运行时产物（项目根目录）：
coding-dev/                              ← 全流程开发产物
└── $FEATURE_NAME/
    ├── .coding-dev-state.json
    ├── plan.md
    ├── code.md
    ├── review.md
    ├── bugfix.md
    ├── brainstorm.md                    ← 可选
    ├── brainstorm-context.json
    ├── before_files.txt
    ├── after_files.txt
    ├── modified_files.txt
    └── errors.log

coding-bugfix/                           ← 轻量 bug 修复产物
└── bugfix-$BUGFIX_ID/
    ├── .coding-dev-state.json
    ├── analysis.md
    ├── fix-result.md
    └── errors.log                       ← 可选
```

---

## 8. 设计原则

1. **幂等性**：每个步骤可重复执行，状态文件确保流程连续性
2. **最小权限**：只读 agent（dev-plan, dev-review）没有 write/edit 权限
3. **精确回滚**：基于 git diff 的精确文件追踪，避免误回滚
4. **人工兜底**：所有自动化路径都有上报人工介入的逃生口
5. **渐进交付**：编码按依赖分批，前一批不完成不启动下一批
6. **状态持久化**：JSON 状态文件 + git stash 基线双重保障

# bugfix-flow 方案设计文档

## 1. 概述

bugfix-flow 是一个**独立、内联**的 Bug 修复 Agent，基于 opencode primary agent 机制构建。它不依赖任何外部 subagent，完整闭环地完成"问题分析 → 方案确认 → 执行修复 → 编译验证 → 生成提交信息 → 总结交付"全流程。

### 1.1 设计目标

- **独立闭环**：不依赖任何 subagent，所有逻辑内联在单一 agent 中
- **轻量高效**：快速响应 Bug，减少不必要的流程环节
- **状态可恢复**：通过 `.flow-state.json` 状态文件支持中断后恢复
- **人工兜底**：所有自动化路径都有上报人工介入的逃生口

### 1.2 与 coding-bugfix 的差异

| 维度 | coding-bugfix | bugfix-flow |
|------|---------------|-------------|
| 定位 | 入口 command → primary agent | 直接可调用的 primary agent |
| 目录结构 | `.opencode/agents/coding-bugfix/` | `.opencode/agents/bugfix-flow/` |
| 运行时产物 | `./coding-bugfix/bugfix-$ID/` | `./bugfix-flow/$DATE/bugfix-$ID/` |
| 日期分层 | 无 | 有（按 `$DATE` 分层避免 ID 冲突） |
| 提交策略 | 调用 @git-autocommit | 仅生成 `commit-msg.txt`，不自动提交 |

---

## 2. 目录结构

```
.opencode/
└── agents/
    └── bugfix-flow/
        ├── bugfix-flow.md              ← primary agent 定义（入口）
        └── (本文件)

运行时产物（项目根目录）：
bugfix-flow/                            ← Bug 修复产物
└── $DATE/                              ← YYYYMMDD 格式，按当天日期分层
    └── bugfix-$BUGFIX_ID/              ← 问题标识符
        ├── .flow-state.json      ← 状态文件
        ├── fix-plan.md                 ← 已确认的修复方案
        ├── fix-result.md               ← 修复结果报告
        ├── commit-msg.txt              ← 生成的提交信息
        └── errors.log                  ← 编译错误日志（可选）
```

---

## 3. 流程状态机

```
                  ┌──────────────┐
                  │  analyzing   │ ← 初始化
                  └──────┬───────┘
                         │ 分析完成
                         ▼
                  ┌──────────────┐
                  │   analyzed   │
                  └──────┬───────┘
                         │ 步骤 2 用户确认
                         │
               ┌─────────┼──────────┐
               ▼         ▼          ▼
         ┌──────────┐ ┌──────┐ ┌──────────┐
         │confirmed │ │cancel│ │iteration │
         │ 确认执行  │ │ 终止  │ │  >= 5    │
         └────┬─────┘ └──────┘ └──────────┘
              │
              ▼
         ┌──────────────┐
         │    fixing    │
         └──────┬───────┘
                │ 修复完成
                ▼
         ┌──────────────┐
         │  delivered   │
         └──────────────┘
```

### 状态说明

| 状态 | 说明 | 触发条件 |
|------|------|----------|
| `analyzing` | 问题分析中 | 初始化 |
| `analyzed` | 分析完成，等待用户确认方案 | 步骤 1 完成 |
| `confirmed` | 方案已确认，进入修复 | 用户选择"确认执行" |
| `cancelled` | 用户终止或超限终止 | 用户选择"终止"或 5 轮超限 |
| `fixing` | 修复执行中 | 步骤 3 开始 |
| `delivered` | 交付完成 | 步骤 6 完成 |

---

## 4. 流程步骤详解

### 4.1 初始化

**输入**：用户提供的 Bug 描述（报错信息、复现步骤、运行环境、关联代码模块）

**执行内容**：
1. 提取核心关键词，生成 `$BUGFIX_ID`（如 `login500failed`）
2. 获取当前日期 `$DATE`（格式 `YYYYMMDD`）
3. 创建产物目录 `./bugfix-flow/$DATE/bugfix-$BUGFIX_ID/`
4. 初始化状态文件 `.flow-state.json`：
   ```json
   { "status": "analyzing", "problem": "<问题描述>", "iteration": 0 }
   ```
5. 校验状态文件 JSON 完整性

### 4.2 步骤 1：问题分析

**执行内容**：
1. 读取用户提供的问题描述、复现步骤、运行环境、辅助分析信息
2. 阅读关联代码模块，理解业务逻辑
3. 根因分析（逻辑错误 / 边界条件 / 异常处理 / 并发问题 / 数据类型等）
4. 尝试复现问题（运行触发 BUG 的命令）
5. 向用户展示修复方案建议（根因分析、修复方案、问题复现流程、影响评估）

**状态变化**：`analyzing → analyzed`

### 4.3 步骤 2：方案确认（循环，上限 5 轮）

直接向用户提问确认：
```
请确认：【确认执行 / 修改方案 / 终止】
```

根据用户反馈：
- **确认执行** → 将修复方案写入 `fix-plan.md`，更新状态 `status: "confirmed"`，进入步骤 3
- **修改方案** → 收集修改意见，重新执行步骤 1（分析），循环计数 +1
- **终止** → 更新状态 `status: "cancelled"`，终止流程

**循环上限**：最多 5 轮确认，超限则终止并上报人工介入。

**fix-plan.md 格式**：
```markdown
# 修复方案（已确认）

## 根因分析
[精简的根因说明]

## 问题复现流程
[导致问题的代码调用流程 / 复现步骤]

## 修改点列表
- [文件 1]：[行号范围] - [修改说明]
- [文件 2]：[行号范围] - [修改说明]

## 影响范围
[影响评估]
```

### 4.4 步骤 3：执行修复

**执行内容**：
1. 按确认的修复方案（`fix-plan.md`）修改代码
2. 每次修改后记录变更内容

**状态变化**：`confirmed → fixing`

### 4.5 步骤 4：编译验证（循环，上限 2 次重试）

**构建验证策略**（优先级自上而下）：
1. 项目专用构建脚本（AGENTS.md / package.json / CMakeLists.txt 中的 build 命令）
2. 工程构建脚本（build.sh / Makefile）
3. 语言通用命令：

   | 语言 | 构建命令 |
   |------|---------|
   | JS/TS | `npm run build` 或 `npx tsc --noEmit` |
   | Go | `go build ./...` |
   | Python | `python -m py_compile <文件>` |
   | C/C++ (Qt) | `qmake ZNBProject.pro && make` |
   | C/C++ (CMake) | `cmake --build .` |
   | C/C++ (GCC) | `gcc -o <output> <file>` |

4. **降级验证**（工具链不可用时执行静态检查）

**重试机制**：
- 首次失败 → 记录错误到 `errors.log`
- 分析编译错误原因，修正代码
- 重试前询问用户「是否重试（剩余 N 次）或终止」
- 重试 2 次均失败 → 上报「多次重试失败，请人工介入」
- 编译通过 → 进入下一步

**类型检查**（如项目启用）：
| 语言 | 命令 |
|------|------|
| TypeScript | `npx tsc --noEmit` |
| Python | `mypy <涉及文件>` |

**Linter 检查**（如项目启用）：
| 语言 | 命令 |
|------|------|
| JS/TS | `npx eslint <涉及文件>` |
| Python | `flake8 <涉及文件>` |
| Go | `go vet ./...` |
| C/C++ | `clang-tidy <涉及文件>` |

### 4.6 步骤 5：生成提交信息

根据本次修改的内容，严格按以下格式生成提交信息：

```text
问题来源：【问题的来源与描述】
问题原因：【问题产生的原因】
修改说明：【修改的方法以及修改点】
测试建议：【对修改给出测试建议，涵盖修改点】
```

保存到 `commit-msg.txt`。

### 4.7 步骤 6：总结交付

**输出 fix-result.md**：
```markdown
# Bug 修复结果

## 修复状态
【已修复 / 部分修复 / 无法修复】

## 修改内容
[修复代码说明 / 修改行数]

## 涉及文件
- 文件 1（完整路径）
- 文件 2（完整路径）

## 构建验证结果
- 构建：【通过/失败】命令：[xxx]
- 类型检查：【通过/失败/跳过】
- Linter：【通过/发现问题】

## 提交信息
[步骤 5 生成的提交信息]
```

**状态变化**：`fixing → delivered`

**汇总展示**：
```
────────────────────────────────────────
 Bug 修复完成：bugfix-$BUGFIX_ID

 问题：[问题描述]
 根因：[根因摘要]
 修改：[修改文件列表]

 报告文件:
    bugfix-flow/$DATE/bugfix-$BUGFIX_ID/fix-plan.md
    bugfix-flow/$DATE/bugfix-$BUGFIX_ID/fix-result.md
    bugfix-flow/$DATE/bugfix-$BUGFIX_ID/commit-msg.txt

 提交信息已准备，请执行提交操作。
────────────────────────────────────────
```

---

## 5. 验证策略

### 5.1 构建验证

按优先级依次尝试：
1. 项目专用构建脚本（AGENTS.md / package.json / CMakeLists.txt）
2. 工程构建脚本（build.sh / Makefile）
3. 语言通用构建命令
4. 降级静态检查

### 5.2 类型检查

仅项目启用了类型检查工具时执行，不阻塞流程。

### 5.3 Linter 检查

仅项目启用了 Linter 时执行，记录问题但不强制修复。

---

## 6. 异常处理

### 6.1 编译验证重试

| 项目 | 值 |
|------|-----|
| 上限 | 2 次 |
| 首次失败 | 记录错误到 `errors.log`，分析原因，修正代码 |
| 策略 | 重试前询问用户「是否重试（剩余 N 次）或终止」 |
| 超限 | 上报「多次重试失败，请人工介入」 |

### 6.2 方案确认循环

| 项目 | 值 |
|------|-----|
| 上限 | 5 轮 |
| 超限 | 终止并上报「方案多次未通过确认，请人工介入」 |

### 6.3 状态文件异常

| 情况 | 处理 |
|------|------|
| JSON 损坏 | 报错「状态文件损坏，请人工介入」 |
| 文件不存在 | 按初次初始化执行 |

---

## 7. 状态文件生命周期

**路径**：`./bugfix-flow/$DATE/bugfix-$BUGFIX_ID/.flow-state.json`

**字段**：
```json
{
  "status": "analyzing|analyzed|confirmed|fixing|delivered|cancelled",
  "problem": "问题描述",
  "iteration": 0
}
```

**状态变化表**：
```
初始化    → { status: "analyzing",  problem: "...", iteration: 0 }
分析完成   → { status: "analyzed" }
方案确认   → { status: "confirmed" }
方案终止   → { status: "cancelled" }
执行修复   → { status: "fixing" }
交付完成   → { status: "delivered" }
```

---

## 8. 报告文件

### 8.1 fix-plan.md

**路径**：`./bugfix-flow/$DATE/bugfix-$BUGFIX_ID/fix-plan.md`

**用途**：记录已确认的修复方案

**内容**：根因分析 → 问题复现流程 → 修改点列表（文件+行号+说明） → 影响评估

### 8.2 fix-result.md

**路径**：`./bugfix-flow/$DATE/bugfix-$BUGFIX_ID/fix-result.md`

**用途**：交付时输出的修复总结报告

**内容**：修复状态 → 修改内容 → 涉及文件 → 构建验证结果 → 提交信息

### 8.3 commit-msg.txt

**路径**：`./bugfix-flow/$DATE/bugfix-$BUGFIX_ID/commit-msg.txt`

**用途**：生成的提交信息，供用户参考执行 `git commit`

---

## 9. 与 git-autocommit 的配合

本 agent **不自动提交**。提交信息生成后保存至 `commit-msg.txt`，用户可：
1. 直接使用生成的信息执行 `git commit`
2. 修改后提交
3. 通过 @git-autocommit 自动提交（需传入 `commit-msg.txt` 路径）

---

## 10. 注意事项

1. 步骤 2 的方案确认是**强制环节**，未经用户确认不得进入修复执行
2. 方案确认循环最多 5 轮，超限终止并上报人工介入
3. 步骤 4 编译验证最多重试 2 次，超限上报人工介入
4. 所有报告文件统一保存在 `./bugfix-flow/$DATE/bugfix-$BUGFIX_ID/` 文件夹
5. 状态文件每次状态变化必须同步更新
6. 提交信息生成后仅保存到文件，**不自动执行 git commit**，由用户决定提交时机
7. `.flow-state.json` 是流程正确性的关键，每次状态变化必须更新

# coding-bugfix 设计文档

## 1. 架构概述

独立的轻量 bug 修复流程，不依赖 coding-dev 的任何 subagent。

### 1.1 设计目标

- **完全独立**于 coding-dev
- **内联所有逻辑**（无 subagent 调用）
- **轻量级流程**（分析→方案确认→修复→交付）

### 1.2 目录结构

```
.opencode/
├── agents/
│   ├── coding-dev/           # 全流程开发（独立）
│   │   ├── dev-master.md
│   │   ├── dev-plan.md
│   │   ├── dev-code.md
│   │   ├── dev-review.md
│   │   └── dev-bugfix.md
│   │
│   └── coding-bugfix/        # 轻量 bug 修复（独立）
│       ├── bugfix-master.md  # 独立 primary agent
│       └── DESIGN.md         # 本设计文档
│
└── commands/
    ├── coding-dev/
    │   └── coding-dev.md
    │
    └── coding-bugfix/
        └── coding-bugfix.md  # 入口命令
```

## 2. 与 coding-dev 的核心差异

| 维度 | coding-dev | coding-bugfix |
|------|-----------|---------------|
| 适用场景 | 从零开发新功能 | 已有功能的 bug 修复 |
| 流程步骤 | 规划→确认→分批编码→审查→修复循环→交付 | 分析→方案确认→修复→交付 |
| subagent 依赖 | dev-plan/dev-code/dev-review/dev-bugfix | **无**（内联所有逻辑） |
| 状态控制 | 原子写入（tmp+rename）+ 完整状态机 | 直接写入 + 简化状态 |
| 报告文件 | plan.md/code.md/review.md/bugfix.md | analysis.md/fix-result.md |
| 入口命令 | `/coding-dev` | `/coding-bugfix` |
| 状态文件前缀 | `coding-dev/$FEATURE_NAME/` | `coding-bugfix/bugfix-$ID/` |

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
        │confirming│ │cancel│ │iteration │
        │ 确认通过  │ │ 终止  │ │  >= 5    │
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
|------|------|---------|
| `analyzing` | 问题分析中 | 初始化 |
| `analyzed` | 分析完成，等待确认 | 步骤 1 完成 |
| `confirming` | 方案已确认，执行修复 | 用户确认方案 |
| `fixing` | 修复执行中 | 步骤 3 开始 |
| `delivered` | 交付完成 | 步骤 5 完成 |
| `cancelled` | 用户终止 | 用户选择终止或 5 轮超限 |

## 4. 数据流

```
用户输入 → 提取 BUGFIX_ID → 创建状态文件
              │
              ▼
        步骤 1：问题分析
        • git log/blame 追溯
        • 复现问题
        • 根因分析
              │
              ▼
        输出 analysis.md
              │
              ▼
        步骤 2：方案确认（循环≤5 轮）
        • 展示根因 + 方案 + 影响评估
        • 用户确认/修改/终止
              │
              ▼
        步骤 3：执行修复
        • 按方案修改代码
        • 构建验证（@auto-verify-code）
        • 类型检查
        • Linter 检查
        • 功能验证
              │
              ▼
        输出 fix-result.md
              │
              ▼
        步骤 4：git 提交
        • 调用 @git-autocommit
        • 排除 coding-bugfix/
              │
              ▼
        步骤 5：交付汇总
        • 更新状态 delivered
        • 输出修复报告
```

## 5. 验证策略

### 5.1 构建验证（参照 @auto-verify-code）

**优先级策略**（自上而下）：

1. **项目专用构建脚本**
   - AGENTS.md / CODEBUDDY.md 中的构建命令
   - package.json 中的 `build` 脚本

2. **工程构建脚本**
   - build.bat / build.sh
   - Makefile
   - CMakeLists.txt

3. **语言通用命令**

   | 语言 | 构建命令 |
   |------|---------|
   | JS/TS | `npm run build` 或 `npx tsc --noEmit` |
   | Go | `go build ./...` |
   | Python | `python -m py_compile <文件>` |
   | C/C++ (MSVC) | `msbuild /t:rebuild` |
   | C/C++ (Qt) | `qmake` + `jom` |
   | C/C++ (CMake) | `cmake --build .` |
   | C/C++ (GCC) | `gcc -o <output> <file>` |

4. **降级验证**
   - 工具链不可用时执行静态检查

### 5.2 类型检查（如项目启用）

| 语言 | 命令 | 触发条件 |
|------|------|---------|
| TypeScript | `npx tsc --noEmit` | 存在 `tsconfig.json` |
| Python | `mypy <涉及文件>` | 存在 `mypy.ini` |

### 5.3 Linter 检查

| 语言 | 命令 |
|------|------|
| JS/TS | `npx eslint <涉及文件>` |
| Python | `flake8 <涉及文件>` 或 `pylint <涉及文件>` |
| Go | `go vet ./...` 或 `golint ./...` |
| C/C++ | `clang-tidy <涉及文件>` 或 `cpplint <涉及文件>` |

**要求**：
- 报告所有发现的问题
- **不阻塞**：Linter 问题记录到报告，但不强制修复
- 严重问题（如未使用变量导致编译错误）需修复

### 5.4 功能验证

- 运行触发 BUG 的命令，确认已修复
- 运行项目现有测试，确认无回归

## 6. 异常处理

### 6.1 重试机制

- **重试上限**：每次关键操作最多重试 2 次
- **重试策略**：
  1. 首次失败 → 记录错误到 `errors.log`
  2. 重试前询问用户「是否重试（剩余 N 次）或终止」
  3. 重试 2 次均失败 → 上报「多次重试失败，请人工介入」
- **重试不计数**到确认循环（重试和方案确认是两个独立维度）

### 6.2 方案确认循环

- **上限**：5 轮
- **超限处理**：终止并上报「方案多次未通过确认，请人工介入」

### 6.3 错误日志

路径：`coding-bugfix/bugfix-$ID/errors.log`

内容：
- 错误时间
- 错误操作
- 错误信息
- 重试次数

## 7. 状态文件

**路径**：`coding-bugfix/bugfix-$ID/.coding-dev-state.json`

**字段**：
```json
{
  "status": "analyzing|analyzed|confirming|fixing|delivered|cancelled",
  "problem": "问题描述",
  "iteration": 0
}
```

**写入方式**：直接写入（简化原子操作）

**生命周期**：
```
初始化  → { status: "analyzing", problem: "...", iteration: 0 }
分析完成 → status: "analyzed"
方案确认通过 → status: "confirming"
方案用户终止 → status: "cancelled"
修复执行中 → status: "fixing"
交付完成 → status: "delivered"
```

## 8. 报告文件

### 8.1 analysis.md

路径：`coding-bugfix/bugfix-$ID/analysis.md`

内容：
```markdown
# Bug 分析报告

## 问题描述
[用户输入的问题描述]

## 根因分析
[详细的根因说明，涉及哪行代码、什么逻辑错误]

## 修复方案
[修改文件 1]：第 xx 行，原逻辑 → 新逻辑
[修改文件 2]：新增 yy 函数处理边界情况
...

## 影响评估
[是否有副作用/回归风险]
```

### 8.2 fix-result.md

路径：`coding-bugfix/bugfix-$ID/fix-result.md`

内容：
```markdown
# Bug 修复结果

## 修复状态
【已修复 / 部分修复 / 无法修复】

## 修改内容
[修复代码说明 / 修改行数]

## 涉及文件路径
- 文件 1（完整路径）
- 文件 2（完整路径）

## 构建&验证结果
- 构建验证：【通过/失败】命令：[xxx] 退出码：[N]
- 类型检查：【通过/失败/跳过】命令：[xxx] 退出码：[N]
- Linter 检查：【通过/发现问题】命令：[xxx] 问题数：[N]

## 修复验证结果
- 复现命令及结果
- 验证命令及结果

## 回归检查
- 全量测试命令及结果
```

## 9. 入口命令

**路径**：`.opencode/commands/coding-bugfix/coding-bugfix.md`

**用法**：
```
/coding-bugfix "问题描述"
```

**示例**：
```
/coding-bugfix "登录按钮点击后报 500 错误"
/coding-bugfix "src/auth/login.ts 登录接口返回 401"
```

## 10. 注意事项

1. 本流程是独立 bug 修复流程，**不依赖 coding-dev 的 subagent**
2. 步骤 2 的方案确认是强制环节，未经用户确认不得进入修复执行
3. 方案确认循环最多 5 轮，超限终止并上报人工介入
4. 所有报告文件统一保存在 `./coding-bugfix/bugfix-$BUGFIX_ID/` 文件夹中
5. 步骤 4 提交前必须调用 @git-autocommit，提交范围**仅限代码文件**，排除 `coding-bugfix/` 下的报告文件
6. `.coding-dev-state.json` 是流程正确性的关键，每次状态变化必须同步更新
7. 本流程**不需要 git stash 保存基线**（bug 修复通常是增量修改，无需回滚到修复前）
8. 状态文件采用直接写入（简化原子操作）

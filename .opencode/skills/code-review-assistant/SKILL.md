---
name: code-review-assistant
description: 当用户要求审查代码、进行 code review、或分析代码质量时触发。自动化代码审查流程，生成结构化审查报告和修复方案。
---

# 代码审查助手

## 工作流程

### 阶段 0：初始化

> `YYYYMMDD` 为占位符，执行时替换为当前日期（如 20260605）

- 创建输出目录：`mkdir -p code-review-assistant/YYYYMMDD`
- 确认用户要审查的目录/文件路径
- 分析项目组织方式，了解项目架构
- 阅读代码，了解项目功能模块
- **检测项目主要语言**（根据文件扩展名分布、项目配置文件如 `package.json`/`go.mod`/`Cargo.toml` 等推断），为阶段 1 加载对应编码规范 skill 做准备

### 阶段 1：代码审查与修复方案

**通用审查维度**：
- 架构设计
- 错误处理
- 资源管理
- 代码质量
- 测试覆盖
- 安全性（注入防护、敏感信息泄露、权限校验）

#### 语言特定检查清单
根据项目语言，使用 `skill` 工具加载对应的编码规范 skill。加载后其核心规范摘要及完整规范将注入当前上下文，供审查使用。
- `package.json` / `tsconfig.json` / `*.js` / `*.ts` / `*.tsx` → **JavaScript/TypeScript** → 加载 `javascript-coding-standards` 技能
- `setup.py` / `pyproject.toml` / `requirements.txt` / `*.py` → **Python** → 加载 `python-coding-standards` 技能
- `go.mod` / `*.go` → **Go** → 加载 `go-coding-standards` 技能
- `CMakeLists.txt` / `Makefile` / `*.c` / `*.cpp` / `*.h` → **C/C++** → 加载 `c-cpp-coding-standards` 技能
- **其它**: 参照**通用审查维度**

生成包含审查报告内容的修复方案：`code-review-assistant/YYYYMMDD/FixPlan.md`

### 阶段 2：修复实施

1. 向用户展示问题清单列表（从 `FixPlan.md` 中提取），格式如下：

   ID       | 级别      | 描述
   --------|-----------|---------------------------
   C-001   | Critical  | 问题标题简述（含文件/函数位置）
   C-002   | Critical  | 问题标题简述
   M-001   | Major     | 问题标题简述
   m-001   | Minor     | 问题标题简述
   P-001   | Potential | 问题标题简述
   --- 共 X 个问题（Critical: X, Major: X, Minor: X, Potential: X）---
   完整问题描述和修复方案详见 `code-review-assistant/YYYYMMDD/FixPlan.md`

2. 用户选择要修复的问题：
   - **按编号指定**：输入 `C-001, M-001`
   - **按级别指定**：输入 `Critical`, `Major`
   - **全部修复**：输入 `all`
   - **仅输出报告** → 流程结束

3. 根据用户选择从 `FixPlan.md` 中筛选对应问题实施修复

4. 修复完成后自动进入 **阶段 3：编译验证与交付总结**

### 阶段 3：编译验证与交付总结

1. **执行验证清单**：对照 FixPlan.md 中的验证清单逐条验证
   - 手动检查项、自动化检查项逐一执行
   - 通过项将 `[ ]` 更新为 `[x]`，失败项保持 `[ ]` 并追加说明

2. 复用 `build-verify` skill 的完整验证流程（构建验证 + 类型检查 + Linter 检查）

3. **验证全部通过** → 生成 `code-review-assistant/YYYYMMDD/FixSummary.md`
   （含审查概览、分级统计、已修复/未修复清单、验证结果），流程结束

4. **存在失败** → 分析失败原因，询问用户：
   - 继续修复？（最多 3 轮）
   - 回滚修改，生成 `FixSummary.md`（含已修复/未修复清单、失败详情），请求人工介入？

> 在同一天多次运行会覆盖 `FixPlan.md` 和 `FixSummary.md`。如需保留历史记录，可手动修改目录名添加后缀（如 `YYYYMMDD_v2`）。


## 输出规范

### 问题分级标准

| 级别 | 标准 | 示例 |
|------|------|------|
| Critical | 导致程序崩溃/数据丢失/资源泄漏 | 协程泄露、配置错误忽略 |
| Major | 影响功能正确性或性能 | 错误处理不完整、超时过长 |
| Minor | 代码风格/可维护性问题 | 命名不规范、魔法数字 |
| Potential | 潜在风险 | 数据竞争、内存泄漏风险 |

### 文档结构

**`FixPlan.md`** 包含：
- 项目概述（功能说明、目录结构、技术栈）
- 代码优点
- 问题与修复方案（按优先级分级，每个问题分配唯一 ID `[C/M/m/P]-[序号]`，含描述、位置、影响、代码对比）
- 代码统计
- 修复实施计划
- 验证清单（`[ ]` checklist，阶段3执行时更新为 `[x]`）

**`FixSummary.md`** 包含：
- 审查概览（总问题数、分级统计、已修复/未修复、涉及文件列表）
- 编译验证结果（验证清单执行状态、构建/类型检查/Linter 结果）

## 约束

1. 必须先读取源代码再进行审查
2. 问题必须分级，便于用户优先处理
3. 每个问题必须标注严重级别并分配唯一 ID（格式如 `C-001`），修复方案必须包含修复前后的代码对比
4. 提供修复后的验证清单
5. 保持原有代码风格，确保向后兼容

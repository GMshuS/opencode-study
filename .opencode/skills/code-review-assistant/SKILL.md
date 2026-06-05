---
name: code-review-assistant
description: 自动化代码审查流程，生成结构化审查报告和修复方案。当用户要求审查代码、进行 code review、或分析代码质量时触发。
---

# 代码审查助手

## 工作流程

### 阶段 0：初始化

> `YYYYMMDD` 为占位符，执行时替换为当前日期（如 20260605）

- 创建输出目录：`mkdir -p code-review-assistant/YYYYMMDD`
- 确认用户要审查的目录/文件路径
- 分析项目组织方式，了解项目架构
- 阅读代码，了解项目功能模块

### 阶段 1：代码审查与修复方案

根据项目语言，加载对应的语言特定检查清单（见skill目录下的 `references/` 目录）。

**通用审查维度**：
- 架构设计
- 错误处理
- 资源管理
- 代码质量
- 测试覆盖
- 安全性（注入防护、敏感信息泄露、权限校验）

#### 语言特定检查清单
- **Go**: 见skill目录下的 `references/go-code-checklist.md`（并发安全、错误处理、性能优化）
- **Python**: 见skill目录下的 `references/python-code-checklist.md`（类型注解、异常处理、资源管理）
- **JavaScript/TypeScript**: 见skill目录下的 `references/js-code-checklist.md`（异步处理、类型安全、模块规范）
- **C/C++**: 见skill目录下的 `references/cpp-code-checklist.md`（内存管理、指针安全、RAII）
- **其它**: 参照**通用审查维度**

生成详细审查报告：\`code-review-assistant/YYYYMMDD/CodeReviewReport.md\`

生成修复方案：\`code-review-assistant/YYYYMMDD/FixPlan.md\`

### 阶段 2：修复实施

1. 向用户展示问题分级汇总（从 `FixPlan.md` 中提取）：
   - Critical: X 个
   - Major: Y 个
   - Minor: Z 个
   - Potential: W 个

2. 提供选项供用户选择：
   - **仅输出报告** → 流程结束
   - **实施修复** → 让用户选择要修复的级别（可多选）：
     - Critical ☐
     - Major   ☐
     - Minor   ☐
     - Potential ☐

3. 根据用户选择的级别，从 `FixPlan.md` 中筛选对应级别的问题实施修复

4. 修复完成后自动进入 **阶段 3：编译验证**

### 阶段 3：编译验证

1. 复用 `auto-verify-code` skill 的完整验证流程（构建验证 + 类型检查 + Linter 检查）。
2. **验证通过** → 生成`code-review-assistant/YYYYMMDD/FixSummary.md`（包含验证结果），流程结束
3. **验证失败** → 分析编译错误，询问用户：
   - 是否继续修复？（最多 3 轮）
   - 是否回滚修改并请求人工介入？

### 阶段 4：交付总结

1. 向用户汇报审查结果概览（总问题数、分级统计、已修复/未修复）
2. 输出最终审查统计数据到 \`code-review-assistant/YYYYMMDD/Summary.md\`

> 如果在同一天多次运行，文件会被覆盖。如需保留历史记录，可手动修改目录名添加后缀（如 \`YYYYMMDD_v2\`）。


## 输出规范

### 问题分级标准

| 级别 | 标准 | 示例 |
|------|------|------|
| Critical | 导致程序崩溃/数据丢失/资源泄漏 | 协程泄露、配置错误忽略 |
| Major | 影响功能正确性或性能 | 错误处理不完整、超时过长 |
| Minor | 代码风格/可维护性问题 | 命名不规范、魔法数字 |
| Potential | 潜在风险 | 数据竞争、内存泄漏风险 |

### 文档结构

**审查报告**包含：
- 项目概述（功能说明、目录结构、技术栈）
- 代码优点
- 问题与改进建议（按优先级分级）
- 代码统计
- 修复优先级

**修复方案**包含：
- 修复总览（问题数量、预计工时）
- 每个问题必须标注严重级别（Critical / Major / Minor / Potential）
- 分级修复方案（含代码对比）
- 修复实施计划
- 验证清单

## 约束

1. 必须先读取源代码再进行审查
2. 问题必须分级，便于用户优先处理
3. 修复方案必须包含修复前后的代码对比
4. 提供修复后的验证清单
5. 保持原有代码风格，确保向后兼容

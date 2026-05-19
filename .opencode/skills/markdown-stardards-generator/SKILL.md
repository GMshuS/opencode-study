---
name: markdown-stardards-generator
description: 当要求 整合 或者 格式化 或者 优化 已有markdown文件时调用。
---

# markdown文件整合与格式标准化助手

## 背景与要求 

1. **强制使用** 技能目录下的`assets/markdown-stardards-template.md`文件作为格式模板
2. **禁止**：改变标题层级、使用散文体叙述
3. 用户提供原始markdown文件，可以是1个文件、也可以是多个文件
4. 对用户提供的markdown文件进行整合（如果有多个文件）和格式标准化，对内容进行优化、去重等操作，保证内容的完整性和逻辑性

## 输出格式

### 文件保存规则：
- **保存路径**：`./markdown-stardards/` 文件夹（相对于当前工作目录）
- **输出格式**：结果保存为markdown文件

### 文件操作步骤：
1. 检查 `./markdown-stardards/` 文件夹是否存在，不存在则创建
2. 向用户确认文件已保存及保存路径

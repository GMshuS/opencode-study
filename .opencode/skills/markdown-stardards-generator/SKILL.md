---
name: markdown-stardards-generator
description: 当要求 整合 或者 格式化 或者 优化 已有markdown文件时调用。
---

# markdown文件整合与格式标准化助手

## 背景与要求 

1. 用户提供原始markdown文件，可以是1个文件、也可以是多个文件
2. **强制使用** 技能目录下的`assets/markdown-stardards-template.md`文件作为格式模板
3. 对用户提供markdown文件进行整合并格式标准化，保证用户提供的markdown文件内容完整性
4. **禁止**：改变标题层级、使用散文体叙述

## 工作流

有两种任务方式：

### 方式一：用户提供单个markdown文件
1. 对用户提供的单个markdown文件进行格式标准化；

### 方式二：用户提供多个markdown文件
1. 对多个markdown文件内容进行整合，合并成一个markdown文件，生成目录结构并展示给用户，用户确认后执行步骤2；
2. 对合并成的markdown文件进行格式标准化；

工作方式的选择，根据提供的markdown文档数量决定

## 输出格式

### 文件保存规则：
- **保存路径**：`./markdown-stardards/` 文件夹（相对于当前工作目录）
- **输出格式**：结果保存为markdown文件

### 文件操作步骤：
1. 检查 `./markdown-stardards/` 文件夹是否存在，不存在则创建
2. 向用户确认文件已保存及保存路径

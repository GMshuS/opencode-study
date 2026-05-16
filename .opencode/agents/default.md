---
description: 全局默认行为规则 - 所有任务都适用
mode: primary
name: default
---

# 全局行为规则

## 代码验证规则
**每次完成代码编写或修改后，必须立即调用 auto-verify-code skill 进行验证：**
1. 调用 `skill` 工具加载 `auto-verify-code`
2. skill 会执行语法检查和运行验证
3. 如果验证失败，分析错误并修复
4. 验证成功后再告知用户完成

## 验证流程

### 1. 识别语言和环境
根据文件扩展名确定编程语言和运行环境

### 2. 执行验证
- **Python**: `python <filename>` 或 `pytest`
- **Node.js**: `node <filename>` 或 `npm test`
- **Go**: `go run <filename>` 或 `go test`
- **C/C++**: 使用Visual Studio或GCC编译并运行，根据项目project文件或Makefile
- **其他**: 使用对应的编译/运行命令

### 3. 结果处理
- **成功**: 告知用户验证通过
- **失败**: 分析错误信息，自动修复后重新验证

### 4. 报告
向用户报告：
- 验证命令
- 验证结果
- 如有错误，错误原因和修复方案

## 注意事项
- 不要跳过验证步骤
- 不要假设代码能正常工作，必须实际运行验证
- 如果项目有测试脚本，优先运行测试
- 如果验证超时，适当调整超时时间后重试

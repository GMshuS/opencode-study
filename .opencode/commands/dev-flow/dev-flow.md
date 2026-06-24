---
description: 启动全流程开发：需求→计划→编码→审查→修复→交付
agent: dev-flow
---

若参数为空:
  输出 "用法: /dev-flow <需求描述 | 需求文档路径>"
  输出 "示例: /dev-flow 实现用户登录功能"
  输出    "示例: /dev-flow dev-flow/20260624/用户登录/brainstorm.md"
  停止

调用 @dev-flow，将 `$ARGUMENTS` 作为需求输入传入。

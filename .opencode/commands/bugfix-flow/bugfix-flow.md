---
description: 启动轻量 Bug 修复流程，内联分析/确认/修复/验证/提交
agent: bugfix-flow
---

若参数为空:
  输出 "用法: /bugfix-flow <问题描述>"
  输出 "示例: /bugfix-flow 登录按钮点击后报 500 错误"
  输出 "示例: /bugfix-flow src/auth/login.ts 登录接口返回 401"
  停止

调用 @bugfix-flow，将 `$ARGUMENTS` 作为问题描述传入。

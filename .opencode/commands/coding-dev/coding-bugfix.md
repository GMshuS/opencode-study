---
description: 轻量 bug 修复：分析根因 → 方案确认 → 修复 → 提交
agent: bugfix-master
---

调用 @bugfix-master 执行轻量 bug 修复流程。

参数：$ARGUMENTS（问题描述，可选涉及文件提示）

示例:
  /coding-bugfix 登录按钮点击后报 500 错误
  /coding-bugfix src/auth/login.ts 登录接口返回 401，排查 token 校验逻辑

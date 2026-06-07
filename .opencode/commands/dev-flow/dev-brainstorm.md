---
description: 深度需求探索与技术方案设计，用于 dev-master 启动之前的预热阶段
agent: dev-brainstorm
---

## 参数校验

从用户输入或 `$ARGUMENTS` 提取项目信息：

```
IF $ARGUMENTS 为空:
  OUTPUT "Error: 缺少必要参数"
  OUTPUT "用法：/dev-brainstorm <探索主题>"
  OUTPUT "示例：/dev-brainstorm 使用JS开发一款贪吃蛇游戏"
  STOP
```

## 启动开发流程

调用 @dev-brainstorm 进行深度需求探索与技术方案设计，传入`$ARGUMENTS`参数。

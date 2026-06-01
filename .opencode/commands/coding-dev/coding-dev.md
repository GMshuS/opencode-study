---
description: 启动全流程开发：需求→计划→编码→审查→修复→交付
agent: dev-master
---

## 参数校验

IF $ARGUMENTS 为空:
  OUTPUT "Error: 缺少功能名称"
  OUTPUT "用法: /coding-dev <功能名称> [brainstorm.md路径]"
  OUTPUT "示例: /coding-dev 用户登录"
  OUTPUT "示例: /coding-dev 用户登录 coding-dev/用户登录/brainstorm.md"
  STOP

SET $FEATURE_NAME = $ARGUMENTS 的第一个单词
SET $BRAINSTORM_PATH = $ARGUMENTS 第一个空格后的全部内容（如果存在）

## 启动开发流程

调用 @dev-master 进行全流程开发。

上下文传递：
- 功能名称: $FEATURE_NAME
IF $BRAINSTORM_PATH 不为空:
- brainstorm.md路径: $BRAINSTORM_PATH

---
description: 启动全流程开发：需求→计划→编码→审查→修复→交付
agent: dev-master
---

## 参数校验

IF $ARGUMENTS 为空:
  OUTPUT "Error: 缺少参数"
  OUTPUT "用法: /coding-dev <brainstorm.md路径 | 需求描述>"
  OUTPUT "       /coding-dev <功能名称> [brainstorm.md路径 | 需求描述]"
  OUTPUT "示例: /coding-dev coding-dev/用户登录/brainstorm.md"
  OUTPUT "示例: /coding-dev 实现用户登录功能"
  OUTPUT "示例: /coding-dev 用户登录 coding-dev/用户登录/brainstorm.md"
  OUTPUT "示例: /coding-dev 用户登录 实现JWT认证的登录模块"
  STOP

## 参数解析

SPLIT $ARGUMENTS BY 空格 → $PARTS
SET $COUNT = LENGTH($PARTS)

IF $COUNT == 1:
  # Mode 1: 单个参数 → brainstorm.md路径 或 需求描述
  SET $SINGLE_ARG = $PARTS[0]

  IF $SINGLE_ARG 以 ".md" 结尾 OR $SINGLE_ARG 包含 "/" OR $SINGLE_ARG 包含 "\\":
    SET $BRAINSTORM_PATH = $SINGLE_ARG
    SET $FEATURE_NAME = EXTRACT_DIRNAME($SINGLE_ARG)
  ELSE:
    SET $FEATURE_NAME = ""
    SET $REQUIREMENT_DESC = $SINGLE_ARG
  END
ELSE:
  # Mode 2: 多参数 → 功能名称 + brainstorm.md路径/需求描述
  SET $FEATURE_NAME = $PARTS[0]
  SET $REST = $ARGUMENTS 去掉第一个单词后的剩余部分

  IF $REST 以 ".md" 结尾 OR $REST 包含 "/" OR $REST 包含 "\\":
    SET $BRAINSTORM_PATH = $REST
  ELSE:
    SET $REQUIREMENT_DESC = $REST
  END
END

## 启动开发流程

调用 @dev-master 进行全流程开发。

上下文传递：
IF $FEATURE_NAME 不为空:
- 功能名称: $FEATURE_NAME
END
IF $BRAINSTORM_PATH 不为空:
- brainstorm.md路径: $BRAINSTORM_PATH
END
IF $REQUIREMENT_DESC 不为空:
- 需求描述: $REQUIREMENT_DESC
END

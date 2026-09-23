---
name: unit-test-guidance
description: 单元测试框架选型与测试设计的参考。规划测试策略、编写单元测试或评估测试完备性时调用。
---

# 单元测试指导

## 选型

先看项目里已经有什么：`package.json` 的 `scripts.test` 与 devDependencies、`go.mod` 与 `*_test.go`、
`pytest.ini`、`CMakeLists` 的 `enable_testing()`、`.pro` 的 `QT += testlib`。
沿用项目现有的框架，比引入一套新框架更省事，也更贴近项目惯例。

项目没有现成框架时，优先选不需要新增依赖的方案：

| 场景 | 通常合适的选择 |
|---|---|
| Go | 标准库 `testing`，`go test` 开箱可用；想要更顺手的断言再考虑 testify |
| Python | pytest |
| C++ · Qt 项目 | Qt 自带的 `QtTest`，`.pro` 加一行 `QT += testlib` 即可，不用下载 |
| C++ · 非 Qt | 构建系统已就绪时用 GoogleTest；想零依赖、单文件时 doctest 更轻 |
| JS / TS | 沿用项目既有配置；新 TS 项目可考虑 vitest，Node 18+ 也有内置的 `node:test` |

检查环境时留意别用到会隐式下载的命令，例如 `npx --no-install vitest --version`
而不是 `npx vitest --version`。

## 测试设计

- 核心逻辑值得同时覆盖正常路径与异常路径（空值、越界、重复、权限不足、依赖失败等）；
  只有正常路径的用例，通常覆盖不到真正会出错的分支。
- 不必盯着覆盖率数字，关键是该测的分支有没有测到。
- 外部依赖（网络、数据库、时钟）用替身隔离，测试不连真实环境。
- 如果某个模块写起来很难测，往往是设计上耦合过紧的信号 —— 在依赖边界留一个可替换的注入点，
  通常比加更多 mock 更有效。
- 单元测试与实现同期交付比较自然：它依赖的模块还没就绪时，这个用例本来也还没到能写的时机。
  跨模块的集成测试适合当作独立工作项，等前置都就绪再做。

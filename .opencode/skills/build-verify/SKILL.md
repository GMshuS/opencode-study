---
name: build-verify
description: 代码变更后执行构建验证。根据语言、项目结构、工具链自主决策，执行静态检查→编译验证→结构化报告。
---

# 构建验证 Skill

## 核心原则

- **先静态，后编译** — 先做不依赖运行时的检查（格式/Lint/类型），快速发现错误
- **最小化验证** — 只验证变更所影响的范围，避免全量构建
- **自主决策** — 根据环境探测结果选择当前可用的最强验证方式
- **降级不跳过** — 工具链缺失时使用语言内置语法检查作为保底
- **完整报告** — 所有检查项独立执行并报告，不因一项失败而跳过其他

## 工作流程

### 步骤 1: 识别语言与项目结构

自行完成以下探测：

- **语言**：从文件扩展名和项目配置文件推断
- **构建系统**：识别 package.json / CMakeLists.txt / Cargo.toml / Makefile / .pro 等
- **工具链**：检查环境可用工具（`which g++` / `node --version` / `cargo --version` 等）
- **影响范围**：评估修改的文件是独立文件、模块内文件还是跨模块变更

### 步骤 2: 静态检查（全部执行，独立报告）

根据语言和可用环境，依次执行以下检查（有配置/有工具就执行，没有就跳过）：

| 检查层级 | 说明 | 示例工具 |
|----------|------|----------|
| ① 格式 | 代码风格一致性 | prettier / gofmt / black --check / clang-format |
| ② Lint | 代码规范与潜在错误 | eslint / flake8 / clang-tidy / cargo clippy |
| ③ 类型 | 类型安全 | tsc --noEmit / mypy / go vet |
| ④ 语法 | 基础语法正确性 | py_compile / g++ -fsyntax-only / cl /c |

**原则**：每项独立执行，各自输出结果。一项失败不影响其他项的执行。

### 步骤 3: 最小化编译验证

#### 3.1 构建配置

Debug 构建提供更详细的诊断输出。仅在项目显式指定 Release 时切换。

#### 3.2 工具链命令参考

| 构建系统 | Debug 构建命令 | 单文件语法检查 |
|----------|--------------|--------------|
| **Qt (qmake, Linux)** | `qmake "CONFIG+=debug" "CONFIG+=qml_debug" && make -j$(nproc)` | `g++ -c -std=c++17 -Wall -Wextra file.cpp` |
| **Qt (qmake, Windows)** | `qmake "CONFIG+=debug" "CONFIG+=qml_debug" && jom` | `cl /c /std:c++17 /EHsc /Zi /FS file.cpp` |
| **Qt (CMake)** | `cmake -B build -DCMAKE_BUILD_TYPE=Debug && cmake --build build -j$(nproc)` | — |
| **CMake 通用** | `cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug && cmake --build build -j$(nproc)` | — |
| **MSVC (sln/vcxproj)** | `msbuild /t:rebuild /p:configuration=Debug /m` | `cl /c /std:c++17 /EHsc file.cpp` |
| **Generic Makefile** | `make -j$(nproc)` | `g++ -c -std=c++17 -Wall -Wextra file.cpp` |

#### 3.3 编译策略选择

根据项目结构和影响范围，选择最轻量的编译策略。针对 **C++** 项目，按检测到的工具链从 3.2 中选择对应命令。

| 影响范围 | 策略 | 示例 |
|----------|------|------|
| 单文件 | 单文件编译 | `g++ -c file.cpp` / `cl /c file.cpp` / `javac File.java` / `python -m py_compile file.py` |
| 单模块 | 模块级构建 | 进入模块目录执行对应 Debug 构建命令 |
| 跨模块 | 按依赖顺序编译 | 仅编译受影响模块及其直接依赖 |
| 全项目 | 仅当无法缩小范围时 | 在项目根目录执行对应 Debug 构建命令 |

`msbuild /m` / `make -j$(nproc)` / `cmake --build build -j$(nproc)` / `jom` 已内置并行，建议构建时始终启用。

### 步骤 4: 结构化报告

按以下统一模板输出：

```
═══ 构建验证报告 ═════════════════════════════
  语言:       {检测到的语言及版本}
  构建系统:   {检测到的构建系统}
  工具链:    {可用工具及版本}
  影响范围:   {修改的文件及范围评估}
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─

  静态检查:
    ├─ 格式 ({工具名})    {✅ 通过 | ⚠️ 通过 (N 条建议) | ❌ 失败 | ⏭️ 跳过 — 原因}
    │     {仅当失败/警告时: 文件:行:列  {错误消息} }
    │     {仅当失败/警告时: → 建议: {修复方案} }
    ├─ Lint ({工具名})    {同上}
    │     {同上，可多行}
    ├─ 类型 ({工具名})    {同上}
    └─ 语法 ({工具名})    {同上}

  编译验证 ({命令}):
    {✅ 通过 — 0 errors, 0 warnings (用时) | ❌ 失败 — {编译器原始错误}}

═══ 结论: {✅ 全部通过 | ⚠️ 部分通过 (N 项警告) | ❌ N 项失败} ═══
```

## 注意事项

- **所有检查项独立执行**：一项失败不影响其他项运行
- **报告必须包含错误详情**：原始错误输出 + 文件位置 + 修复建议
- **跳过需说明原因**：如「未找到 cppcheck，跳过 Lint 检查」
- **不要跳过验证**：至少执行到语法检查级别
- **自主决策**：上述流程为指引，LLM 可根据实际情况灵活调整

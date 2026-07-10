---
name: build-verify
description: 代码变更后执行构建验证。根据语言、项目结构、工具链自主决策，执行静态检查→编译验证→结构化报告。
---

# 构建验证 Skill

## 核心原则

- **先静态，后编译** — 先做不依赖运行时的检查（格式/Lint/类型），快速发现错误
- **按规模分级，统一增量** — 根据变更文件数分三级（微小/中等/重大），全部使用增量 Debug 构建，构建系统处理依赖，AI 不做依赖追踪与编译顺序编排
- **仅 Debug 模式** — 构建验证始终使用 Debug，不做 Release。项目脚本默认为 Release 时改用 Debug 配置。执行前确认编译参数含 `-Zi`/`-g` 且无 `-O2`/`-DNDEBUG`
- **降级不跳过** — 工具链缺失时使用语言内置语法检查保底；跳过项需说明原因，至少执行到语法检查级别
- **独立报告** — 每项检查独立执行，不因一项失败跳过其他；报告含工具名、结果、错误详情（文件:行:列 + 修复建议）

## 工作流程

### 步骤 1：识别语言与变更规模

自行完成以下探测：

- **语言**：从文件扩展名和项目配置文件推断
- **构建系统**：识别 package.json / CMakeLists.txt / Cargo.toml / Makefile / .pro 等
- **工具链**：检查环境可用工具（`which g++` / `node --version` / `cargo --version` 等）
- **Debug 脚本**：检查项目是否提供 Debug 构建脚本（如 `build_debug.bat`、`Makefile.Debug`）
- **变更规模**：
  1. 执行 `git diff --name-only --diff-filter=ACMR` 获取变更文件清单
  2. 剔除非代码文件（.md / .json / .yaml / .yml / .png / .svg / .gitignore 等）
  3. 计数剩余代码文件数 → 定级：
     - ≤3 → 微小
     - 4~15 → 中等
     - >15 → 重大
  4. **触发重大**：若清单包含构建配置文件（.vcxproj / .props / .sln / .pro / .pri / CMakeLists.txt / Makefile），无论文件数多少，直接判定为重大变更
  - 无 git 环境时由 AI 人工判断文件数量级，不确定时走更高级别
- **语言分布**：按变更文件（剔除后）的扩展名自动归类，匹配以下工具链

#### 语言→工具链映射表（自包含，不依赖外部 skill）

| 语言 | 扩展名 | 格式 | Lint | 类型 | 语法检查 |
|------|--------|------|------|------|----------|
| C/C++ | .c/.cpp/.h/.hpp/.cc/.cxx | clang-format | clang-tidy, cppcheck | — | g++ -fsyntax-only / cl /c |
| Go | .go | gofmt, goimports | golangci-lint, staticcheck | go vet | go build -o /dev/null |
| JS/TS | .js/.ts/.jsx/.tsx | prettier, dprint | eslint, oxlint | tsc --noEmit | node --check (JS) |
| Python | .py | ruff format, black | ruff, flake8, pylint | mypy, pyright | python -m py_compile |
| Rust | .rs | rustfmt | cargo clippy | cargo check | cargo build (Debug) |

### 步骤 2：静态检查

按步骤 1 语言映射表中的工具，对变更文件涉及的语言依次执行格式→Lint→类型→语法检查。仅执行变更语言对应的检查项，每项独立运行并报告。

### 步骤 3：编译验证

构建验证始终使用 Debug 模式，项目脚本为 Release 时改用 Debug 脚本或添加 Debug 配置参数。

| 构建系统 | Debug 构建命令 |
|----------|--------------|
| **Qt (qmake, Linux)** | `qmake "CONFIG+=debug" "CONFIG+=qml_debug" && make -j$(nproc)` |
| **Qt (qmake, Windows)** | `qmake "CONFIG+=debug" "CONFIG+=qml_debug" && jom -j$(nproc)` |
| **Qt (CMake)** | `cmake -B build -DCMAKE_BUILD_TYPE=Debug && cmake --build build -j$(nproc)` |
| **CMake 通用** | `cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug && cmake --build build -j$(nproc)` |
| **MSVC (sln/vcxproj)** | `msbuild /p:configuration=Debug /m` |
| **Generic Makefile** | `make -j$(nproc)` |

三级分级均使用上表命令执行**增量 Debug 构建**。构建系统自行处理模块依赖、头文件追踪与产物缺失，AI 不编排编译顺序。重大级别唯一区别如下：

| 级别 | 条件 | 额外操作 |
|------|------|---------|
| **微小** | ≤3 代码文件 | 无 |
| **中等** | 4~15 代码文件 | 无 |
| **重大** | >15 代码文件，或清单含构建配置文件 | **构建前先重新生成配置**：Qt 先 `qmake`，CMake 先 `cmake -B build`，MSVC 不单独需要，Makefile 先 `./configure` |

### 步骤 4：结构化报告

```
═══ 构建验证报告 ═══
  语言:      {检测到的语言及版本}
  构建系统:  {检测到的构建系统}
  变更规模:  {微小/中等/重大}（{N} 代码文件）
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  构建模式:  Debug

  静态检查:
    ├─ 格式 ({工具})  {✅ 通过 | ⚠️ 建议 (N) | ❌ 失败 | ⏭️ 跳过 — 原因}
    │     {失败/警告时: 文件:行:列 错误消息 → 修复建议}
    ├─ Lint ({工具})   {同上}
    ├─ 类型 ({工具})   {同上}
    └─ 语法 ({工具})   {同上}

  编译验证 ({命令}):
    {✅ 通过 | ❌ 失败 — 原始错误}

═══ 结论: {✅ 全部通过 | ⚠️ 部分通过 (N 项警告) | ❌ N 项失败} ═══
```

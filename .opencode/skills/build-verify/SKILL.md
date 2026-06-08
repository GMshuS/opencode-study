---
name: build-verify
description: 当编写、修改、生成、删除代码后调用。执行编译验证，确保代码至少能成功构建（编译通过、类型检查通过、Linter检查通过）。
---

# 自动代码验证 Skill

## 核心原则

**优先使用项目命令** — 按以下优先级推断验证命令：项目构建脚本 > 项目配置文件（package.json scripts、Cargo.toml 等） > 语言标准通用命令

**降级不跳过** — 项目命令不可用时，使用语言标准通用命令验证，而非跳过

## 验证流程

### 步骤 1: 识别语言和环境
根据修改的文件扩展名确定编程语言和运行环境：
- **Python**: .py 文件
- **JS/TS**: .js / .ts 文件
- **Go**: .go 文件
- **Rust**: .rs 文件
- **Java**: .java 文件
- **C#**: .cs 文件  
- **C/C++**: .c / .cpp / .h / .hpp 文件
- **其他**: 根据项目配置或用户提示确定

### 步骤 2: 执行静态检查

#### 步骤 2.1 类型检查（如项目启用）

按优先级推断类型检查命令：

1. **项目配置文件** — 检查 package.json 的 `scripts` 字段中的 `typecheck` / `type-check` / `typescript:check` 等自定义命令；Go 项目检查 `go vet` 是否已在 Makefile 中定义
2. **语言标准命令** — 如未在项目中找到自定义命令，使用以下通用命令：
   - JavaScript/TypeScript: `npx tsc --noEmit`（如项目使用 TypeScript）
   - Rust: `cargo check`
   - Go: `go vet ./...`
   - Python: `mypy .`（如检测到 mypy 配置）
   - Java: `mvn compile`（编译即类型检查）
   - .NET: `dotnet build --no-restore`（编译即类型检查）
   - C/C++: 依赖编译器类型检查（编译失败即类型错误）
3. **其他** — 根据项目实际使用的工具链推断（如检测到 `tsconfig.json` 则用 `tsc`，检测到 `pyproject.toml` 中 mypy 配置则用 `mypy`）

#### 步骤 2.2 Linter 检查（如项目启用）

按优先级推断 Linter 命令：

1. **检测配置文件** — 检查项目根目录是否存在以下配置文件，若有则运行对应工具：
   - `.eslintrc.*` / `eslintConfig` in package.json → `npx eslint <涉及文件>`
   - `.biomerc` / `biome.json` → `npx @biomejs/biome check <涉及文件>`
   - `.flake8` / `[flake8]` in `setup.cfg` → `flake8 <涉及文件>`
   - `pyproject.toml` 中 `[tool.ruff]` → `ruff check <涉及文件>`
   - `.clang-tidy` → `clang-tidy <涉及文件>`
   - `checkstyle.xml` → `mvn checkstyle:check`
   - `stylecop.json` → `dotnet format --verify-no-changes`
   - 无配置文件 → 跳过并告知用户
2. **项目命令** — 检查 package.json 或类似配置文件中的 `scripts.lint` 或 `scripts.lint:check`
3. **语言标准命令** — 如未找到配置文件和自定义命令，但已知该语言有通用 Linter，可作为兜底（如 Go 的 `go vet ./...`、Rust 的 `cargo clippy`）

### 步骤 3: 执行构建验证

#### 步骤 3.1 检查项目构建命令
检查项目根目录（或 AGENTS.md 所在目录）：
1. **工程构建脚本** — 项目根目录下的 *.bat / *.sh / Makefile 等编译脚本
2. **项目专用构建脚本** — 优先检查 AGENTS.md / CODEBUDDY.md、package.json 中的 `scripts.build`、Cargo.toml 等清单文件中定义的构建命令
3. **语言通用命令** — 各语言的标准编译/运行命令
4. **Monorepo 子包** — 若检测到项目使用 monorepo 结构（如 package.json 含 workspaces、pnpm-workspace.yaml、lerna.json），尝试定位修改文件所属子包，在其子目录内执行构建命令

#### 步骤 3.2 执行构建验证

使用步骤 3.1 发现的构建命令执行；如未找到，按以下优先级推断：

1. **项目构建脚本** — 项目根目录下的 `build.bat` / `build.sh` / Makefile
2. **项目配置文件中的命令**：
   - Node.js 项目：`npm run build`（或 pnpm/yarn/bun 对应命令）
   - Rust 项目：`cargo build`
   - Go 项目：`go build ./...`
   - Python 项目：运行 `setup.py build` / `python -m build`，或直接 `python -m py_compile <filename>`
   - Java 项目：`mvn compile` 或 `gradle build`
   - .NET 项目：`dotnet build --no-restore`
3. **Monorepo** — 若项目使用 monorepo 结构，需在修改文件所属子包目录内执行构建

> 优先使用 Debug 配置（项目已指定 Release 除外），Debug 提供更详细的错误信息。

> Windows 上 C/C++ 项目构建需要 Visual Studio 开发者命令提示符环境。示例（仅供参考，需根据实际项目类型调整）：
> - MSVC 项目：`msbuild /t:rebuild /p:configuration=Debug`
> - CMake 项目：`cmake --build build --config Debug`
> - Qt 项目：`qmake && jom`

### 步骤 4: 结果处理与报告
- **成功**: 告知用户验证通过及使用的验证方式（优先级路径：项目脚本 > 配置文件命令 > 通用命令 / 降级检查）
- **失败（编译类错误）**: 分析错误信息，向用户报告：
  - 使用的验证方式与命令（标注所属优先级层级）
  - 错误原因
  - 修复方案
  - **不自动重试**，由用户决定是否修复后重新触发
- **失败（环境/工具链缺失）**: 告知用户当前环境无法完整编译，但已执行了最高可用级别的验证方式

## 注意事项
- **不要跳过验证步骤** — 至少执行到当前环境可用的最高级别
- **不要假设代码能正常工作，必须实际运行验证**
- 如果项目有测试脚本，优先运行测试
- 如果验证超时，适当调整超时时间后重试
- Web服务器类应用：启动后等待3-5秒确认无报错即视为通过，然后停止
- **工具链缺失不是跳过验证的理由** — 使用静态分析或格式化检查作为保底

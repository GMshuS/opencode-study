---
name: auto-verify-code
description: 当编写、修改、生成、删除代码后调用。任何代码文件变动后都要触发。
---

# 自动代码验证 Skill

## 核心原则

**环境检查** — 在执行编译前，先确认必要工具链是否可用：
- 如果工具链缺失，自动跳入降级验证流程
- 不报错中断，而是执行尽可能强的验证方式
**降级验证** — 工具链不可用时执行静态检查而非跳过

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

### 步骤 2: 执行验证步骤

#### 步骤 2.1 检查项目构建命令
检查项目根目录（或 AGENTS.md 所在目录）：
1. **工程构建脚本** — 项目根目录下的 *.bat / *.sh / Makefile 等编译脚本
2. **项目专用构建脚本** — 优先检查 AGENTS.md / CODEBUDDY.md、package.json 中的 `scripts.build`、Cargo.toml 等清单文件中定义的构建命令
3. **语言通用命令** — 各语言的标准编译/运行命令
4. **Monorepo 子包** — 若检测到项目使用 monorepo 结构（如 package.json 含 workspaces、pnpm-workspace.yaml、lerna.json），尝试定位修改文件所属子包，在其子目录内执行构建命令

#### 步骤 2.2 执行构建验证
如果第一步已明确构建命令，则直接执行；否则按语言执行以下命令：
1 **Python**: `python -m py_compile <filename>` 检查语法，然后 `python <filename>` 运行验证（Flask等web应用运行3-5秒后停止）
2 **JS/TS**: 根据锁文件自动选择包管理器（npm/pnpm/yarn/bun）：
   - `npm run build` / `pnpm run build` / `yarn build` / `bun run build`
   - `npx tsc --noEmit` / `pnpm exec tsc --noEmit`（TypeScript 类型检查）
   - `node <filename>`（直接运行）
   - `npm test` / `pnpm test` / `yarn test`（运行测试）
3 **Go**: `go build <filename>` 或 `go run <filename>` 或 `go test`
4 **Rust**: `cargo build` 或 `cargo check`
5 **Java**: `mvn compile` 或 `gradle build`
6 **C#**:
   - .NET Core/5+ 项目: `dotnet build --no-restore`
   - .NET Framework 项目: `msbuild /t:Build /p:Configuration=Release`
7 **C/C++**: 根据项目类型使用对应的编译命令：
7.1 **MSVC 项目**: 使用 `msbuild` 进行编译并运行，示例如下：
```bat
:: 使用 vswhere 动态定位最新 VS 实例
for /f "usebackq tokens=*" %%i in (`"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -property installationPath`) do set "VSROOT=%%i"
if not defined VSROOT (
    echo 未找到 Visual Studio 安装路径
    goto err
)
call "%VSROOT%\VC\Auxiliary\Build\vcvarsall.bat" x86
msbuild /t:rebuild /p:configuration=release
```
7.2 **Qt 项目**: 使用 `QMake + jom + MSVC` 进行编译，示例如下：
```bat
@echo off
setlocal enabledelayedexpansion

echo === Build (Debug) ===

:: 使用 vswhere 动态定位最新 VS 实例
for /f "usebackq tokens=*" %%i in (`"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -latest -property installationPath`) do set "VS_ROOT=%%i"
if not defined VS_ROOT (
	echo [ERROR] Visual Studio not found
	exit /b 1
)
call "%VS_ROOT%\VC\Auxiliary\Build\vcvarsall.bat" x86
if errorlevel 1 (
	echo [ERROR] VS environment init failed
	exit /b 1
)

:: 以下变量由调用者根据实际情况设置
:: set "PROJECT_DIR=."
:: set "PROJECT=MyProject"

cd /d "%PROJECT_DIR%"

echo === Step 1: Running qmake ===
qmake.exe "%PROJECT%.pro" -r -spec win32-msvc "CONFIG+=debug"
if errorlevel 1 (
	echo [ERROR] qmake failed
	exit /b 1
)

echo === Step 2: Running jom clean ===
jom.exe clean

echo === Step 3: Running jom build ===
jom.exe
if errorlevel 1 (
	echo [ERROR] build failed
	exit /b 1
)

echo === Build SUCCESS ===
```
7.3 **CMake 项目**:
    ```bat
    if not exist "build" mkdir build
    cd build
    cmake ..
    cmake --build . --config Release
    ```
    （若已配置过 build 目录，可直接使用 `cmake --build build`）
8 **其他**: 使用对应的编译/运行命令

#### 步骤 2.3 类型检查（如项目启用）
- TypeScript: `npx tsc --noEmit`
- Python: `mypy <涉及文件>`
- Go: `go vet ./...`
- Rust: `cargo check`
- Java: `mvn compile` 或 `gradle compileJava`
- .NET Core/5+ 项目: `dotnet build --no-restore`（编译时会进行类型检查）
- .NET Framework 项目: 使用 `msbuild` 进行编译，编译失败即视为类型错误
- C/C++: 依赖编译器的类型检查，编译失败即视为类型错误
- **其他**: 根据项目配置或用户提示确定类型检查工具和命令

#### 步骤 2.4 Linter 检查（如项目启用）
在运行 Linter 前，先检测项目是否存在对应配置文件，若不存在则跳过并告知用户：
- ESLint: `.eslintrc.*` 或 `eslintConfig` in package.json
- Flake8: `.flake8` 或 `setup.cfg` 中的 `[flake8]`
- Clang-Tidy: `.clang-tidy`
- Checkstyle: `checkstyle.xml`（Maven 项目默认位置）
- StyleCop: `stylecop.json`
- .NET 内置: `dotnet format` 无需配置文件
- JS/TS: `npx eslint <涉及文件>`
- Python: `flake8 <涉及文件>`
- Go: `go vet ./...`
- C/C++: `clang-tidy <涉及文件>`
- Rust: `cargo clippy`
- Java: `mvn checkstyle:check` 或 `gradle checkstyleMain`
- .NET 项目: `dotnet format --verify-no-changes`
- .NET Framework 项目: 跳过或使用 StyleCop 命令行工具
- **其他**: 根据项目配置或用户提示确定 Linter 工具和命令

### 步骤 3: 结果处理与报告
- **成功**: 告知用户验证通过及使用的验证方式（项目脚本 / 通用命令 / 降级检查）
- **失败（编译类错误）**: 分析错误信息，向用户报告：
  - 验证方式与命令
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

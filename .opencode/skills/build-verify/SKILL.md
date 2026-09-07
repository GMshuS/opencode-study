---
name: build-verify
description: 代码变更后执行构建验证。增量优先、失败驱动升级，识别源文件增删与配置过期，执行静态检查→编译验证→结构化报告。
---

# 构建验证 Skill

## 核心原则

- **先静态，后编译** — 先做不依赖运行时的检查（格式/Lint/类型），快速发现错误
- **增量优先，失败驱动升级** — 一律先增量 Debug 构建；仅当「源文件增删」或「错误指向文件未收录/配置过期」时才重新生成配置。构建系统处理依赖，AI 不做依赖追踪与编译顺序编排
- **通过 ≠ 正确** — 构建系统不会自动收录新增源文件，增量构建可能静默"成功"而新文件根本没编译。新增源文件后必须校验产物存在
- **仅 Debug 模式** — 构建验证始终使用 Debug，不做 Release。项目脚本默认为 Release 时改用 Debug 配置。执行前确认编译参数含 `-Zi`/`-g` 且无 `-O2`/`-DNDEBUG`
- **降级不跳过** — 工具链缺失时使用语言内置语法检查保底；跳过项需说明原因，至少执行到语法检查级别
- **独立报告** — 每项检查独立执行，不因一项失败跳过其他；报告含工具名、结果、错误详情（文件:行:列 + 修复建议）
- **优先项目脚本** — 项目已提供 .vcxproj / .pro / .sln / CMakeLists.txt / Makefile / build.bat / build.sh 时优先使用，不自行拼写编译命令。仅当项目无任何构建脚本/配置时，才回退到文档命令表

## 工作流程

### 步骤 1：识别构建系统与变更

自行完成以下探测：

- **构建脚本/配置**：见核心原则「优先项目脚本」。有则直接用，无需猜测工具链
- **无构建脚本时**：识别构建配置类型 + 检查工具链（`which g++` / `node --version` 等）
- **Debug 脚本**：检查 `build_debug.bat` / `Makefile.Debug` 等专用脚本
- **源文件增删检测**：执行 `git status --porcelain -uall -z`，查看有无 `??`（未跟踪新增）/ `A`（已暂存新增）/ `D`（删除）状态的源码文件
  - **`-uall` 必须** — 默认把未跟踪目录折叠成一行（`?? src/newmod/`），看不到具体文件
  - **`-z` 必须** — 否则非 ASCII 路径被转义成八进制（`"AI\345\267\245..."`），无法解析
  - **禁止用 `git diff`** — 它看不到未跟踪文件，而新增源文件恰恰是未跟踪的
  - 无 git 或采集失败 → 保守起见按「有增删」处理
- **判定层级**：

  | 层级 | 判据 | 有源文件增删时 |
  |------|------|--------------|
  | **Tier A 自动拾取** | Go / Python / JS-TS — 构建系统自动扫描目录 | 无需额外动作 |
  | **Tier B 需显式声明** | C/C++ — 文件列表在配置期固定（CMake SOURCES / .pro SOURCES / .vcxproj / Makefile）| **先重新生成配置** |

  - 混合项目（存在 C/C++ 构建配置）→ 按 Tier B
- **语言分布**：按变更文件的扩展名归类，匹配以下工具链

#### 语言→工具链映射表（自包含，不依赖外部 skill）

> 一格多工具时：项目有配置（`.clang-tidy` / `.eslintrc` / `pyproject.toml` 等）按其配置；无配置时用**第一个**。

| 语言 | 扩展名 | 格式 | Lint | 类型 | 语法检查 |
|------|--------|------|------|------|----------|
| C/C++ | .c/.cpp/.h/.hpp/.cc/.cxx | clang-format | clang-tidy, cppcheck | — | g++ -fsyntax-only / cl /c |
| Go | .go | gofmt, goimports | golangci-lint, staticcheck | go vet | go build -o /dev/null |
| JS/TS | .js/.ts/.jsx/.tsx | prettier, dprint | eslint, oxlint | tsc --noEmit | node --check (JS) |
| Python | .py | ruff format, black | ruff, flake8, pylint | mypy, pyright | python -m py_compile |

### 步骤 1.5：Windows MSVC 工具链探测

**触发条件**：变更含 C/C++ 文件且目标为 Windows（有 .vcxproj / .sln，或 CMakeLists.txt 声明 MSVC）。否则整节跳过。

用 vswhere 定位 `VsDevCmd.bat`：

```cmd
"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -all -prerelease -products * -property installationPath
```

- 取输出路径拼接 `\Common7\Tools\VsDevCmd.bat`；**多结果时按项目 `.vcxproj` / `.props` 的 `<PlatformToolset>` 选择对应 VS 版本**，禁止"取最新"或"取第一行"——vswhere 输出不保证按版本排序，且最新的 BuildTools 常缺 MFC 等组件，会导致 `UseOfMfc` 项目失败
- vswhere.exe 不存在 → 枚举常见安装位置（含 `C:\CommonDev\` 等自定义路径）下的 `Common7\Tools\VsDevCmd.bat`

**失败时**：降级 `cl.exe /c /Zs` 语法检查（cl 不在 PATH 则跳过），报告中说明原因。
⚠️ 禁止断言"未安装 MSVC"——可能只是未探测到；此时提示用户可用 `MSVC_VSDEVCMD_PATH` 环境变量强制指定。

### 步骤 2：静态检查

按步骤 1 语言映射表中的工具，对变更文件涉及的语言依次执行格式→Lint→类型→语法检查。仅执行变更语言对应的检查项，每项独立运行并报告。

### 步骤 3：编译验证

按以下优先级选择构建方式：
1. 项目已有 Debug 构建脚本（build_debug.bat / build_debug.sh 等）→ 直接执行
2. 项目有构建配置但无专用 Debug 脚本 → 用 Debug 参数调用（.vcxproj / .pro / CMakeLists.txt / Makefile）
3. 无任何构建配置 → 按下方命令表执行

构建验证始终使用 Debug 模式，项目脚本为 Release 时改用 Debug 脚本或添加 Debug 配置参数。

| 构建系统 | Debug 构建命令 |
|----------|--------------|
| **Qt (qmake, Linux)** | `qmake "CONFIG+=debug" "CONFIG+=qml_debug" && make -j$(nproc)` |
| **Qt (qmake, Windows)** | `qmake "CONFIG+=debug" "CONFIG+=qml_debug" && jom -j$(nproc)` |
| **Qt (CMake)** | `cmake -B build -DCMAKE_BUILD_TYPE=Debug && cmake --build build -j$(nproc)` |
| **CMake 通用** | `cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug && cmake --build build -j$(nproc)` |
| **MSVC (sln/vcxproj)** | `call "<步骤 1.5 探测到的 VsDevCmd.bat>" -arch=x64 && msbuild <sln 或 vcxproj> /p:Configuration=Debug /p:Platform=x64 /m` |
| **Generic Makefile** | `make -j$(nproc)` |

> ⚠️ `VsDevCmd.bat` 设置的 PATH / INCLUDE / LIB **仅对当前 shell 会话有效**，必须与 `msbuild` 用 `&&` 写在**同一条命令**里，
> 否则报 `cl.exe 不是内部或外部命令` / `MSB4019`。非 cmd 环境用 `cmd /c "call ... && msbuild ..."` 包裹。

**一律先增量 Debug 构建**。构建系统自行处理模块依赖、头文件追踪与产物缺失，AI 不编排编译顺序。

**唯一前置动作**：Tier B 且检测到源文件增删 → 构建前重新生成配置
- CMake `cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug` / Qt `qmake` / Makefile `./configure` / MSVC 不需要（msbuild 自动检测 vcxproj 变化）
- ⚠️ 配置层 ≠ 编译层：**`make clean && make`（全量）不解决新增文件问题**——Makefile 本身没变，新文件依然不在里面

**构建失败时**：按下表判断是否重试，**重试上限 1 次**

| 错误特征 | 判定 | 动作 |
|---------|------|------|
| `undefined reference to X`（X 在新增文件里）| 文件未收录 | 重新生成配置后重试 |
| `No rule to make target 'xxx.o'` | 文件未收录 | 重新生成配置后重试 |
| `fatal error: ui_xxx.h` / `moc_xxx.h` / `xxx.pb.h` | 生成源过期 | 重新生成配置后重试 |
| `cannot find -lxxx` | 依赖缺失 | 安装依赖后重试 |
| 语法 / 类型 / 拼写错误 | 真错误 | 报告失败，不重试 |

⚠️ **防假通过**：Tier B 有新增源文件时，构建后校验对应产物存在——检查 `build/` 下出现对应的 `.o` / `.obj`。产物缺失 → **报为问题，不得记为通过**。

### 步骤 4：结构化报告

```
═══ 构建验证报告 ═══
  语言:      {检测到的语言及版本}
  构建系统:  {检测到的构建系统}
  层级:      {Tier A 自动拾取 | Tier B 需显式声明}
  变更:      {N} 文件（新增 {a} / 修改 {m} / 删除 {d}）
  动作:      {直接增量 | 重新生成配置后增量}
  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─
  构建模式:  Debug

  静态检查:
    ├─ 格式 ({工具})  {状态}
    ├─ Lint ({工具})  {状态}
    ├─ 类型 ({工具})  {状态}
    └─ 语法 ({工具})  {状态}
    {失败/警告时: 文件:行:列 错误消息 → 修复建议}

  状态: ✅ 通过 | ⚠️ 建议 (N) | ❌ 失败 | ⏭️ 跳过 — 原因

  编译验证 ({命令}):
    {✅ 通过 | ❌ 失败 — 原始错误}

═══ 结论: {✅ 全部通过 | ⚠️ 部分通过 (N 项警告) | ❌ N 项失败} ═══
```

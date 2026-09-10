---
name: build-verify
description: 代码变更后执行构建验证并给出明确结论。依赖同步 → 静态检查 → 编译验证 → 结构化报告；严重性由本 skill 判定，调用方只需按结论行动。
---

# 构建验证 Skill

## 核心原则

- **优先项目脚本** — 项目已有构建脚本/配置（Makefile / CMakeLists.txt / .pro / .sln / package.json 等）就用项目的，不自行拼命令
- **增量 Debug 优先** — 一律增量 Debug 构建；仅当源文件增删或错误指向配置过期时才重新生成配置
- **降级不跳过** — 工具链缺失时至少执行到语法检查；跳过项须说明原因
- **只报告不修复** — 不改业务代码、不改配置
- **结论必须明确** — 严重性由本 skill 判定并直接给出结论，调用方无需自行判断该不该阻塞

## 工作流程

### 步骤 1：识别变更与构建系统

- **检测源文件增删**：`git status --porcelain -uall -z`
  （`-uall` 才能看到目录内新增的具体文件，`-z` 避免非 ASCII 路径转义；
  **不可用 `git diff`**——它看不到未跟踪文件，而新增源文件恰恰是未跟踪的）
- 按项目已有配置识别构建系统与构建命令（语言 / 工具链按项目配置自行判断，无需查表）

### 步骤 2：依赖同步

检测依赖清单并安装缺失依赖（清单文件与安装命令按项目生态自行判断）。
安装失败 → 重试 1 次 → 仍失败判为**环境阻断**，报告给出原始错误与建议动作，不再重试。

### 步骤 3：静态检查

按项目已有配置执行格式 / Lint / 类型 / 语法检查，逐项独立报告。
工具未配置或不可用 → 标记 `⏭️ 跳过 — 原因`，**不判失败**；语法检查保底执行（见「降级不跳过」）。

### 步骤 4：编译验证

执行增量 Debug 构建（易错的构建命令见「附录 B」，其余按项目配置常规执行）。

两个反直觉点：

- **新增源文件不会被自动收录**：文件列表在配置期固定的构建系统（CMake SOURCES / .pro / .vcxproj / Makefile）
  不会自动收录新文件，增量构建会静默"成功"而新文件根本没编译。
  有源文件增删时须**先重新生成配置**；`make clean && make` **无效**（Makefile 本身没变）。
- **防假通过**：上述构建系统新增源文件后，须校验 `build/` 下出现对应的 `.o` / `.obj`；缺失 → 报为问题。

构建失败时区分「文件未收录 / 生成源过期 / 依赖缺失」（可重试 1 次）与「语法·类型真错误」（不重试）。

### 步骤 5：结论与报告

**严重性由本 skill 判定**：

| 结论 | 含义 |
|------|------|
| ✅ 通过 | 无问题 |
| ⚠️ 通过（N 项建议） | 仅有格式 / Lint 等不影响构建的问题 |
| ❌ 未通过 | 编译 / 类型 / 语法失败，或依赖缺失等阻断项 |
| ⏭️ 环境阻断 | 验证跑不起来（网络 / 工具链 / 权限） |

**环境 vs 代码**：「跑不起来」是环境问题（如依赖装不上），「跑起来结果不对」是代码问题（如编译报错）。
存疑时**按代码问题处理**，且必须附实际命令的原始错误输出——禁止凭猜测判定环境问题。

```
═══ 构建验证报告 ═══
  语言/构建系统: {...}
  变更: {N} 文件（新增 a / 修改 m / 删除 d）
  依赖同步: {✅ 已就绪 | ⚠️ 已安装 N 个 | ⏭️ 跳过 — 原因 | ❌ 阻断 — 原因}
  静态检查: {格式 / Lint / 类型 / 语法 逐项状态；跳过须说明原因}
            {失败/警告: 文件:行:列 错误消息 → 修复建议}
  编译验证 ({命令}): {✅ 通过 | ❌ 失败 — 原始错误}

═══ 结论: {✅ 通过 | ⚠️ 通过（N 项建议） | ❌ 未通过 — 原因 | ⏭️ 环境阻断 — 原因} ═══
```

> 测试不属于本 skill，由 `test-verify` 承担。

## 附录 A：Windows MSVC 工具链探测

> 仅当变更含 C/C++ 且目标为 Windows（有 .vcxproj / .sln，或 CMakeLists 声明 MSVC）时执行。

1. 用 vswhere 定位安装路径：

```cmd
"%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe" -all -prerelease -products * -property installationPath
```

2. 取输出路径拼接 `\Common7\Tools\VsDevCmd.bat`
   - **多结果时按项目 `.vcxproj` / `.props` 的 `<PlatformToolset>` 选对应 VS 版本**，
     禁止取最新或第一行——vswhere 输出不保证按版本排序，且最新的 BuildTools 常缺 MFC 等组件，会导致 `UseOfMfc` 项目失败
   - vswhere.exe 不存在 → 枚举常见安装位置（含 `C:\CommonDev\` 等自定义路径）下的 `Common7\Tools\VsDevCmd.bat`

3. **探测失败**：降级 `cl.exe /c /Zs` 语法检查（cl 不在 PATH 则跳过），报告中说明原因。
   ⚠️ 禁止断言"未安装 MSVC"——可能只是未探测到；此时提示用户可用 `MSVC_VSDEVCMD_PATH` 环境变量强制指定。

## 附录 B：构建系统 Debug 命令表

> 仅列出易错的构建系统；其余（CMake `cmake -S . -B build -DCMAKE_BUILD_TYPE=Debug`、Makefile `make -j` 等）
> 按项目配置常规执行，不逐一列出。

| 构建系统 | Debug 构建命令 |
|----------|--------------|
| **MSVC (sln/vcxproj)** | `call "<附录 A 探测到的 VsDevCmd.bat>" -arch=x64 && msbuild <sln 或 vcxproj> /p:Configuration=Debug /p:Platform=x64 /m` |
| **Qt (qmake, Linux)** | `qmake "CONFIG+=debug" "CONFIG+=qml_debug" && make -j$(nproc)` |
| **Qt (qmake, Windows)** | `qmake "CONFIG+=debug" "CONFIG+=qml_debug" && jom -j$(nproc)` |

> ⚠️ `VsDevCmd.bat` 设置的 PATH / INCLUDE / LIB **仅对当前 shell 会话有效**，必须与 `msbuild` 用 `&&` 写在**同一条命令**里，
> 否则报 `cl.exe 不是内部或外部命令` / `MSB4019`。非 cmd 环境用 `cmd /c "call ... && msbuild ..."` 包裹。

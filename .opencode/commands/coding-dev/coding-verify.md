---
name: verify-code
description: 当编写、修改、生成、删除代码后，用于验证代码是否能正常运行。
---

# 自动代码验证 Skill

## 触发条件（必须遵守）
**每次完成以下任何操作后，必须立即调用此 skill 进行验证：**
- 编写新代码文件
- 修改现有代码文件
- 生成脚本或程序
- 删除代码文件
- 修改配置文件

**不要等待用户要求，修改完成后立即执行验证。**

## 核心原则

### 验证优先级策略（自上而下）
1. **项目专用构建脚本** — 优先检查 AGENTS.md / CODEBUDDY.md 中定义的构建命令
2. **工程构建脚本** — 项目根目录下的 build.bat / build.sh / Makefile 等
3. **语言通用命令** — 各语言的标准编译/运行命令
4. **降级验证** — 工具链不可用时执行静态检查而非跳过

### 环境检查
在执行编译前，先确认必要工具链是否可用：
- 如果工具链缺失，自动跳入降级验证流程
- 不报错中断，而是执行尽可能强的验证方式

## 验证流程

### 1. 识别语言和环境
根据修改的文件扩展名确定编程语言和运行环境

### 2. 执行验证步骤

#### 第一步：检查项目构建命令
检查项目根目录（或 AGENTS.md 所在目录）：
1. 存在 AGENTS.md / CODEBUDDY.md → 提取其中的构建命令
2. 存在 build.bat / build.sh / Makefile / CMakeLists.txt → 记为备选

#### 第二步：执行构建验证
1. 如果`第一步：检查项目构建命令`已经明确构建命令，则直接执行；否则，按照后面的`验证指导`执行
2. 验证指导
2.1 **Python**: `python -m py_compile <filename>` 检查语法，然后 `python <filename>` 运行验证（Flask等web应用运行3-5秒后停止）
2.2 **Node.js**: `node <filename>` 或 `npm test`
2.3 **Go**: `go build <filename>` 或 `go run <filename>` 或 `go test`
2.4 **C/C++**: 使用Visual Studio或GCC编译并运行
2.4.1 MSVC 项目：使用`msbuild`进行编译并运行，示例如下：
```bat
call "%VS100COMNTOOLS%..\..\vc\vcvarsall.bat" x86

if not exist "%VS100COMNTOOLS%" (
	echo 未找到VC安装路径，无法法编译
	goto err
)

msbuild /t:rebuild  /p:configuration=release
```
- QT 项目：使用`QMake+jom+MSVC`进行编译并运行，示例如下：
```bat
@echo off
setlocal enabledelayedexpansion

echo === Build ClientSession_GMUnitidTest (Debug) ===

REM === Call VS2017 vcvarsall.bat to setup compiler environment ===
echo === Setting up VS2017 environment ===
if exist "C:\CommonDev\Microsoft Visual Studio\2017\Community\VC\Auxiliary\Build\vcvarsall.bat" (
    call "C:\CommonDev\Microsoft Visual Studio\2017\Community\VC\Auxiliary\Build\vcvarsall.bat" x86
) else (
    echo [WARNING] VS2017 vcvarsall.bat not found, trying to find cl.exe
    where cl >nul 2>&1
    if errorlevel 1 (
        echo [ERROR] cl.exe compiler not found in PATH
        echo Please run this script from VS2017 Developer Command Prompt
        exit /b 1
    )
)

cd /d D:\Git\ClientSession-Qt-master\ClientSession_GMUnitidTest

echo === Step 1: Running qmake ===
C:\Qt\Qt5.14.2\5.14.2\msvc2017\bin\qmake.exe ClientSession_GMUnitidTest.pro -r -spec win32-msvc "CONFIG+=debug"
if errorlevel 1 (
    echo [ERROR] qmake failed
    exit /b 1
)

echo === Step 2: Running jom clean ===
C:\Qt\Qt5.14.2\Tools\QtCreator\bin\jom.exe clean

echo === Step 3: Running jom build ===
C:\Qt\Qt5.14.2\Tools\QtCreator\bin\jom.exe
if errorlevel 1 (
    echo [ERROR] build failed
    exit /b 1
)

echo === Build SUCCESS ===
echo Output: D:\Git\ClientSession-Qt-master\ClientSession_GMUnitidTest\bin\ClientSession_GMUnitidTest.exe
```
- 如果是 CMake 的项目使用`CMake` 进行编译并运行

2.5 **其他**: 使用对应的编译/运行命令

### 3. 结果处理
- **成功**: 告知用户验证通过及使用的验证方式
- **失败（编译类错误）**: 分析错误信息，自动修复后重新验证
- **失败（环境/工具链缺失）**: 告知用户当前环境无法完整编译，但已执行了最高可用级别的验证

### 4. 报告
向用户报告：
- 验证方式（项目脚本 / 通用命令 / 降级检查）
- 验证命令
- 验证结果
- 如有错误，错误原因和修复方案

## 注意事项
- **不要跳过验证步骤** — 至少执行到当前环境可用的最高级别
- **不要假设代码能正常工作，必须实际运行验证**
- 如果项目有测试脚本，优先运行测试
- 如果验证超时，适当调整超时时间后重试
- Web服务器类应用：启动后等待3-5秒确认无报错即视为通过，然后停止
- **工具链缺失不是跳过验证的理由** — 使用静态分析或格式化检查作为保底

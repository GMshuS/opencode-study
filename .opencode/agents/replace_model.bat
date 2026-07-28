@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: 参数校验
if "%~2"=="" (
    echo 用法：%~nx0 目标目录 新model字符串
    echo 示例：%~nx0 dev-flow opencode-go/deepseek-v4-flash
    pause
    exit /b 1
)
set "TARGET_DIR=%~1"
set "NEW_MODEL=%~2"

:: 校验目录
if not exist "%TARGET_DIR%" (
    echo 错误：目录 "%TARGET_DIR%" 不存在！
    pause
    exit /b 1
)

echo =============================================
echo 目标目录：%TARGET_DIR%
echo 替换后 model 值：%NEW_MODEL%
echo =============================================

:: PowerShell单行命令，修复正则替换字符串转义问题
powershell -Command "$dir='%TARGET_DIR%';$newModel='%NEW_MODEL%';Get-ChildItem -Path $dir -File -Recurse | ForEach-Object { $file=$_.FullName;Write-Host ('正在处理文件：' + $file);$txt=Get-Content $file -Raw -Encoding UTF8;$txt=$txt -replace '(?m)^(\s*)model:\s*.+', ('$1model: ' + $newModel);Set-Content $file $txt -Encoding UTF8; }"

echo.
echo ✅ 全部文件替换完成！
pause
endlocal

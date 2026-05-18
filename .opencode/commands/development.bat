@echo off
setlocal enabledelayedexpansion

:: Define two target directories
set "TARGET_DIR1=%USERPROFILE%\.config\opencode\commands"
set "TARGET_DIR2=%USERPROFILE%\.roo\commands"
set "TARGET_DIR3=%USERPROFILE%\.trae-cn\commands"
set "TARGET_DIR4=%USERPROFILE%\.codebuddy\commands"
set "TARGET_DIR5=%USERPROFILE%\.claude\commands"


:: Create directories and copy folders
for %%D in ("%TARGET_DIR1%" "%TARGET_DIR2%" "%TARGET_DIR3%" "%TARGET_DIR4%" "%TARGET_DIR5%") do (
    set "DEST=%%~D"
    if not exist "!DEST!" (
        echo Creating directory: !DEST!
        mkdir "!DEST!" >nul 2>&1
        if errorlevel 1 (
            echo ERROR: Failed to create target directory "!DEST!"
            pause
            exit /b 1
        )
    )

    echo.
    echo Copying folders to: "!DEST!"
    echo ----------------------------------------------------

    :: Iterate over all folders in current directory
    for /d %%S in (*) do (
        echo Copying: %%~nxS
        xcopy /E /I /Y "%%S" "!DEST!\%%~nxS" >nul
        if errorlevel 1 (
            echo WARNING: Failed to copy %%~nxS
        ) else (
            echo Successfully copied: %%~nxS
        )
    )
)

echo.
echo ----------------------------------------------------
echo All folders copied to both directories successfully!
pause
endlocal
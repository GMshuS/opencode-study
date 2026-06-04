@echo off
setlocal enabledelayedexpansion

:: Define two target directories
set "TARGET_DIR1=%USERPROFILE%\.config\opencode\agents"

:: Create directories and copy folders
for %%D in ("%TARGET_DIR1%") do (
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
@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

rem Double-click launcher for the phone sync service.
rem Uses the DSH Node 24 + pnpm 11 runtime when the system Node is too old.

set "DSH_RT="
for /d %%D in ("%USERPROFILE%\.dsh\dsh-runtimes\*") do (
  if exist "%%D\dependencies\node\bin\node.exe" if exist "%%D\dependencies\pnpm\bin\pnpm.mjs" set "DSH_RT=%%D\dependencies"
)

echo Starting phone sync service...
echo.

if defined DSH_RT (
  set "PATH=!DSH_RT!\node\bin;%PATH%"
  "!DSH_RT!\node\bin\node.exe" "!DSH_RT!\pnpm\bin\pnpm.mjs" --filter @blog/relay start
) else (
  call pnpm --filter @blog/relay start
)

if errorlevel 1 (
  echo.
  echo The service exited with an error. Press any key to close.
  pause >nul
)

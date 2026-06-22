@echo off
REM Automated GitHub & Vercel Deployment Script
REM For Vinayaka Transport Project

echo.
echo ========================================
echo  VINAYAKA TRANSPORT - DEPLOYMENT SETUP
echo ========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed!
    echo Download from: https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Navigate to project
cd c:\Users\lokil\Downloads\vinayaka-transport

echo.
echo [1] Checking git status...
git status
echo.

echo [2] GitHub Account Information
echo Account: lokeshreddym2005-crypto
echo.

echo [3] Setup Instructions:
echo.
echo STEP 1 - Authenticate with GitHub:
echo   Option A: Install GitHub CLI from https://cli.github.com
echo   Then run: gh auth login
echo.
echo   Option B: Generate Personal Access Token:
echo   - Go to: https://github.com/settings/tokens
echo   - Create new token (classic)
echo   - Copy token
echo   - Use as password when prompted
echo.

echo STEP 2 - Create Repository on GitHub:
echo   1. Go to: https://github.com/new
echo   2. Name: vinayaka-transport
echo   3. Public repo
echo   4. Create without initializing
echo.

echo STEP 3 - Push to GitHub:
echo   Run these commands:
echo.
git remote -v
if errorlevel 1 (
    echo   git remote add origin https://github.com/lokeshreddym2005-crypto/vinayaka-transport.git
)
echo   git branch -M main
echo   git push -u origin main
echo.

echo STEP 4 - Deploy to Vercel:
echo   1. Go to: https://vercel.com
echo   2. Sign up with GitHub
echo   3. Import from: lokeshreddym2005-crypto/vinayaka-transport
echo   4. Root Directory: ./frontend/
echo   5. Deploy!
echo.

echo STEP 5 - Deploy Backend to Railway:
echo   1. Go to: https://railway.app
echo   2. New Project from GitHub repo
echo   3. Add environment variables
echo   4. Deploy!
echo.

echo ========================================
echo  READY TO DEPLOY!
echo ========================================
echo.
pause

#!/bin/bash
# Automated GitHub & Vercel Deployment Script for Vinayaka Transport
# For macOS/Linux users

echo ""
echo "========================================"
echo " VINAYAKA TRANSPORT - DEPLOYMENT SETUP"
echo "========================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed!"
    echo "Install from: https://git-scm.com/download"
    exit 1
fi

# Navigate to project
cd "c:\Users\lokil\Downloads\vinayaka-transport" 2>/dev/null || cd ~/Downloads/vinayaka-transport

echo "[1] Checking git status..."
git status
echo ""

echo "[2] GitHub Account Information"
echo "Account: lokeshreddym2005-crypto"
echo ""

echo "[3] Setup Instructions:"
echo ""
echo "STEP 1 - Authenticate with GitHub:"
echo "  Run: gh auth login"
echo ""
echo "STEP 2 - Create Repository on GitHub:"
echo "  1. Go to: https://github.com/new"
echo "  2. Name: vinayaka-transport"
echo "  3. Public repo"
echo "  4. Create without initializing"
echo ""

echo "STEP 3 - Add Remote and Push:"
echo "  git remote add origin https://github.com/lokeshreddym2005-crypto/vinayaka-transport.git"
echo "  git branch -M main"
echo "  git push -u origin main"
echo ""

echo "STEP 4 - Deploy to Vercel:"
echo "  1. Go to: https://vercel.com"
echo "  2. Sign up with GitHub"
echo "  3. Import repository"
echo "  4. Root Directory: ./frontend/"
echo "  5. Deploy!"
echo ""

echo "STEP 5 - Deploy Backend to Railway:"
echo "  1. Go to: https://railway.app"
echo "  2. New Project from GitHub"
echo "  3. Configure environment variables"
echo "  4. Deploy!"
echo ""

echo "========================================"
echo " READY TO DEPLOY!"
echo "========================================"
echo ""

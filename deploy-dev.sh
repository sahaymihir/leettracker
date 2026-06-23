#!/bin/bash

# Exit on any failure
set -e

echo "================================================="
echo "🧪 LeetCode Tracker — DEV/TEST Deployment Script"
echo "================================================="
echo ""

# 1. Force pull latest changes from the dev branch
echo "📥 STEP 1: Pulling latest changes from repo/dev..."
git fetch repo
# Force reset to match repo/dev exactly, overwriting any local changes
git reset --hard repo/dev
echo "✅ GitHub sync complete!"
echo ""

# 2. Package and Deploy Backend to AWS Lambda (dev functions)
echo "⚡ STEP 2: Packaging & Deploying Backend to AWS Lambda (dev)..."
cd server
npm install

echo "🗜️ Zipping backend files..."
npm run package

echo "☁️ Uploading leettracker-api-dev to AWS..."
aws lambda update-function-code \
  --function-name leettracker-api-dev \
  --zip-file fileb://lambda-deploy.zip \
  --region ap-south-1 \
  --no-cli-pager > /dev/null

echo "☁️ Uploading leettracker-autosync-dev to AWS..."
aws lambda update-function-code \
  --function-name leettracker-autosync-dev \
  --zip-file fileb://lambda-deploy.zip \
  --region ap-south-1 \
  --no-cli-pager > /dev/null

echo "✅ Backend deployed to AWS (dev)!"
cd ..
echo ""

# 3. Frontend Deployment Note
echo "🌐 STEP 3: Frontend Deployment"
echo "The dev Vercel project is linked to the repo and auto-deploys on push!"
echo ""

echo "🎉 ALL DONE! Dev backend updated and live! Vercel is handling the dev frontend! 🚀"

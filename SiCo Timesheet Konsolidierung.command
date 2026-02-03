#!/bin/bash

# Determine the directory where the script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "🚀 Starting SiCo Timesheet Consolidation..."

# 1. Setup Backend
echo "📦 Checking Backend Dependencies..."
if [ ! -d "backend/venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv backend/venv
fi

# Install/Update backend requirements
./backend/venv/bin/pip install -r backend/requirements.txt

# 2. Setup Frontend
echo "📦 Checking Frontend Dependencies..."
npm install

# 3. Open Browser (wait a bit for server to start)
(sleep 5 && open "http://localhost:3002") &

# 4. Start Server
echo "✅ Starting Servers..."
npm run dev

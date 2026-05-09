#!/bin/bash

# Navigate to the web directory relative to this script
cd "$(dirname "$0")/web" || exit

echo -e "\033[32mStarting DocForge Development Server...\033[0m"
echo -e "\033[36mRunning npm install (just in case)...\033[0m"
npm install

echo -e "\033[32mStarting the app...\033[0m"
npm run dev

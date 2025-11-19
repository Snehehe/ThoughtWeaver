@echo off
title ThoughtWeaver Launcher

echo Starting ThoughtWeaver backend...
cd backend
start "ThoughtWeaver Backend" cmd /k "set OPENAI_API_KEY=%OPENAI_API_KEY% && node server.js"
cd ..

echo Starting ThoughtWeaver frontend...
cd frontend
start "ThoughtWeaver Frontend" cmd /k "npm run dev"
cd ..

echo Waiting for frontend to start...
timeout /t 5 >nul

echo Opening ThoughtWeaver in browser...
start "" http://localhost:5173/

echo Done!

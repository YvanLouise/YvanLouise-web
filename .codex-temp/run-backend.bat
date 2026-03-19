@echo off
cd /d "D:\MY procedure\YvanLouise web"
npm --workspace backend run start 1> ".codex-temp\backend.out.log" 2> ".codex-temp\backend.err.log"


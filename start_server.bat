@echo off
chcp 65001 >nul
title Uyghur Medicine App Server
cd /d "%~dp0"
python server.py
pause

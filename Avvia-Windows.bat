@echo off
cd /d "%~dp0"
py -3 app.py
if errorlevel 1 (
  echo Se Python non e trovato, installalo da python.org e abilita il launcher.
  pause
)

@echo off
REM Double-cliquez ou executez: deploy-scrape.bat
cd /d "%~dp0"

echo.
echo === Deploiement scrapeBienImmobilier ===
echo.

echo [1] Verification connexion...
call npx supabase projects list >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERREUR: Non connecte a Supabase.
    echo.
    echo OPTION A - Avec token:
    echo   1. Allez sur https://supabase.com/dashboard/account/tokens
    echo   2. Creez un token
    echo   3. Dans ce dossier, ouvrez PowerShell et tapez:
    echo      $env:SUPABASE_ACCESS_TOKEN="VOTRE_TOKEN"
    echo      .\deploy-scrape.ps1
    echo.
    echo OPTION B - Login:
    echo   1. Ouvrez un terminal et tapez: npx supabase login
    echo   2. Connectez-vous dans le navigateur
    echo   3. Relancez ce fichier deploy-scrape.bat
    echo.
    pause
    exit /b 1
)

echo [2] Liaison du projet...
call npx supabase link --project-ref iiwmtzorwwanjrnhsrah
if errorlevel 1 (
    echo Erreur liaison.
    pause
    exit /b 1
)

echo [3] Deploiement...
call npx supabase functions deploy scrapeBienImmobilier
if errorlevel 1 (
    echo Erreur deploiement.
    pause
    exit /b 1
)

echo.
echo === SUCCES ===
echo La fonction est deployee. Configurez OPENAI_API_KEY dans Supabase.
echo.
pause

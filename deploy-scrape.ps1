# Script de deploiement de scrapeBienImmobilier
# Execute dans PowerShell: .\deploy-scrape.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "`n=== Deploiement scrapeBienImmobilier ===" -ForegroundColor Cyan
Write-Host "Projet: $ProjectRoot`n" -ForegroundColor Gray

Set-Location $ProjectRoot

# Etape 1: Lier le projet
Write-Host "[1/2] Liaison du projet iiwmtzorwwanjrnhsrah..." -ForegroundColor Yellow
npx supabase link --project-ref iiwmtzorwwanjrnhsrah
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nErreur lors du link." -ForegroundColor Red
    Write-Host "Verifiez que SUPABASE_ACCESS_TOKEN est defini:" -ForegroundColor Yellow
    Write-Host '  $env:SUPABASE_ACCESS_TOKEN = "VOTRE_TOKEN"' -ForegroundColor Gray
    Write-Host "Puis relancez: .\deploy-scrape.ps1`n" -ForegroundColor Gray
    exit 1
}
Write-Host "   OK - Projet lie`n" -ForegroundColor Green

# Etape 2: Deployer
Write-Host "[2/2] Deploiement de la fonction scrapeBienImmobilier..." -ForegroundColor Yellow
npx supabase functions deploy scrapeBienImmobilier
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du deploiement." -ForegroundColor Red
    exit 1
}

Write-Host "`n=== SUCCES ===" -ForegroundColor Green
Write-Host "La fonction scrapeBienImmobilier est deployee."
Write-Host "Pensez a configurer OPENAI_API_KEY dans le dashboard Supabase."
Write-Host "  Dashboard > Project Settings > Edge Functions > Secrets`n"

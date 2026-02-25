# Script de synchronisation avec GitHub - trouve-ton-toit
# Executez ce script apres avoir installe Git et cree le depot sur GitHub

param(
    [Parameter(Mandatory=$true, HelpMessage="Votre nom d'utilisateur GitHub")]
    [string]$GitHubUsername,
    
    [Parameter(HelpMessage="Nom du depot (par defaut: trouve-ton-toit)")]
    [string]$RepoName = "trouve-ton-toit"
)

$ErrorActionPreference = "Stop"
$projectPath = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "`n=== Synchronisation avec GitHub ===" -ForegroundColor Cyan
Set-Location $projectPath

# 1. Initialiser Git si necessaire
if (-not (Test-Path ".git")) {
    Write-Host "`n1. Initialisation du depot Git..." -ForegroundColor Yellow
    git init
} else {
    Write-Host "`n1. Depot Git deja initialise." -ForegroundColor Green
}

# 2. Ajouter les fichiers
Write-Host "`n2. Ajout des fichiers..." -ForegroundColor Yellow
git add .

# 3. Premier commit (si des changements)
$status = git status --porcelain
if ($status) {
    Write-Host "`n3. Creation du premier commit..." -ForegroundColor Yellow
    git commit -m "Premier commit - projet initial"
} else {
    Write-Host "`n3. Rien a committer (fichiers deja indexes ou depot vide)." -ForegroundColor Green
}

# 4. Branche main
Write-Host "`n4. Branche principale..." -ForegroundColor Yellow
git branch -M main 2>$null

# 5. Remote
$remoteUrl = "https://github.com/$GitHubUsername/$RepoName.git"
$existingRemote = git remote get-url origin 2>$null

if ($existingRemote) {
    Write-Host "`n5. Remote deja configure: $existingRemote" -ForegroundColor Green
} else {
    Write-Host "`n5. Ajout du depot distant..." -ForegroundColor Yellow
    git remote add origin $remoteUrl
}

# 6. Push
Write-Host "`n6. Envoi vers GitHub..." -ForegroundColor Yellow
Write-Host "   URL: $remoteUrl" -ForegroundColor Gray
git push -u origin main

Write-Host "`n=== Termine ! Votre projet est synchronise avec GitHub. ===" -ForegroundColor Green
Write-Host "   https://github.com/$GitHubUsername/$RepoName`n" -ForegroundColor Cyan

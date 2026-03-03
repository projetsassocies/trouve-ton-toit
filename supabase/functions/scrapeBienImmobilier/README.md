# scrapeBienImmobilier

Extraction de données immobilières depuis des URLs (LeBonCoin, SeLoger, PAP).

## Déploiement

### Méthode simple (Windows)

1. **Connexion** : Générez un token sur https://supabase.com/dashboard/account/tokens

2. **Dans PowerShell** :
```powershell
cd "E:\CURSOR FILES\TTT web app\trouve-ton-toit"
$env:SUPABASE_ACCESS_TOKEN = "VOTRE_TOKEN_ICI"
.\deploy-scrape.ps1
```

Ou double-cliquez sur `deploy-scrape.bat` à la racine du projet.

### Méthode manuelle

```bash
cd trouve-ton-toit
npx supabase link --project-ref iiwmtzorwwanjrnhsrah
npx supabase functions deploy scrapeBienImmobilier
```

## Secrets requis

Dans le dashboard Supabase → Project Settings → Edge Functions → Secrets :

| Secret | Description | Priorité |
|--------|-------------|----------|
| `OPENAI_API_KEY` | Clé API OpenAI (obligatoire sauf si Apify LeBonCoin) | Obligatoire |
| `APIFY_TOKEN` | **LeBonCoin uniquement** - Apify Details Scraper PPR (pay per result) | 1 si URL LeBonCoin |
| `SCRAPINGBEE_API_KEY` | ScrapingBee - premium_proxy pour tous les sites | 2 |
| `SCRAPERAPI_KEY` | ScraperAPI | 3 |
| `BRIGHTDATA_WEB_UNLOCKER_API_KEY` | BrightData Web Unlocker | 4 |
| `BROWSERLESS_API_KEY` | Browserless.io | 5 |
| `BRIGHTDATA_BROWSER_AUTH` | BrightData Browser API | 6 |

**Apify (LeBonCoin)** : Scraper spécialisé pour annonces individuelles. https://console.apify.com/account/integrations → API token. Actor : `silentflow/leboncoin-details-scraper-ppr` (pay per result, pas d'abonnement). Extrait images, prix, description, DPE/GES, surface, pièces, amenities, coordonnées GPS.

**ScrapingBee** : premium_proxy activé pour tous les sites (LeBonCoin, SeLoger, IAD, PAP).

## Sites supportés

- leboncoin.fr
- seloger.com
- pap.fr
- iadfrance.fr / iad.fr

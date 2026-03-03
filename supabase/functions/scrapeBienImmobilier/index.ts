import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import puppeteer from 'https://deno.land/x/puppeteer@16.2.0/mod.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS })
}

function detectSiteSource(url: string): string | null {
  if (url.includes('leboncoin')) return 'leboncoin'
  if (url.includes('seloger')) return 'seloger'
  if (url.includes('pap.fr')) return 'pap'
  if (url.includes('iadfrance.fr') || url.includes('iad.fr')) return 'iad'
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader?.replace('Bearer ', '')
    )
    if (authError || !user) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    let body: { url?: string }
    try {
      body = await req.json()
    } catch {
      return jsonResponse({ error: 'Body JSON invalide' }, 400)
    }

    let { url } = body
    if (!url) {
      return jsonResponse({ error: 'URL manquante' }, 400)
    }

    // Supprimer le fragment (#)
    const hashIndex = url.indexOf('#')
    if (hashIndex !== -1) {
      url = url.substring(0, hashIndex)
    }

    console.log(`[SCRAPING] Début: ${url}`)
    console.time('scraping_duration')

    const siteSource = detectSiteSource(url)
    if (!siteSource) {
      return jsonResponse({
        error: 'Site non supporté',
        message: 'Sites supportés : LeBonCoin, SeLoger, PAP, IAD',
      }, 400)
    }

    let htmlContent: string
    let imageUrls: string[] = []

    const apifyToken = Deno.env.get('APIFY_TOKEN')
    const scrapingBeeKey = Deno.env.get('SCRAPINGBEE_API_KEY')
    const scraperApiKey = Deno.env.get('SCRAPERAPI_KEY')
    const webUnlockerKey = Deno.env.get('BRIGHTDATA_WEB_UNLOCKER_API_KEY')

    // Apify Leboncoin Details Scraper : scraper spécialisé LeBonCoin (meilleur taux de succès)
    if (siteSource === 'leboncoin' && apifyToken) {
      console.log('[SCRAPING] Appel Apify Leboncoin Details Scraper...')
      const runResp = await fetch(
        `https://api.apify.com/v2/acts/silentflow~leboncoin-details-scraper/runs?token=${apifyToken}&waitForFinish=60`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ urls: [url] }),
        }
      )
      if (!runResp.ok) {
        const errText = await runResp.text()
        throw new Error(`Apify: ${runResp.status} - ${errText.slice(0, 200)}`)
      }
      const runData = await runResp.json()
      const run = runData.data || runData
      if (run?.status !== 'SUCCEEDED') {
        throw new Error(`Apify: run ${run?.status || 'unknown'} - ${run?.statusMessage || ''}`)
      }
      const dsId = run.defaultDatasetId
      const itemsResp = await fetch(`https://api.apify.com/v2/datasets/${dsId}/items?token=${apifyToken}`)
      if (!itemsResp.ok) throw new Error(`Apify dataset: ${itemsResp.status}`)
      const items = await itemsResp.json()
      const ad = Array.isArray(items) ? items[0] : items
      if (!ad) throw new Error('Apify: aucune donnée retournée')

      const getAttr = (key: string) => {
        const arr = ad.attributes || []
        const found = arr.find((a: { key?: string }) => a.key === key)
        return found?.value ?? found?.valueLabel ?? null
      }
      const pieces = parseInt(getAttr('rooms') || getAttr('piece') || ad.rooms || '0', 10) || 0
      const typeMap: Record<number, string> = { 1: 'studio', 2: 't2', 3: 't3', 4: 't4', 5: 't5' }

      const parsedData = {
        titre: ad.title || '',
        description: ad.description || '',
        prix: ad.price ? parseInt(String(ad.price).replace(/\D/g, ''), 10) : null,
        ville: ad.city || '',
        code_postal: ad.zipcode || '',
        quartier: ad.department || '',
        type_bien: ad.categoryName?.toLowerCase().includes('maison') ? 'maison' : (typeMap[pieces] || 't3'),
        surface: parseInt(getAttr('surface') || getAttr('square_meters') || ad.surface || '0', 10) || null,
        pieces: pieces || null,
        chambres: parseInt(getAttr('rooms') || getAttr('bedrooms') || '0', 10) || null,
        salles_bain: parseInt(getAttr('bathrooms') || '0', 10) || null,
        photos: ad.images || [],
        date_publication: new Date().toISOString(),
      }

      console.timeEnd('scraping_duration')
      console.log('[SCRAPING] ✓ Succès (Apify)')
      return jsonResponse({
        success: true,
        data: { ...parsedData, url_source: url, site_source: 'leboncoin' },
      })
    }

    if (scrapingBeeKey) {
      // ScrapingBee : premium_proxy pour tous les sites (LeBonCoin, SeLoger, etc.)
      const params = new URLSearchParams({
        api_key: scrapingBeeKey,
        url,
        render_js: 'true',
        country_code: 'fr',
        premium_proxy: 'true',
      })
      const sbUrl = `https://app.scrapingbee.com/api/v1?${params}`
      console.log(`[SCRAPING] Appel ScrapingBee (${siteSource})...`)
      const sbResp = await fetch(sbUrl, { headers: { 'Accept-Language': 'fr-FR,fr;q=0.9' } })
      if (!sbResp.ok) {
        const errText = await sbResp.text()
        throw new Error(`ScrapingBee: ${sbResp.status} - ${errText.slice(0, 200)}`)
      }
      htmlContent = await sbResp.text()
      const imgRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi
      for (const m of htmlContent.matchAll(imgRegex)) {
        const src = m[1]
        if (src && !src.includes('logo') && !src.includes('icon')) imageUrls.push(src)
      }
      imageUrls = [...new Set(imageUrls)]
      console.log(`[SCRAPING] ${imageUrls.length} images trouvées (ScrapingBee)`)
    } else if (scraperApiKey) {
      // ScraperAPI : contourne DataDome (LeBonCoin) à 99,99%
      const params = new URLSearchParams({
        api_key: scraperApiKey,
        url,
        render: 'true',
        country_code: 'fr',
        ...(siteSource === 'leboncoin' ? { ultra_premium: 'true' } : {}),
      })
      const scraperUrl = `https://api.scraperapi.com/?${params}`
      console.log(`[SCRAPING] Appel ScraperAPI (${siteSource})...`)
      const resp = await fetch(scraperUrl, { headers: { 'Accept-Language': 'fr-FR,fr;q=0.9' } })
      if (!resp.ok) {
        const errText = await resp.text()
        throw new Error(`ScraperAPI: ${resp.status} - ${errText.slice(0, 200)}`)
      }
      htmlContent = await resp.text()
      // Extraire les images du HTML
      const imgRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi
      const imgMatches = htmlContent.matchAll(imgRegex)
      for (const m of imgMatches) {
        const src = m[1]
        if (src && !src.includes('logo') && !src.includes('icon')) imageUrls.push(src)
      }
      imageUrls = [...new Set(imageUrls)]
      console.log(`[SCRAPING] ${imageUrls.length} images trouvées (ScraperAPI)`)
    } else if (webUnlockerKey) {
      // BrightData Web Unlocker : conçu pour contourner anti-bot, proxies résidentiels ($1.5/CPM)
      const webUnlockerZone = Deno.env.get('BRIGHTDATA_WEB_UNLOCKER_ZONE') || 'web_unlocker_ttt'
      console.log(`[SCRAPING] Appel BrightData Web Unlocker (${siteSource})...`)
      const unlockResp = await fetch('https://api.brightdata.com/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${webUnlockerKey}`,
        },
        body: JSON.stringify({
          zone: webUnlockerZone,
          url,
          format: 'raw',
          country: 'fr',
        }),
      })
      if (!unlockResp.ok) {
        const errText = await unlockResp.text()
        throw new Error(`Web Unlocker: ${unlockResp.status} - ${errText.slice(0, 200)}`)
      }
      const unlockBody = await unlockResp.text()
      let parsed: { content?: string; html?: string; data?: string } | null = null
      try {
        if (unlockBody?.startsWith('{')) parsed = JSON.parse(unlockBody)
      } catch {
        /* pas du JSON */
      }
      htmlContent = (parsed?.content ?? parsed?.html ?? parsed?.data) || unlockBody
      const imgRegex = /<img[^>]+src=["'](https?:\/\/[^"']+)["']/gi
      for (const m of htmlContent.matchAll(imgRegex)) {
        const src = m[1]
        if (src && !src.includes('logo') && !src.includes('icon')) imageUrls.push(src)
      }
      imageUrls = [...new Set(imageUrls)]
      console.log(`[SCRAPING] ${imageUrls.length} images trouvées (Web Unlocker)`)
    } else {
      // Fallback : Browserless ou BrightData Browser API (Puppeteer)
      const browserlessToken = Deno.env.get('BROWSERLESS_API_KEY')
      const brightDataAuth = Deno.env.get('BRIGHTDATA_BROWSER_AUTH') ||
        'brd-customer-hl_116658cb-zone-scraping_browser_ttt:a86qsqodz56r'
      const browserWSEndpoint = browserlessToken
        ? `wss://production-ams.browserless.io/stealth?token=${browserlessToken}`
        : `wss://${brightDataAuth}@brd.superproxy.io:9222`
      console.log(`[SCRAPING] Connexion Puppeteer...`)

      const browser = await puppeteer.connect({ browserWSEndpoint })
      const page = await browser.newPage()
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      )
      await page.setViewport({ width: 1920, height: 1080 })
      await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' })
      await page.goto(url, { waitUntil: 'load', timeout: 30000 })

      imageUrls = await page.evaluate(() => {
        const imgs = []
        document.querySelectorAll('img').forEach(function (img) {
          const src = img.src || img.dataset?.src
          if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) imgs.push(src)
        })
        document.querySelectorAll('picture source').forEach(function (s) {
          const srcset = s.srcset
          if (srcset) srcset.split(',').forEach(function (part) {
            const u = part.trim().split(' ')[0]
            if (u && u.startsWith('http')) imgs.push(u)
          })
        })
        return [...new Set(imgs)]
      })
      htmlContent = await page.content()
      await browser.close()
      console.log(`[SCRAPING] ${imageUrls.length} images trouvées`)
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      return jsonResponse({
        error: 'OPENAI_API_KEY non configuré. Définissez le secret dans Supabase.',
        success: false,
      }, 500)
    }

    console.log('[SCRAPING] Analyse IA...')

    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en extraction de données immobilières. Réponds UNIQUEMENT en JSON valide.',
          },
          {
            role: 'user',
            content: `Analyse ce contenu HTML et extrait les informations suivantes en JSON :

DONNÉES BRUTES :
${htmlContent}

EXTRACTION :
- titre (titre complet de l'annonce)
- description (description complète du bien)
- prix (nombre en euros, sans symbole ni espace)
- ville
- code_postal
- quartier (si mentionné)
- type_bien : selon le nombre de pièces : maison, loft, terrain, studio, t2, t3, t4, t5
- surface (en m², nombre seulement)
- pieces (nombre de pièces)
- chambres (nombre de chambres)
- salles_bain (nombre de salles de bain)
- etage (numéro d'étage si mentionné)
- parking, balcon, terrasse, jardin, cave, ascenseur, meuble (true/false)
- dpe, ges (classe A à G)
- reference (référence de l'annonce)
- photos : ARRAY de toutes les URLs d'images du bien

Réponds UNIQUEMENT en JSON valide.`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    })

    const llmData = await llmResponse.json()
    const parsedData = JSON.parse(llmData.choices[0].message.content)

    parsedData.date_publication = new Date().toISOString()

    if (!parsedData.photos || parsedData.photos.length === 0) {
      parsedData.photos = imageUrls
    }

    if (!parsedData.type_bien || parsedData.type_bien === '') {
      if (parsedData.pieces === 1) parsedData.type_bien = 'studio'
      else if (parsedData.pieces === 2) parsedData.type_bien = 't2'
      else if (parsedData.pieces === 3) parsedData.type_bien = 't3'
      else if (parsedData.pieces === 4) parsedData.type_bien = 't4'
      else if (parsedData.pieces >= 5) parsedData.type_bien = 't5'
      else parsedData.type_bien = 't3'
    }

    console.timeEnd('scraping_duration')
    console.log(`[SCRAPING] ✓ Succès`)

    return jsonResponse({
      success: true,
      data: {
        ...parsedData,
        url_source: url,
        site_source: siteSource,
      },
    })
  } catch (error) {
    const errMsg = (error as Error).message
    console.error('[SCRAPING] Erreur:', errMsg)
    // Retourner 200 avec success:false pour que le client reçoive le message d'erreur
    return jsonResponse({
      error: errMsg,
      success: false,
    }, 200)
  }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import puppeteer from 'npm:puppeteer@23.11.1';

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''))
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    let { url } = await req.json();

    if (!url) {
      return Response.json({ error: 'URL manquante' }, { status: 400 });
    }

    // Supprimer le fragment de l'URL si présent (partie après #)
    const hashIndex = url.indexOf('#');
    if (hashIndex !== -1) {
      url = url.substring(0, hashIndex);
    }

    console.log(`[SCRAPING] Début scraping: ${url}`);
    console.time('scraping_duration');

    // Détecter le site source
    const siteSource = detectSiteSource(url);
    
    if (!siteSource) {
      return Response.json({ 
        error: 'Site non supporté', 
        message: 'Seuls LeBonCoin, SeLoger et PAP sont supportés actuellement' 
      }, { status: 400 });
    }

    // Étape 1 : Appel BrightData Browser API
    console.log('[SCRAPING] Connexion au Browser API BrightData...');

    const auth = 'brd-customer-hl_116658cb-zone-scraping_browser_ttt:a86qsqodz56r';
    const browserWSEndpoint = `wss://${auth}@brd.superproxy.io:9222`;

    const browser = await puppeteer.connect({
      browserWSEndpoint,
    });

    console.log('[SCRAPING] Navigateur connecté, chargement de la page...');

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Extraire les URLs d'images directement depuis le DOM
    const imageUrls = await page.evaluate(() => {
      const images = [];

      // Chercher dans les balises img
      document.querySelectorAll('img').forEach(img => {
        const src = img.src || img.dataset.src || img.dataset.lazySrc;
        if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) {
          images.push(src);
        }
      });

      // Chercher dans les balises picture > source
      document.querySelectorAll('picture source').forEach(source => {
        const srcset = source.srcset;
        if (srcset) {
          const urls = srcset.split(',').map(s => s.trim().split(' ')[0]);
          urls.forEach(url => {
            if (url.startsWith('http')) images.push(url);
          });
        }
      });

      // Chercher les divs avec background-image
      document.querySelectorAll('[style*="background-image"]').forEach(div => {
        const match = div.style.backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
        if (match && match[1].startsWith('http')) {
          images.push(match[1]);
        }
      });

      return [...new Set(images)]; // Dédupliquer
    });

    console.log(`[SCRAPING] ${imageUrls.length} URLs d'images trouvées dans le DOM`);

    const htmlContent = await page.content();

    await browser.close();
    console.log('[SCRAPING] Page récupérée avec succès');

    // Étape 2 : Parser les données avec l'IA (OpenAI)
    console.log('[SCRAPING] Analyse des données avec IA...');

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!;

    const llmResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en extraction de données immobilières. Réponds UNIQUEMENT en JSON valide.'
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
- type_bien : selon le nombre de pièces :
  * Si maison/villa → "maison"
  * Si loft → "loft"
  * Si terrain → "terrain"
  * Sinon selon pièces : 1="studio", 2="t2", 3="t3", 4="t4", 5+="t5"
- surface (en m², nombre seulement)
- pieces (nombre de pièces)
- chambres (nombre de chambres)
- salles_bain (nombre de salles de bain)
- etage (numéro d'étage si mentionné)
- parking (true/false)
- balcon (true/false)
- terrasse (true/false)
- jardin (true/false)
- cave (true/false)
- ascenseur (true/false)
- meuble (true/false)
- dpe (classe A à G)
- ges (classe A à G)
- reference (référence de l'annonce)
- photos : ARRAY de toutes les URLs d'images du bien (cherche dans "images", "organic_results[0].images", "data.images", etc.)

Réponds UNIQUEMENT en JSON valide.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    const llmData = await llmResponse.json();
    const parsedData = JSON.parse(llmData.choices[0].message.content);

    parsedData.date_publication = new Date().toISOString();

    // Utiliser les images extraites du DOM si l'IA n'en a pas trouvé
    if (!parsedData.photos || parsedData.photos.length === 0) {
    parsedData.photos = imageUrls;
    console.log(`[SCRAPING] Utilisation des ${imageUrls.length} images extraites du DOM`);
    } else {
    console.log(`[SCRAPING] ${parsedData.photos.length} URLs de photos détectées par l'IA`);
    }

    // Normaliser le type de bien basé sur le nombre de pièces si nécessaire
    if (!parsedData.type_bien || parsedData.type_bien === '') {
      if (parsedData.pieces === 1) parsedData.type_bien = 'studio';
      else if (parsedData.pieces === 2) parsedData.type_bien = 't2';
      else if (parsedData.pieces === 3) parsedData.type_bien = 't3';
      else if (parsedData.pieces === 4) parsedData.type_bien = 't4';
      else if (parsedData.pieces >= 5) parsedData.type_bien = 't5';
      else parsedData.type_bien = 't3';
    }

    console.timeEnd('scraping_duration');
    console.log(`[SCRAPING] ✓ Succès - ${parsedData.photos?.length || 0} URLs d'images détectées`);
    console.log(`[SCRAPING] 🖼️ Images trouvées:`, parsedData.photos);

    return Response.json({
      success: true,
      data: {
        ...parsedData,
        url_source: url,
        site_source: siteSource
      }
    });

  } catch (error) {
    console.error('[SCRAPING] Erreur:', error.message);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});

function detectSiteSource(url) {
  if (url.includes('leboncoin')) return 'leboncoin';
  if (url.includes('seloger')) return 'seloger';
  if (url.includes('pap.fr')) return 'pap';
  return null;
}

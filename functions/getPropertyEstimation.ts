/**
 * Estimation immobilière pour un bien (vente uniquement).
 * Priorité : 1) DVF local (dvf_transactions) 2) API DVF 3) Référentiel départemental
 * Inclut : ventes comparables, coefficients commodités, explication OpenAI.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Prix médians approximatifs €/m² par département (fallback)
const PRIX_M2_PAR_DEP: Record<string, number> = {
  '01': 2200, '02': 1800, '03': 1800, '04': 3500, '05': 3800, '06': 5500,
  '07': 2200, '08': 2100, '09': 2000, '10': 2100, '11': 2500, '12': 2200,
  '13': 3500, '14': 3000, '15': 1800, '16': 2100, '17': 2800, '18': 2200,
  '19': 1800, '21': 2400, '22': 2300, '23': 1500, '24': 2300, '25': 2500,
  '26': 2800, '27': 2800, '28': 2500, '29': 2800, '2A': 3200, '2B': 3200,
  '30': 2900, '31': 3100, '32': 2200, '33': 4200, '34': 3500, '35': 3200,
  '36': 2000, '37': 2500, '38': 3300, '39': 2200, '40': 2300, '41': 2200,
  '42': 2200, '43': 2200, '44': 3200, '45': 2800, '46': 2100, '47': 2300,
  '48': 2200, '49': 2700, '50': 2400, '51': 2600, '52': 1900, '53': 2200,
  '54': 2500, '55': 1900, '56': 2900, '57': 2500, '58': 2100, '59': 2500,
  '60': 2600, '61': 2200, '62': 2400, '63': 2500, '64': 3100, '65': 2500,
  '66': 3200, '67': 3500, '68': 3400, '69': 5200, '70': 1900, '71': 2400,
  '72': 2400, '73': 3200, '74': 4500, '75': 10500, '76': 2800, '77': 3500,
  '78': 4500, '79': 2000, '80': 2400, '81': 2300, '82': 2300, '83': 3800,
  '84': 3500, '85': 2800, '86': 2600, '87': 2300, '88': 2200, '89': 2500,
  '90': 2800, '91': 4500, '92': 7500, '93': 4200, '94': 5500, '95': 4200,
  '971': 3200, '972': 2500, '973': 2200, '974': 3200,
}

// Coefficients par commodité (en %, appliqués à l'estimation brute)
const COEFF_AMENITIES: Record<string, number> = {
  parking: 0.03,
  garage: 0.04,
  balcon: 0.02,
  terrasse: 0.04,
  jardin: 0.06,
  cave: 0.01,
  ascenseur: 0.03,
  piscine: 0.08,
}

function getDepFromPostalCode(postalCode: string | null | undefined): string | null {
  if (!postalCode || typeof postalCode !== 'string') return null
  const s = postalCode.trim()
  if (s.length < 2) return null
  if (s.startsWith('97')) return s.substring(0, 3)
  return s.substring(0, 2)
}

function getPrixM2Dep(dep: string): number {
  return PRIX_M2_PAR_DEP[dep] ?? 2500
}

function mapToDvfType(propertyType: string | null | undefined): string | null {
  if (!propertyType) return null
  const t = propertyType.toLowerCase().trim()
  if (['maison', 'villa'].includes(t)) return 'Maison'
  if (['studio', 't1', 't2', 't3', 't4', 't5', 'loft'].includes(t)) return 'Appartement'
  return 'Appartement' // défaut
}

function getAmenityCoeff(amenities: string[] | null | undefined): number {
  if (!amenities?.length) return 0
  let total = 0
  for (const a of amenities) {
    const key = a.toLowerCase().trim()
    if (COEFF_AMENITIES[key] != null) total += COEFF_AMENITIES[key]
  }
  return Math.min(total, 0.25) // plafond +25%
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: unknown, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS })
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''))
    if (authError || !user) return jsonResponse({ error: 'Non autorisé' }, 401)

    const body = await req.json().catch(() => ({}))
    const { address, latitude, longitude, surface, property_type, postal_code, amenities } = body

    let lat = latitude
    let lon = longitude
    let codePostal = postal_code

    // 1. Géocodage si adresse sans coordonnées
    if (address && (!lat || !lon)) {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      const geoRes = await fetch(geocodeUrl, { headers: { 'User-Agent': 'TrouveTonToit/1.0' } })
      const geoData = await geoRes.json()
      if (geoData?.[0]) {
        lat = parseFloat(geoData[0].lat)
        lon = parseFloat(geoData[0].lon)
        const addr = geoData[0].address
        if (addr?.postcode) codePostal = addr.postcode
      }
    }

    const dvfType = mapToDvfType(property_type) || 'Appartement'
    const surfaceNum = surface ? Number(surface) : null

    let prixM2: number | null = null
    let transactionCount = 0
    let source = 'fallback_departement'
    let ventesComparables: Array<{
      date: string
      type_local: string
      surface_reelle_bati: number
      valeur_fonciere: number
      prix_m2: number
      code_postal: string | null
    }> = []

    // 2. Priorité : DVF local (dvf_transactions)
    if (codePostal || (lat && lon)) {
      let query = supabase
        .from('dvf_transactions')
        .select('date_mutation, type_local, surface_reelle_bati, valeur_fonciere, code_postal')
        .eq('type_local', dvfType)
        .gt('valeur_fonciere', 0)
        .gt('surface_reelle_bati', 0)

      if (codePostal) {
        const cp = String(codePostal).trim().replace(/\s/g, '')
        if (cp) query = query.eq('code_postal', cp)
      }

      const surfaceMin = surfaceNum ? surfaceNum * 0.7 : 10
      const surfaceMax = surfaceNum ? surfaceNum * 1.5 : 500
      query = query.gte('surface_reelle_bati', surfaceMin).lte('surface_reelle_bati', surfaceMax)

      const { data: dvfRows } = await query.order('date_mutation', { ascending: false }).limit(100)

      if (dvfRows && dvfRows.length >= 3) {
        const prixM2List = dvfRows
          .map((r: { valeur_fonciere: number; surface_reelle_bati: number }) =>
            r.valeur_fonciere / r.surface_reelle_bati
          )
          .sort((a: number, b: number) => a - b)
        const mid = Math.floor(prixM2List.length / 2)
        prixM2 = prixM2List.length % 2 ? prixM2List[mid] : (prixM2List[mid - 1] + prixM2List[mid]) / 2
        transactionCount = dvfRows.length
        source = 'dvf_local'

        ventesComparables = dvfRows.slice(0, 8).map((r: {
          date_mutation: string
          type_local: string
          surface_reelle_bati: number
          valeur_fonciere: number
          code_postal: string | null
        }) => ({
          date: r.date_mutation || '',
          type_local: r.type_local,
          surface_reelle_bati: r.surface_reelle_bati,
          valeur_fonciere: r.valeur_fonciere,
          prix_m2: Math.round(r.valeur_fonciere / r.surface_reelle_bati),
          code_postal: r.code_postal,
        }))
      }
    }

    // 3. Fallback : API DVF (api.cquest.org)
    if (prixM2 == null && lat && lon) {
      try {
        const dvfUrl = `https://api.cquest.org/dvf?lat=${lat}&lon=${lon}&dist=1000&nb_resultats=100`
        const dvfRes = await fetch(dvfUrl, { headers: { 'User-Agent': 'TrouveTonToit/1.0' } })
        if (dvfRes.ok) {
          const dvfData = await dvfRes.json()
          const results = Array.isArray(dvfData) ? dvfData : dvfData?.results || []
          const ventes = results.filter(
            (r: { type_local?: string; valeur_fonciere?: number; surface_reelle_bati?: number }) =>
              r.type_local && ['Appartement', 'Maison'].includes(r.type_local) &&
              r.valeur_fonciere > 0 && r.surface_reelle_bati > 0
          )
          if (ventes.length >= 3) {
            const prixM2List = ventes.map((r: { valeur_fonciere: number; surface_reelle_bati: number }) =>
              r.valeur_fonciere / r.surface_reelle_bati
            ).sort((a: number, b: number) => a - b)
            const mid = Math.floor(prixM2List.length / 2)
            prixM2 = prixM2List.length % 2 ? prixM2List[mid] : (prixM2List[mid - 1] + prixM2List[mid]) / 2
            transactionCount = ventes.length
            source = 'dvf'

            ventesComparables = ventes.slice(0, 8).map((r: {
              date_mutation?: string
              type_local: string
              surface_reelle_bati: number
              valeur_fonciere: number
            }) => ({
              date: r.date_mutation || '',
              type_local: r.type_local,
              surface_reelle_bati: r.surface_reelle_bati,
              valeur_fonciere: r.valeur_fonciere,
              prix_m2: Math.round(r.valeur_fonciere / r.surface_reelle_bati),
              code_postal: null,
            }))
          }
        }
      } catch (_e) { /* ignoré */ }
    }

    // 4. Fallback : référentiel départemental
    if (prixM2 == null && codePostal) {
      const dep = getDepFromPostalCode(codePostal)
      if (dep) prixM2 = getPrixM2Dep(dep)
    }
    if (prixM2 == null) prixM2 = 2800

    if (!surfaceNum || surfaceNum <= 0) {
      return jsonResponse({
        error: 'La surface du bien est requise pour l\'estimation',
        prix_m2: Math.round(prixM2),
        source,
      }, 400)
    }

    // Estimation brute
    let estimation = Math.round(prixM2 * surfaceNum)

    // Application des coefficients commodités
    const coeff = getAmenityCoeff(amenities)
    if (coeff > 0) {
      estimation = Math.round(estimation * (1 + coeff))
    }

    const marge = 0.12
    const estimation_min = Math.round(estimation * (1 - marge))
    const estimation_max = Math.round(estimation * (1 + marge))

    // 5. Explication OpenAI (optionnel)
    let estimationExplication: string | null = null
    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    if (openaiKey) {
      try {
        const prompt = `En 2 à 3 phrases courtes et neutres, explique cette estimation immobilière à un vendeur.
Contexte : fourchette ${estimation_min}€ - ${estimation_max}€, prix de référence ${Math.round(prixM2)} €/m², ${transactionCount} ventes de référence, source ${source === 'dvf_local' ? 'données DVF locales' : source === 'dvf' ? 'données DVF' : 'référentiel départemental'}.${amenities?.length ? ` Commodités : ${amenities.join(', ')}.` : ''}
Ne dépasse pas 150 caractères. Ton professionnel.`
        const llmRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 100,
          }),
        })
        if (llmRes.ok) {
          const llmData = await llmRes.json()
          const content = llmData.choices?.[0]?.message?.content?.trim()
          if (content) estimationExplication = content
        }
      } catch (_e) { /* ignoré */ }
    }

    return jsonResponse({
      estimation_min,
      estimation_max,
      estimation_mediane: estimation,
      prix_m2: Math.round(prixM2),
      transaction_count: transactionCount,
      source,
      ventes_comparables: ventesComparables.length ? ventesComparables : undefined,
      estimation_explication: estimationExplication ?? undefined,
    })
  } catch (error) {
    console.error('[getPropertyEstimation]', error)
    return jsonResponse({ error: (error as Error).message }, 500)
  }
})

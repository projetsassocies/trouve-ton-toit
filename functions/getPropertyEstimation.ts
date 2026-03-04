/**
 * Estimation immobilière pour un bien (vente uniquement).
 * Utilise l'API DVF (api.cquest.org) si disponible, sinon fallback heuristique par département.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Prix médians approximatifs €/m² par département (secteur hors Paris hyper-cher, 2023-2024)
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

function getDepFromPostalCode(postalCode: string | null | undefined): string | null {
  if (!postalCode || typeof postalCode !== 'string') return null
  const s = postalCode.trim()
  if (s.length < 2) return null
  // DOM-TOM: 971, 972, 973, 974
  if (s.startsWith('97')) return s.substring(0, 3)
  return s.substring(0, 2)
}

function getPrixM2Dep(dep: string): number {
  return PRIX_M2_PAR_DEP[dep] ?? 2500 // défaut France
}

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''))
    if (authError || !user) return Response.json({ error: 'Non autorisé' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const { address, latitude, longitude, surface, property_type, postal_code } = body

    let lat = latitude
    let lon = longitude
    let codePostal = postal_code

    // 1. Géocodage si on a une adresse
    if (address && (!lat || !lon)) {
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`
      const geoRes = await fetch(geocodeUrl, { headers: { 'User-Agent': 'TrouveTonToit/1.0' } })
      const geoData = await geoRes.json()
      if (geoData?.[0]) {
        lat = parseFloat(geoData[0].lat)
        lon = parseFloat(geoData[0].lon)
        // Nominatim peut retourner address dans display_name
        const addr = geoData[0].address
        if (addr?.postcode) codePostal = addr.postcode
      }
    }

    // 2. Essai API DVF (api.cquest.org)
    let prixM2: number | null = null
    let transactionCount = 0
    let source = 'fallback_departement'

    if (lat && lon) {
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
          }
        }
      } catch (_e) {
        // API indisponible, on garde le fallback
      }
    }

    // 3. Fallback : prix par département
    if (prixM2 == null && codePostal) {
      const dep = getDepFromPostalCode(codePostal)
      if (dep) {
        prixM2 = getPrixM2Dep(dep)
      }
    }
    if (prixM2 == null) {
      prixM2 = 2800 // Moyenne France
    }

    const surfaceNum = surface ? Number(surface) : null
    if (!surfaceNum || surfaceNum <= 0) {
      return Response.json({
        error: 'La surface du bien est requise pour l\'estimation',
        prix_m2: Math.round(prixM2),
        source,
      }, { status: 400 })
    }

    const estimation = Math.round(prixM2 * surfaceNum)
    const marge = 0.12 // ±12%
    const estimation_min = Math.round(estimation * (1 - marge))
    const estimation_max = Math.round(estimation * (1 + marge))

    return Response.json({
      estimation_min,
      estimation_max,
      estimation_mediane: estimation,
      prix_m2: Math.round(prixM2),
      transaction_count: transactionCount,
      source,
    })
  } catch (error) {
    console.error('[getPropertyEstimation]', error)
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }
})

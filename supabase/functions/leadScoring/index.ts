/**
 * Lead Scoring - Scoring par type de lead (Phase 2)
 * Acheteur / Vendeur : Froid, Tiède, Chaud
 * Locataire : En veille, Actif, Urgent
 * Plan: docs/PLAN_ACTION_SCORING_CRM.md
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const entityTableMap: Record<string, string> = {
  'Lead': 'leads',
  'Activity': 'activities',
  'Event': 'events',
  'Task': 'tasks',
  'Note': 'notes',
  'Listing': 'listings',
  'Notification': 'notifications',
  'MatchingConfig': 'matching_configs'
}

// Refroidissement (en jours)
const COOLING_VENTE_JOURS = 45
const COOLING_LOCATION_JOURS = 7
const COOLING_LOCATION_PTS_PAR_JOUR = 10

type LeadData = Record<string, unknown>
type LeadEntities = { activities: unknown[]; events: unknown[]; tasks: unknown[]; notes: unknown[] }

function getLastInteractionDate(
  lead: LeadData,
  entities: LeadEntities
): Date | null {
  const dates: (string | null)[] = [
    lead.date_derniere_interaction as string,
    lead.updated_date as string,
    lead.created_date as string
  ]
  for (const a of entities.activities) {
    const d = (a as LeadData).created_date
    if (d) dates.push(d as string)
  }
  for (const e of entities.events) {
    const d = (e as LeadData).created_date
    if (d) dates.push(d as string)
  }
  for (const t of entities.tasks) {
    const d = (t as LeadData).created_date
    if (d) dates.push(d as string)
  }
  for (const n of entities.notes) {
    const d = (n as LeadData).created_date
    if (d) dates.push(d as string)
  }
  const valid = dates.filter(Boolean) as string[]
  if (valid.length === 0) return null
  return new Date(valid.sort().pop()!)
}

function daysSince(date: Date | null): number | null {
  if (!date) return null
  return Math.floor((Date.now() - date.getTime()) / (24 * 60 * 60 * 1000))
}

// ═══════════════════════════════════════════════════════════
// Module Acheteur (Vente)
// ═══════════════════════════════════════════════════════════

function calculateScoreAcheteur(
  lead: LeadData,
  entities: LeadEntities,
  lastInteraction: Date | null,
  raisons: string[]
): { score: number; categorie: string } {
  let score = 0

  // Financement validé (40 pts)
  const financingPoints: Record<string, number> = {
    pret_accepte: 40,
    accord_principe: 40,
    dossier_en_cours: 15,
    simulation_faite: 5,
    pas_encore_vu: 0,
    aucun: 0
  }
  const fin = financingPoints[String(lead.financing_status)] ?? 0
  score += fin
  if (fin > 0) raisons.push(`Financement ${String(lead.financing_status).replace('_', ' ')} (+${fin} pts)`)

  // Projet urgent < 3 mois (30 pts)
  const delaiPoints: Record<string, number> = {
    moins_1_mois: 30,
    '1_2_mois': 25,
    '2_3_mois': 20,
    '3_6_mois': 10,
    plus_6_mois: 2,
    non_defini: 0
  }
  const delai = delaiPoints[String(lead.delai)] ?? 0
  score += delai
  if (delai > 0) raisons.push(`Délai ${String(lead.delai).replace('_', ' ')} (+${delai} pts)`)

  // Apport > 20% (15 pts)
  const apport = Number(lead.apport_percentage) || 0
  if (apport >= 20) {
    score += 15
    raisons.push(`Apport ${apport}% (+15 pts)`)
  } else if (apport >= 10) {
    score += 8
    raisons.push(`Apport ${apport}% (+8 pts)`)
  }

  // Critères précis (10 pts)
  let criteriaCount = 0
  if (lead.city) criteriaCount++
  if (lead.property_type) criteriaCount++
  if (lead.budget_max) criteriaCount++
  if (lead.surface_min) criteriaCount++
  const criteriaScore = criteriaCount >= 4 ? 10 : criteriaCount >= 3 ? 7 : criteriaCount >= 1 ? 3 : 0
  score += criteriaScore
  raisons.push(`Critères (${criteriaScore} pts)`)

  // Dernière interaction < 7 jours (10 pts)
  const joursDepuis = daysSince(lastInteraction)
  if (joursDepuis !== null) {
    if (joursDepuis <= 7) {
      score += 10
      raisons.push(`Interaction récente <7j (+10 pts)`)
    } else if (joursDepuis > 30) {
      score -= 20
      raisons.push(`Aucun contact >30j (-20 pts)`)
    }
  }

  // Engagement (visites, appels, etc.)
  let engagement = 0
  const events = entities.events as LeadData[]
  for (const e of events) {
    if (e.type === 'visit') {
      if (e.status === 'completed') engagement += 10
      else if (e.status === 'confirmed') engagement += 8
    }
  }
  const activities = entities.activities as LeadData[]
  for (const a of activities) {
    if (a.type === 'visite') engagement += 6
    else if (a.type === 'call') engagement += 4
    else if (a.type === 'email' || a.type === 'sms') engagement += 2
    else if (a.type === 'matching_accepte') engagement += 12
    else if (a.type === 'matching_refuse') engagement -= 2
  }
  const notesText = (lead.notes || '') + ' ' + (entities.notes as LeadData[]).map((n) => n.content || '').join(' ')
  if (/offre|proposition|compromis/i.test(notesText)) engagement += 15
  if (lead.status === 'en_negociation') engagement += 10
  score += Math.max(0, Math.min(30, engagement))
  if (engagement > 0) raisons.push(`Engagement (+${engagement} pts)`)

  // Refroidissement : > 45 jours → forcer Froid
  if (joursDepuis !== null && joursDepuis > COOLING_VENTE_JOURS) {
    score = Math.min(score, 35)
    raisons.push(`Refroidissement >${COOLING_VENTE_JOURS}j sans contact`)
  }

  const total = Math.max(0, Math.min(100, score))
  let categorie: string
  if (total >= 76) categorie = 'CHAUD'
  else if (total >= 36) categorie = 'TIEDE'
  else categorie = 'FROID'

  return { score: total, categorie }
}

// ═══════════════════════════════════════════════════════════
// Module Locataire (Location)
// ═══════════════════════════════════════════════════════════

function calculateScoreLocataire(
  lead: LeadData,
  entities: LeadEntities,
  lastInteraction: Date | null,
  raisons: string[]
): { score: number; categorie: string } {
  let score = 0

  // Dossier complet (50 pts)
  if (lead.dossier_location_complet || lead.dossier_valide_agent) {
    score += 50
    raisons.push('Dossier complet (+50 pts)')
  }

  // Revenus >= 3× loyer (20 pts)
  const revenus = Number(lead.revenus_mensuels_nets) || 0
  const loyer = Number(lead.loyer_cible_max) || 0
  if (loyer > 0 && revenus >= loyer * 3) {
    score += 20
    raisons.push('Ratio solvabilité ≥3× (+20 pts)')
  } else if (loyer > 0 && revenus >= loyer * 2) {
    score += 10
    raisons.push('Ratio solvabilité ≥2× (+10 pts)')
  }

  // Garantie validée (15 pts)
  const garantie = String(lead.garantie_type || '').toLowerCase()
  if (garantie === 'visale' || garantie === 'cautioneo') {
    score += 15
    raisons.push('Garantie Visale/Cautionéo (+15 pts)')
  } else if (garantie === 'physique') {
    score += 10
    raisons.push('Garant physique (+10 pts)')
  }

  // Date entrée < 15 jours (15 pts)
  const dateEntree = lead.date_entree_souhaitee ? new Date(String(lead.date_entree_souhaitee)) : null
  if (dateEntree) {
    const joursEntree = Math.floor((dateEntree.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    if (joursEntree <= 15 && joursEntree >= 0) {
      score += 15
      raisons.push('Entrée < 15 jours (+15 pts)')
    } else if (joursEntree <= 30) {
      score += 8
      raisons.push('Entrée < 1 mois (+8 pts)')
    }
  }

  // Préavis posé (5 pts)
  if (lead.preavis_pose) {
    score += 5
    raisons.push('Préavis posé (+5 pts)')
  }

  // Critères (ville, type)
  if (lead.city) score += 3
  if (lead.property_type) score += 2
  if (lead.budget_max || lead.loyer_cible_max) score += 2

  // Dépréciation : aucun contact > 5 jours
  const joursDepuis = daysSince(lastInteraction)
  if (joursDepuis !== null && joursDepuis > 5) {
    const penalty = Math.min(40, (joursDepuis - 5) * COOLING_LOCATION_PTS_PAR_JOUR)
    score -= penalty
    raisons.push(`Aucun contact >5j (-${penalty} pts)`)
  }

  const total = Math.max(0, Math.min(100, score))
  let categorie: string
  if (total >= 76) categorie = 'URGENT'
  else if (total >= 41) categorie = 'ACTIF'
  else categorie = 'EN_VEILLE'

  return { score: total, categorie }
}

// ═══════════════════════════════════════════════════════════
// Module Vendeur (Vente)
// ═══════════════════════════════════════════════════════════

function calculateScoreVendeur(
  lead: LeadData,
  entities: LeadEntities,
  lastInteraction: Date | null,
  raisons: string[]
): { score: number; categorie: string } {
  let score = 0

  // Mandat signé (40 pts)
  if (lead.mandat_signe) {
    score += 40
    raisons.push('Mandat signé (+40 pts)')
  }

  // Bien sous compromis (30 pts)
  if (lead.bien_sous_compromis) {
    score += 30
    raisons.push('Bien sous compromis (+30 pts)')
  }

  // Estimation demandée (20 pts)
  if (lead.estimation_demandee) {
    score += 20
    raisons.push('Estimation demandée (+20 pts)')
  }

  // Critères (ville, type, prix)
  let criteriaCount = 0
  if (lead.city) criteriaCount++
  if (lead.property_type) criteriaCount++
  if (lead.budget_max) criteriaCount++
  const criteriaScore = criteriaCount >= 3 ? 10 : criteriaCount >= 1 ? 5 : 0
  score += criteriaScore
  raisons.push(`Critères bien (+${criteriaScore} pts)`)

  // Dernière interaction
  const joursDepuis = daysSince(lastInteraction)
  if (joursDepuis !== null) {
    if (joursDepuis <= 7) {
      score += 10
      raisons.push('Interaction récente (+10 pts)')
    } else if (joursDepuis > 45) {
      score -= 20
      raisons.push('Refroidissement >45j (-20 pts)')
    }
  }

  // Engagement (visite, RDV estimation)
  const events = entities.events as LeadData[]
  const hasEstimationRdv = events.some((e) =>
    /estimation|visite.*bien/i.test(String((e as LeadData).title || '') + String((e as LeadData).description || ''))
  )
  if (hasEstimationRdv) {
    score += 15
    raisons.push('RDV estimation/visite (+15 pts)')
  }
  const activities = entities.activities as LeadData[]
  for (const a of activities) {
    if (a.type === 'visite' || a.type === 'call') score += 5
  }

  // Refroidissement
  if (joursDepuis !== null && joursDepuis > COOLING_VENTE_JOURS) {
    score = Math.min(score, 35)
    raisons.push(`Refroidissement >${COOLING_VENTE_JOURS}j`)
  }

  const total = Math.max(0, Math.min(100, score))
  let categorie: string
  if (total >= 76) categorie = 'CHAUD'
  else if (total >= 36) categorie = 'TIEDE'
  else categorie = 'FROID'

  return { score: total, categorie }
}

// ═══════════════════════════════════════════════════════════
// Handler principal
// Accepte : 1) format Supabase Webhook { type, table, record, old_record }
//           2) format legacy { event: { entity_name, entity_id } }
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  try {
    const body = await req.json() as Record<string, unknown>
    let leadId: string | undefined

    // Format Supabase Database Webhook
    if (body.type && body.table) {
      const table = String(body.table)
      const record = (body.record || body.old_record) as Record<string, unknown> | null
      if (table === 'leads' && record?.id) {
        leadId = String(record.id)
      } else if (['activities', 'events', 'tasks', 'notes'].includes(table) && record) {
        if (record.linked_to_type === 'lead' && record.linked_to_id) {
          leadId = String(record.linked_to_id)
        } else {
          return Response.json({ message: 'Not linked to a lead' }, { status: 200 })
        }
      } else {
        return Response.json({ message: 'Table not relevant for scoring' }, { status: 200 })
      }
    }
    // Format legacy (event.entity_name, event.entity_id)
    else if (body.event) {
      const event = body.event as Record<string, unknown>
      const entityName = String(event.entity_name || '')
      const entityId = event.entity_id as string | undefined
      if (!entityId) return Response.json({ error: 'Missing entity_id' }, { status: 400 })

      if (entityName === 'Lead') {
        leadId = entityId
      } else {
        const tableName = entityTableMap[entityName]
        if (!tableName) return Response.json({ error: `Unknown entity: ${entityName}` }, { status: 400 })
        const { data: entity, error: entityError } = await supabase
          .from(tableName)
          .select('linked_to_id, linked_to_type')
          .eq('id', entityId)
          .single()
        if (entityError) return Response.json({ error: entityError.message }, { status: 500 })
        if ((entity as LeadData).linked_to_type === 'lead') {
          leadId = (entity as LeadData).linked_to_id as string
        } else {
          return Response.json({ message: 'Not linked to a lead' }, { status: 200 })
        }
      }
    } else {
      return Response.json({ error: 'Invalid payload format' }, { status: 400 })
    }

    if (!leadId) return Response.json({ error: 'No lead ID found' }, { status: 400 })

    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (leadError || !lead) return Response.json({ error: 'Lead not found' }, { status: 404 })

    const activities = (await supabase.from('activities').select('*').eq('linked_to_id', leadId)).data || []
    const events = (await supabase.from('events').select('*').eq('linked_to_id', leadId)).data || []
    const tasks = (await supabase.from('tasks').select('*').eq('linked_to_id', leadId)).data || []
    const notes = (await supabase.from('notes').select('*').eq('linked_to_id', leadId)).data || []

    const entities: LeadEntities = { activities, events, tasks, notes }
    const lastInteraction = getLastInteractionDate(lead as LeadData, entities)
    const raisons: string[] = []

    const leadType = String(lead.lead_type || 'acheteur').toLowerCase()
    let result: { score: number; categorie: string }

    if (leadType === 'locataire') {
      result = calculateScoreLocataire(lead as LeadData, entities, lastInteraction, raisons)
    } else if (leadType === 'vendeur') {
      result = calculateScoreVendeur(lead as LeadData, entities, lastInteraction, raisons)
    } else {
      // acheteur, bailleur, défaut
      result = calculateScoreAcheteur(lead as LeadData, entities, lastInteraction, raisons)
    }

    const { score: scoreTotal, categorie } = result
    const oldScore = Number(lead.score) || 0
    const oldCategorie = String(lead.categorie) || 'FROID'

    const newLog = {
      date: new Date().toISOString(),
      ancien_score: oldScore,
      nouveau_score: scoreTotal,
      variation: scoreTotal - oldScore >= 0 ? `+${scoreTotal - oldScore}` : `${scoreTotal - oldScore}`,
      ancien_categorie: oldCategorie,
      nouveau_categorie: categorie,
      raisons: raisons.slice(0, 10),
      lead_type: leadType
    }

    const scoringLogs = (lead.scoring_logs || []) as object[]
    scoringLogs.unshift(newLog)
    if (scoringLogs.length > 20) scoringLogs.splice(20)

    await supabase
      .from('leads')
      .update({
        score: scoreTotal,
        score_initial: scoreTotal,
        score_engagement: 0,
        score_progression: 0,
        categorie,
        date_scoring: new Date().toISOString(),
        scoring_logs: scoringLogs
      })
      .eq('id', leadId)

    return Response.json({
      success: true,
      leadId,
      score: { total: scoreTotal },
      categorie,
      lead_type: leadType,
      changement: scoreTotal !== oldScore || categorie !== oldCategorie
    })
  } catch (error) {
    console.error('Error in leadScoring:', error)
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }
})

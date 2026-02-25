import { supabase } from '@/api/supabaseClient'
import { base44 } from '@/api/base44Client'

// ─── OpenAI Function Calling Tool Definitions ────────────────────────────────

export const CRM_TOOLS = [
  // ═══ READ TOOLS ═══
  {
    type: 'function',
    function: {
      name: 'search_leads',
      description: "Rechercher des leads/prospects dans le CRM avec des filtres. Utilise quand l'utilisateur demande des infos sur ses leads, cherche un lead, ou veut des stats.",
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Filtrer par ville' },
          categorie: { type: 'string', enum: ['CHAUD', 'TIEDE', 'FROID'], description: 'Catégorie du lead' },
          status: { type: 'string', enum: ['nouveau', 'contacte', 'en_negociation', 'converti', 'perdu'] },
          lead_type: { type: 'string', enum: ['acheteur', 'locataire', 'vendeur', 'bailleur'] },
          name_search: { type: 'string', description: 'Recherche par nom/prénom (partiel)' },
          limit: { type: 'number', description: 'Nombre max de résultats (défaut 10)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_listings',
      description: "Rechercher des biens immobiliers. Utilise quand l'utilisateur cherche des biens, veut matcher un lead, ou demande des infos sur son portefeuille.",
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'Filtrer par ville' },
          property_type: { type: 'string', description: 'studio, t1, t2, t3, t4, t5, maison, villa, loft' },
          transaction_type: { type: 'string', enum: ['vente', 'location'] },
          price_max: { type: 'number', description: 'Prix maximum' },
          price_min: { type: 'number', description: 'Prix minimum' },
          rooms_min: { type: 'number', description: 'Nombre min de pièces' },
          surface_min: { type: 'number', description: 'Surface min en m²' },
          status: { type: 'string', enum: ['brouillon', 'en_cours', 'publie', 'vendu'] },
          limit: { type: 'number', description: 'Nombre max de résultats (défaut 10)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_lead_details',
      description: "Détails complets d'un lead par son ID.",
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'UUID du lead' },
        },
        required: ['lead_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_listing_details',
      description: "Détails complets d'un bien immobilier par son ID.",
      parameters: {
        type: 'object',
        properties: {
          listing_id: { type: 'string', description: 'UUID du bien' },
        },
        required: ['listing_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_upcoming_events',
      description: "Prochains RDV/événements programmés. Utilise quand l'utilisateur demande son planning ou ses visites à venir.",
      parameters: {
        type: 'object',
        properties: {
          days_ahead: { type: 'number', description: 'Jours dans le futur (défaut 7)' },
          type: { type: 'string', enum: ['visit', 'call', 'meeting', 'other'] },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_pipeline_stats',
      description: "Stats du pipeline : leads par catégorie/statut, nombre de biens, prochains RDV. Utilise pour un résumé d'activité.",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_matching_listings',
      description: "Trouver les biens qui matchent les critères d'un lead (ville, budget, type, surface). Utilise quand l'utilisateur demande s'il a un bien pour un lead.",
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'UUID du lead' },
        },
        required: ['lead_id'],
      },
    },
  },

  // ═══ WRITE TOOLS ═══
  {
    type: 'function',
    function: {
      name: 'create_event',
      description: "Créer un RDV, une visite, un appel ou une réunion. Utilise quand l'utilisateur veut programmer/planifier quelque chose.",
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Titre du RDV (ex: "Visite - M. Dupont")' },
          type: { type: 'string', enum: ['visit', 'call', 'meeting', 'other'], description: "Type d'événement" },
          date: { type: 'string', description: 'Date/heure de début ISO 8601' },
          end_date: { type: 'string', description: 'Date/heure de fin ISO 8601' },
          location: { type: 'string', description: 'Lieu' },
          description: { type: 'string', description: 'Notes' },
          linked_to_id: { type: 'string', description: 'UUID du lead ou bien lié' },
          linked_to_type: { type: 'string', enum: ['lead', 'listing'] },
        },
        required: ['title', 'type', 'date'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_lead',
      description: "Modifier un lead existant (statut, catégorie, notes, contact, critères...).",
      parameters: {
        type: 'object',
        properties: {
          lead_id: { type: 'string', description: 'UUID du lead' },
          updates: {
            type: 'object',
            description: 'Champs à modifier',
            properties: {
              first_name: { type: 'string' },
              last_name: { type: 'string' },
              email: { type: 'string' },
              phone: { type: 'string' },
              city: { type: 'string' },
              budget_min: { type: 'number' },
              budget_max: { type: 'number' },
              property_type: { type: 'string' },
              surface_min: { type: 'number' },
              rooms_min: { type: 'number' },
              status: { type: 'string', enum: ['nouveau', 'contacte', 'en_negociation', 'converti', 'perdu'] },
              categorie: { type: 'string', enum: ['CHAUD', 'TIEDE', 'FROID'] },
              notes: { type: 'string' },
              financing_status: { type: 'string' },
            },
          },
        },
        required: ['lead_id', 'updates'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: "Créer une tâche ou un rappel.",
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Titre' },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          due_date: { type: 'string', description: 'Date limite ISO 8601' },
          linked_to_id: { type: 'string', description: 'UUID entité liée' },
          linked_to_type: { type: 'string', enum: ['lead', 'listing'] },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_note',
      description: "Ajouter une note sur un lead ou un bien.",
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Contenu de la note' },
          linked_to_id: { type: 'string', description: 'UUID entité liée' },
          linked_to_type: { type: 'string', enum: ['lead', 'listing'] },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_activity',
      description: "Logger une activité (appel, email...) dans le fil.",
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['call', 'email', 'event', 'task', 'note', 'other'] },
          description: { type: 'string' },
          linked_to_id: { type: 'string' },
          linked_to_type: { type: 'string', enum: ['lead', 'listing'] },
        },
        required: ['type', 'description'],
      },
    },
  },
]

// ─── Tool Executor ───────────────────────────────────────────────────────────

const toolHandlers = {
  async search_leads(args) {
    const { city, categorie, status, lead_type, name_search, limit = 10 } = args
    let query = supabase.from('leads').select('id, first_name, last_name, email, phone, city, budget_max, property_type, surface_min, rooms_min, status, categorie, score, lead_type, notes, created_date')

    if (city) query = query.ilike('city', `%${city}%`)
    if (categorie) query = query.eq('categorie', categorie)
    if (status) query = query.eq('status', status)
    if (lead_type) query = query.eq('lead_type', lead_type)
    if (name_search) {
      const parts = name_search.trim().split(/\s+/)
      const conditions = parts.map(p => `first_name.ilike.%${p}%,last_name.ilike.%${p}%`).join(',')
      query = query.or(conditions)
    }

    query = query.order('created_date', { ascending: false }).limit(limit)
    const { data, error } = await query
    if (error) throw error
    return { leads: data || [], count: data?.length || 0 }
  },

  async search_listings(args) {
    const { city, property_type, transaction_type, price_max, price_min, rooms_min, surface_min, status, limit = 10 } = args
    let query = supabase.from('listings').select('id, title, price, city, surface, rooms, bedrooms, property_type, transaction_type, status, address, postal_code, created_date')

    if (city) query = query.ilike('city', `%${city}%`)
    if (property_type) query = query.eq('property_type', property_type)
    if (transaction_type) query = query.eq('transaction_type', transaction_type)
    if (price_max) query = query.lte('price', price_max)
    if (price_min) query = query.gte('price', price_min)
    if (rooms_min) query = query.gte('rooms', rooms_min)
    if (surface_min) query = query.gte('surface', surface_min)
    if (status) query = query.eq('status', status)

    query = query.order('created_date', { ascending: false }).limit(limit)
    const { data, error } = await query
    if (error) throw error
    return { listings: data || [], count: data?.length || 0 }
  },

  async get_lead_details(args) {
    const lead = await base44.entities.Lead.get(args.lead_id)
    return { lead }
  },

  async get_listing_details(args) {
    const listing = await base44.entities.Listing.get(args.listing_id)
    return { listing }
  },

  async get_upcoming_events(args) {
    const { days_ahead = 7, type } = args
    const now = new Date()
    const future = new Date(now.getTime() + days_ahead * 86400000)

    let query = supabase.from('events').select('*')
      .gte('date', now.toISOString())
      .lte('date', future.toISOString())
      .neq('status', 'cancelled')

    if (type) query = query.eq('type', type)
    query = query.order('date', { ascending: true })

    const { data, error } = await query
    if (error) throw error
    return { events: data || [], count: data?.length || 0 }
  },

  async get_pipeline_stats() {
    const [leadsRes, listingsRes, eventsRes, tasksRes] = await Promise.all([
      supabase.from('leads').select('id, categorie, status, lead_type'),
      supabase.from('listings').select('id, status, transaction_type'),
      supabase.from('events').select('id, date, status, type').gte('date', new Date().toISOString()).neq('status', 'cancelled').order('date', { ascending: true }).limit(5),
      supabase.from('tasks').select('id, status, priority').eq('status', 'pending'),
    ])

    const leads = leadsRes.data || []
    const listings = listingsRes.data || []
    const events = eventsRes.data || []
    const tasks = tasksRes.data || []

    return {
      leads: {
        total: leads.length,
        by_categorie: {
          CHAUD: leads.filter(l => l.categorie === 'CHAUD').length,
          TIEDE: leads.filter(l => l.categorie === 'TIEDE').length,
          FROID: leads.filter(l => l.categorie === 'FROID').length,
        },
        by_status: {
          nouveau: leads.filter(l => l.status === 'nouveau').length,
          contacte: leads.filter(l => l.status === 'contacte').length,
          en_negociation: leads.filter(l => l.status === 'en_negociation').length,
          converti: leads.filter(l => l.status === 'converti').length,
          perdu: leads.filter(l => l.status === 'perdu').length,
        },
      },
      listings: {
        total: listings.length,
        by_status: {
          brouillon: listings.filter(l => l.status === 'brouillon').length,
          en_cours: listings.filter(l => l.status === 'en_cours').length,
          publie: listings.filter(l => l.status === 'publie').length,
          vendu: listings.filter(l => l.status === 'vendu').length,
        },
      },
      upcoming_events: events,
      pending_tasks: tasks.length,
    }
  },

  async find_matching_listings(args) {
    const lead = await base44.entities.Lead.get(args.lead_id)

    let query = supabase.from('listings').select('id, title, price, city, surface, rooms, bedrooms, property_type, transaction_type, status, address')

    if (lead.city) query = query.ilike('city', `%${lead.city}%`)
    if (lead.budget_max) query = query.lte('price', lead.budget_max * 1.15)
    if (lead.budget_min) query = query.gte('price', lead.budget_min * 0.85)
    if (lead.property_type) query = query.eq('property_type', lead.property_type)
    if (lead.surface_min) query = query.gte('surface', lead.surface_min * 0.8)
    if (lead.rooms_min) query = query.gte('rooms', lead.rooms_min)

    query = query.limit(10)
    const { data, error } = await query
    if (error) throw error

    return {
      lead_summary: `${lead.first_name} ${lead.last_name} — ${lead.city}, ${lead.property_type}, budget ${lead.budget_max}€`,
      matching_listings: data || [],
      count: data?.length || 0,
    }
  },

  // ═══ WRITE HANDLERS ═══

  async create_event(args) {
    const event = await base44.entities.Event.create({
      title: args.title,
      type: args.type,
      date: args.date,
      end_date: args.end_date || null,
      location: args.location || null,
      description: args.description || null,
      linked_to_id: args.linked_to_id || null,
      linked_to_type: args.linked_to_type || null,
      status: 'pending',
    })

    const typeLabel = args.type === 'call' ? 'Appel' : args.type === 'visit' ? 'Visite' : args.type === 'meeting' ? 'Réunion' : 'Événement'
    await base44.entities.Activity.create({
      type: 'event',
      title: `${typeLabel} programmé: ${args.title}`,
      description: args.description || null,
      linked_to_id: args.linked_to_id || null,
      linked_to_type: args.linked_to_type || null,
    })

    return { success: true, event, message: `RDV "${args.title}" créé pour le ${new Date(args.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}` }
  },

  async update_lead(args) {
    const updated = await base44.entities.Lead.update(args.lead_id, args.updates)
    const changedFields = Object.keys(args.updates).join(', ')
    return { success: true, lead: updated, message: `Lead mis à jour (${changedFields})` }
  },

  async create_task(args) {
    const task = await base44.entities.Task.create({
      title: args.title,
      description: args.description || null,
      priority: args.priority || 'medium',
      due_date: args.due_date || null,
      linked_to_id: args.linked_to_id || null,
      linked_to_type: args.linked_to_type || null,
      status: 'pending',
    })
    return { success: true, task, message: `Tâche "${args.title}" créée` }
  },

  async add_note(args) {
    const note = await base44.entities.Note.create({
      content: args.content,
      linked_to_id: args.linked_to_id || null,
      linked_to_type: args.linked_to_type || null,
    })
    return { success: true, note, message: 'Note ajoutée' }
  },

  async add_activity(args) {
    const activity = await base44.entities.Activity.create({
      type: args.type,
      description: args.description,
      linked_to_id: args.linked_to_id || null,
      linked_to_type: args.linked_to_type || null,
    })
    return { success: true, activity, message: 'Activité enregistrée' }
  },
}

/**
 * Execute a tool call returned by OpenAI.
 * Returns { name, result } or { name, error }.
 */
export async function executeToolCall(name, args) {
  const handler = toolHandlers[name]
  if (!handler) {
    return { name, error: `Outil inconnu: ${name}` }
  }
  try {
    const result = await handler(typeof args === 'string' ? JSON.parse(args) : args)
    return { name, result }
  } catch (err) {
    console.error(`[ai-tools] Error executing ${name}:`, err)
    return { name, error: err.message || 'Erreur interne' }
  }
}

/**
 * Run the full agent loop: send messages to LLM, execute tool calls, repeat until final answer.
 * Returns { messages, finalContent } where messages includes all tool exchanges.
 */
export async function runAgentLoop(systemPrompt, conversationMessages, invokeLLM, maxIterations = 5) {
  const openaiMessages = [
    { role: 'system', content: systemPrompt },
    ...conversationMessages,
  ]

  for (let i = 0; i < maxIterations; i++) {
    const response = await invokeLLM({
      messages: openaiMessages,
      tools: CRM_TOOLS,
    })

    if (response.tool_calls && response.tool_calls.length > 0) {
      openaiMessages.push({
        role: 'assistant',
        content: response.content || null,
        tool_calls: response.tool_calls,
      })

      for (const toolCall of response.tool_calls) {
        const args = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments

        const { result, error } = await executeToolCall(toolCall.function.name, args)

        openaiMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(error ? { error } : result),
        })
      }
      continue
    }

    const finalContent = typeof response === 'string'
      ? response
      : (response.content || response.message || JSON.stringify(response))

    return {
      messages: openaiMessages,
      finalContent,
      toolCallsExecuted: openaiMessages.filter(m => m.role === 'tool').map(m => {
        const parentCall = openaiMessages.find(
          am => am.tool_calls?.some(tc => tc.id === m.tool_call_id)
        )
        const tc = parentCall?.tool_calls?.find(tc => tc.id === m.tool_call_id)
        return {
          name: tc?.function?.name,
          args: tc?.function?.arguments,
          result: m.content,
        }
      }),
    }
  }

  return {
    messages: openaiMessages,
    finalContent: "J'ai atteint la limite d'actions. Peux-tu reformuler ta demande ?",
    toolCallsExecuted: [],
  }
}

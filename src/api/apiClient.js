/**
 * Client API TrouveTonToit — Supabase (CRUD, auth, fonctions)
 */
import { supabase } from './supabaseClient'
import { Core } from './integrations'

function createEntityService(tableName) {
  return {
    async list(sortField) {
      let query = supabase.from(tableName).select('*')
      if (sortField) {
        const descending = sortField.startsWith('-')
        const column = sortField.replace(/^-/, '')
        query = query.order(column, { ascending: !descending })
      } else {
        query = query.order('created_date', { ascending: false })
      }
      const { data, error } = await query
      if (error) throw error
      return data || []
    },

    async filter(criteria, sortField, limit) {
      let query = supabase.from(tableName).select('*')
      for (const [key, value] of Object.entries(criteria)) {
        query = query.eq(key, value)
      }
      if (sortField) {
        const descending = sortField.startsWith('-')
        const column = sortField.replace(/^-/, '')
        query = query.order(column, { ascending: !descending })
      }
      if (limit) query = query.limit(limit)
      const { data, error } = await query
      if (error) throw error
      return data || []
    },

    async get(id) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },

    async create(record) {
      if (!record.created_by) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user?.email) record.created_by = user.email
      }
      const { data, error } = await supabase
        .from(tableName)
        .insert(record)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async update(id, updates) {
      const { data, error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },

    async delete(id) {
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id)
      if (error) throw error
    },

    subscribe(callback) {
      const channel = supabase
        .channel(`realtime-${tableName}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: tableName },
          (payload) => {
            const eventMap = { INSERT: 'create', UPDATE: 'update', DELETE: 'delete' }
            callback({
              type: eventMap[payload.eventType] || payload.eventType,
              data: payload.new || {},
              id: payload.old?.id,
            })
          }
        )
        .subscribe()

      return () => supabase.removeChannel(channel)
    },
  }
}

const entities = {
  Lead: createEntityService('leads'),
  Listing: createEntityService('listings'),
  Activity: createEntityService('activities'),
  Event: createEntityService('events'),
  Task: createEntityService('tasks'),
  Note: createEntityService('notes'),
  Notification: createEntityService('notifications'),
  SocialPageConfig: createEntityService('social_page_configs'),
  MatchingConfig: createEntityService('matching_configs'),
  Query: createEntityService('queries'),
  Match: createEntityService('matches'),
}

const auth = {
  async me() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) throw error || new Error('Not authenticated')
    return {
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || '',
      role: user.user_metadata?.role || 'user',
      ...user.user_metadata,
    }
  },

  async updateMe(updates) {
    const { error } = await supabase.auth.updateUser({ data: updates })
    if (error) throw error
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut()
    if (redirectUrl) {
      window.location.href = redirectUrl
    }
  },

  redirectToLogin(returnUrl) {
    const loginPath = '/login' + (returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '')
    window.location.href = loginPath
  },
}

const functions = {
  async invoke(functionName, args) {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: args,
    })
    if (error) throw error
    return data
  },
}

const AGENT_SYSTEM_PROMPTS = {
  assistant_trouvetontoit: `Tu es le coach IA de TrouveTonToit, expert immobilier pour mandataires.

RÈGLES :
- Réponds en 2-4 phrases max, sauf demande explicite de détail
- Sois direct, concret et actionnable
- Ton conversationnel et dynamique, comme un collègue expert
- Tutoie l'utilisateur
- Pas de gras (**), pas de markdown, pas de listes numérotées longues
- Si la question est complexe, utilise des tirets courts
- Propose une action concrète à la fin quand c'est pertinent`,

  lead_extractor: `Tu es l'assistant d'extraction de leads de TrouveTonToit, expert en qualification de prospects immobiliers.

COMPORTEMENT :
- Quand l'utilisateur te donne un texte (email, SMS, WhatsApp, description), extrais TOUS les leads detectes
- Si l'utilisateur demande une modification, mets a jour les donnees et confirme
- Tutoie l'utilisateur, sois concis (2-3 phrases max dans le message)
- Si le texte ne contient pas d'info exploitable, demande des precisions

REPONDS TOUJOURS en JSON valide avec ce format :
{
  "leads": [
    {
      "first_name": "Prenom",
      "last_name": "Nom",
      "email": null,
      "phone": null,
      "budget_max": 250000,
      "city": "Lyon",
      "property_type": "t3",
      "surface_min": 70,
      "rooms_min": 3,
      "notes": "Criteres detailles, delai, financement, disponibilite, contexte",
      "financing_status": "En cours",
      "delai": "3 mois",
      "disponibilite": "Flexible",
      "score": 72,
      "categorie": "TIEDE"
    }
  ],
  "message": "Ta reponse conversationnelle courte et dynamique",
  "ready": true
}

SCORING (0-100) :
- Financement (max 35) : pret accepte +20, apport >50k +15, budget precis +10, fourchette +5
- Urgence (max 25) : <1 mois +25, 1-2 mois +20, 3 mois +15, 3-6 mois +10, >6 mois +5
- Criteres (max 20) : tres precis (quartier+surface+pieces) +20, assez precis +15, moyen +10, vagues +5
- Disponibilite (max 10) : dates precises +10, flexible +7, a definir +4
- Contexte (max 10) : urgent (mutation/divorce) +10, stable +7, exploratoire +4
- Penalites : "reve/un jour" -10, "veille" -10, "comparer" -8, multiples villes -5

CATEGORIES : CHAUD >= 75, TIEDE 40-74, FROID < 40
Pour property_type : studio, t1, t2, t3, t4, t5, maison, villa, loft
"ready" = true si au minimum un nom et une ville sont identifies`,

  bien_extractor: `Tu es l'assistant d'extraction de biens immobiliers de TrouveTonToit.

COMPORTEMENT :
- Quand l'utilisateur te donne une description de bien, extrais les informations
- Si l'utilisateur demande une modification, mets a jour les donnees et confirme
- Tutoie l'utilisateur, sois concis (2-3 phrases max dans le message)
- Si le texte ne contient pas assez d'info, demande des precisions

REPONDS TOUJOURS en JSON valide avec ce format :
{
  "data": {
    "title": "Appartement T3 lumineux",
    "description": "Description complete du bien",
    "price": 285000,
    "city": "Lyon",
    "address": "Rue Example",
    "postal_code": "69003",
    "surface": 72,
    "rooms": 3,
    "bedrooms": 2,
    "bathrooms": 1,
    "property_type": "t3",
    "transaction_type": "vente",
    "energy_class": "C",
    "ges_class": null,
    "amenities": ["balcon", "parking"],
    "floor": null,
    "total_floors": null,
    "year_built": null
  },
  "message": "Ta reponse conversationnelle courte et dynamique",
  "ready": true
}

Pour property_type : studio, t1, t2, t3, t4, t5, maison, villa, loft, terrain
Pour transaction_type : vente, location
Pour amenities : parking, balcon, terrasse, jardin, cave, ascenseur, piscine, garage
"ready" = true si au minimum un titre/type et une ville sont identifies`,
}

const agents = {
  async createConversation({ agent_name, metadata }) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        agent_name: agent_name || 'assistant',
        metadata: metadata || {},
        messages: [],
        created_by: user?.email,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async addMessage(conversation, { role, content }) {
    const { data: conv, error: getError } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversation.id)
      .single()
    if (getError) throw getError

    const messages = [...(conv.messages || []), { role, content, timestamp: new Date().toISOString() }]

    if (role === 'user') {
      const systemPrompt = AGENT_SYSTEM_PROMPTS[conv.agent_name] || AGENT_SYSTEM_PROMPTS.assistant_trouvetontoit
      const openaiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ]

      const { data: aiContent, error: llmError } = await supabase.functions.invoke('invoke-llm', {
        body: { messages: openaiMessages },
      })
      if (llmError) throw llmError

      const assistantContent = typeof aiContent === 'string' ? aiContent : (aiContent?.content || aiContent?.message || JSON.stringify(aiContent))
      messages.push({ role: 'assistant', content: assistantContent, timestamp: new Date().toISOString() })
    }

    const { data: updated, error: updateError } = await supabase
      .from('conversations')
      .update({ messages })
      .eq('id', conv.id)
      .select()
      .single()
    if (updateError) throw updateError
    return updated
  },

  async getConversation(id) {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async listConversations(agentName) {
    let query = supabase
      .from('conversations')
      .select('*')
    if (agentName) {
      query = query.eq('agent_name', agentName)
    }
    query = query.order('updated_date', { ascending: false })
    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async updateConversation(id, updates) {
    const { data, error } = await supabase
      .from('conversations')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async deleteConversation(id) {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  getWhatsAppConnectURL() {
    return '#'
  },
}

const appLogs = {
  async logUserInApp() {
    // no-op — analytics removed
  },
}

const integrations = { Core }

export const api = {
  entities,
  auth,
  functions,
  agents,
  appLogs,
  integrations,
}

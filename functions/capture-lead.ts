import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405, headers: CORS_HEADERS })
  }

  try {
    const body = await req.json()
    const { social_page_config_id, lead_data, event_data } = body || {}

    if (!social_page_config_id || !lead_data) {
      return Response.json(
        { error: 'social_page_config_id and lead_data are required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const { first_name, last_name, email } = lead_data
    if (!first_name || !last_name || !email) {
      return Response.json(
        { error: 'first_name, last_name and email are required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        { error: 'Server configuration error' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: config, error: configError } = await supabase
      .from('social_page_configs')
      .select('id, created_by')
      .eq('id', social_page_config_id)
      .single()

    if (configError) {
      return Response.json(
        { error: 'Page sociale non trouvée.' },
        { status: 404, headers: CORS_HEADERS }
      )
    }
    if (!config?.created_by) {
      return Response.json(
        { error: "Cette page n'a pas de mandataire associé. Sauvegardez-la depuis l'éditeur." },
        { status: 404, headers: CORS_HEADERS }
      )
    }

    const agentEmail = config.created_by

    const leadRecord = {
      first_name: lead_data.first_name,
      last_name: lead_data.last_name,
      email: lead_data.email,
      phone: lead_data.phone || null,
      lead_type: lead_data.lead_type || 'acheteur',
      property_type: lead_data.property_type || null,
      city: lead_data.city || null,
      budget_min: lead_data.budget_min || null,
      budget_max: lead_data.budget_max || null,
      notes: lead_data.notes || null,
      source: 'social_page',
      status: 'nouveau',
      created_by: agentEmail,
    }

    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert(leadRecord)
      .select('id')
      .single()

    if (leadError) {
      console.error('[capture-lead] Lead insert error:', leadError)
      return Response.json(
        { error: 'Impossible d\'enregistrer le lead.' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    if (event_data && event_data.appointment_date && event_data.appointment_type) {
      const eventDate = new Date(event_data.appointment_date)
      const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000)

      const eventType = event_data.appointment_type === 'Visite' ? 'visit'
        : event_data.appointment_type === 'Appel' ? 'call' : 'meeting'

      await supabase.from('events').insert({
        title: `${event_data.appointment_type} - ${lead_data.first_name} ${lead_data.last_name}`,
        type: eventType,
        date: eventDate.toISOString(),
        end_date: endDate.toISOString(),
        description: event_data.appointment_message || null,
        status: 'planned',
        linked_to_type: 'lead',
        linked_to_id: newLead.id,
        created_by: agentEmail,
      })

      await supabase.from('notifications').insert({
        type: 'info',
        title: 'Nouvelle demande de rendez-vous',
        message: `${lead_data.first_name} ${lead_data.last_name} a demandé un ${event_data.appointment_type.toLowerCase()} via la Social Page`,
        linked_lead_id: newLead.id,
        read: false,
        created_by: agentEmail,
      })
    } else {
      await supabase.from('notifications').insert({
        type: 'info',
        title: 'Nouveau lead capturé',
        message: `${lead_data.first_name} ${lead_data.last_name} a rempli le formulaire sur la Social Page`,
        linked_lead_id: newLead.id,
        read: false,
        created_by: agentEmail,
      })
    }

    return Response.json(
      { success: true, lead_id: newLead.id },
      { headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('[capture-lead] Error:', error?.message)
    return Response.json(
      { error: error?.message || 'Internal server error' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
})

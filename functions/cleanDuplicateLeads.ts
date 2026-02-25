import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader?.replace('Bearer ', ''))
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    // Récupérer tous les leads de l'utilisateur
    const { data: allLeads, error: leadsError } = await supabase
      .from('leads')
      .select('*')
      .eq('created_by', user.email)
      .order('created_date', { ascending: false })

    if (leadsError) throw leadsError

    // Grouper les leads par téléphone et email
    const leadsByPhone = {};
    const leadsByEmail = {};
    const duplicatesToDelete = [];

    for (const lead of allLeads) {
      // Grouper par téléphone (priorité)
      if (lead.phone) {
        const normalizedPhone = lead.phone.replace(/\s/g, '');
        if (!leadsByPhone[normalizedPhone]) {
          leadsByPhone[normalizedPhone] = [];
        }
        leadsByPhone[normalizedPhone].push(lead);
      }

      // Grouper par email
      if (lead.email) {
        const normalizedEmail = lead.email.toLowerCase().trim();
        if (!leadsByEmail[normalizedEmail]) {
          leadsByEmail[normalizedEmail] = [];
        }
        leadsByEmail[normalizedEmail].push(lead);
      }
    }

    // Identifier les doublons par téléphone
    for (const [phone, leads] of Object.entries(leadsByPhone)) {
      if (leads.length > 1) {
        // Garder le lead le plus récent ou celui avec le plus d'infos
        leads.sort((a, b) => {
          // Priorité au lead avec le plus d'infos
          const scoreA = (a.email ? 1 : 0) + (a.budget_max ? 1 : 0) + (a.city ? 1 : 0) + (a.notes ? 1 : 0);
          const scoreB = (b.email ? 1 : 0) + (b.budget_max ? 1 : 0) + (b.city ? 1 : 0) + (b.notes ? 1 : 0);
          if (scoreB !== scoreA) return scoreB - scoreA;
          // Sinon, garder le plus récent
          return new Date(b.created_date) - new Date(a.created_date);
        });

        // Marquer les autres comme doublons à supprimer
        for (let i = 1; i < leads.length; i++) {
          duplicatesToDelete.push({
            id: leads[i].id,
            reason: `Doublon de téléphone: ${phone}`,
            keptLead: leads[0].id
          });
        }
      }
    }

    // Identifier les doublons par email (seulement si pas déjà marqués)
    for (const [email, leads] of Object.entries(leadsByEmail)) {
      if (leads.length > 1) {
        const notAlreadyMarked = leads.filter(
          lead => !duplicatesToDelete.find(d => d.id === lead.id)
        );

        if (notAlreadyMarked.length > 1) {
          notAlreadyMarked.sort((a, b) => {
            const scoreA = (a.phone ? 1 : 0) + (a.budget_max ? 1 : 0) + (a.city ? 1 : 0) + (a.notes ? 1 : 0);
            const scoreB = (b.phone ? 1 : 0) + (b.budget_max ? 1 : 0) + (b.city ? 1 : 0) + (b.notes ? 1 : 0);
            if (scoreB !== scoreA) return scoreB - scoreA;
            return new Date(b.created_date) - new Date(a.created_date);
          });

          for (let i = 1; i < notAlreadyMarked.length; i++) {
            duplicatesToDelete.push({
              id: notAlreadyMarked[i].id,
              reason: `Doublon d'email: ${email}`,
              keptLead: notAlreadyMarked[0].id
            });
          }
        }
      }
    }

    // Supprimer les doublons
    const deleted = [];
    for (const duplicate of duplicatesToDelete) {
      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .eq('id', duplicate.id)
      if (!deleteError) deleted.push(duplicate);
    }

    return Response.json({
      success: true,
      duplicatesFound: duplicatesToDelete.length,
      duplicatesDeleted: deleted.length,
      details: deleted
    });

  } catch (error) {
    console.error('Error cleaning duplicates:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});

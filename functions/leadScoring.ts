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
};

Deno.serve(async (req) => {
  try {
    const { event } = await req.json();
    
    // Récupérer le lead_id selon le type d'événement
    let leadId;
    if (event.entity_name === 'Lead') {
      leadId = event.entity_id;
    } else {
      // Pour Activity, Event, Task, Note - récupérer le linked_to_id
      const tableName = entityTableMap[event.entity_name];
      if (!tableName) {
        return Response.json({ error: `Unknown entity: ${event.entity_name}` }, { status: 400 });
      }
      const { data: entity, error: entityError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', event.entity_id)
        .single();

      if (entityError) {
        return Response.json({ error: entityError.message }, { status: 500 });
      }

      if (entity.linked_to_type === 'lead') {
        leadId = entity.linked_to_id;
      } else {
        return Response.json({ message: 'Not linked to a lead' }, { status: 200 });
      }
    }

    if (!leadId) {
      return Response.json({ error: 'No lead ID found' }, { status: 400 });
    }

    // Récupérer le lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      return Response.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Sauvegarder l'ancien score pour comparaison
    const oldScore = lead.score || 0;
    const oldCategorie = lead.categorie || 'FROID';

    // ═══════════════════════════════════════════════════════════
    // 1. CALCUL DU SCORE INITIAL (0-50 points)
    // ═══════════════════════════════════════════════════════════
    let scoreInitial = 0;
    const raisons = [];

    // A. FINANCEMENT (0-25 points avec bonus apport)
    const financingPoints = {
      'pret_accepte': 20,
      'accord_principe': 15,
      'dossier_en_cours': 10,
      'simulation_faite': 5,
      'pas_encore_vu': 0,
      'aucun': 0
    };
    const financingScore = financingPoints[lead.financing_status] || 0;
    scoreInitial += financingScore;
    if (financingScore > 0) {
      raisons.push(`Financement : ${lead.financing_status.replace('_', ' ')} (${financingScore} pts)`);
    }

    // Bonus apport
    if (lead.apport_percentage) {
      if (lead.apport_percentage >= 20) {
        scoreInitial += 5;
        raisons.push(`Apport ${lead.apport_percentage}% (5 pts)`);
      } else if (lead.apport_percentage >= 10) {
        scoreInitial += 3;
        raisons.push(`Apport ${lead.apport_percentage}% (3 pts)`);
      }
    }

    // B. URGENCE/DÉLAI (0-15 points)
    const delaiPoints = {
      'moins_1_mois': 15,
      '1_2_mois': 12,
      '2_3_mois': 8,
      '3_6_mois': 5,
      'plus_6_mois': 2,
      'non_defini': 0
    };
    const delaiScore = delaiPoints[lead.delai] || 0;
    scoreInitial += delaiScore;
    if (delaiScore > 0) {
      raisons.push(`Délai ${lead.delai.replace('_', ' ')} (${delaiScore} pts)`);
    }

    // C. CRITÈRES DE RECHERCHE (0-10 points)
    let criteriaCount = 0;
    if (lead.city) criteriaCount++;
    if (lead.property_type) criteriaCount++;
    if (lead.budget_max) criteriaCount++;
    if (lead.surface_min) criteriaCount++;

    let criteriaScore = 0;
    if (criteriaCount === 4) criteriaScore = 10;
    else if (criteriaCount === 3) criteriaScore = 7;
    else if (criteriaCount >= 1) criteriaScore = 3;

    scoreInitial += criteriaScore;
    raisons.push(`Critères ${criteriaCount === 4 ? 'très précis' : criteriaCount === 3 ? 'moyens' : 'vagues'} (${criteriaScore} pts)`);

    // D. DISPONIBILITÉ (0-5 points)
    const dispoPoints = {
      'tous_les_jours': 5,
      'plusieurs_jours_semaine': 4,
      'weekends': 3,
      '1_2_creneaux_semaine': 2,
      'tres_limitee': 1
    };
    const dispoScore = dispoPoints[lead.disponibilite] || 0;
    scoreInitial += dispoScore;
    if (dispoScore > 0) {
      raisons.push(`Disponibilité ${lead.disponibilite.replace('_', ' ')} (${dispoScore} pts)`);
    }

    // Plafonner le score initial à 50
    scoreInitial = Math.min(50, scoreInitial);

    // ═══════════════════════════════════════════════════════════
    // 2. CALCUL DU SCORE D'ENGAGEMENT (0-30 points)
    // ═══════════════════════════════════════════════════════════
    let scoreEngagement = 0;

    // Récupérer toutes les activités liées
    const { data: activities } = await supabase.from('activities').select('*').eq('linked_to_id', leadId);
    const { data: events } = await supabase.from('events').select('*').eq('linked_to_id', leadId);
    const { data: tasks } = await supabase.from('tasks').select('*').eq('linked_to_id', leadId);
    const { data: notes } = await supabase.from('notes').select('*').eq('linked_to_id', leadId);

    // A. INTERACTIONS POSITIVES
    for (const event of (events || [])) {
      if (event.type === 'visit') {
        if (event.status === 'confirmed') {
          scoreEngagement += 8;
          raisons.push('Visite confirmée (+8 pts)');
        } else if (event.status === 'completed') {
          scoreEngagement += 10;
          raisons.push('Visite effectuée (+10 pts)');
        }
      }
    }

    for (const activity of (activities || [])) {
      if (activity.type === 'call') {
        scoreEngagement += 4;
        raisons.push('Appel téléphonique (+4 pts)');
      } else if (activity.type === 'email') {
        scoreEngagement += 3;
        raisons.push('Email échangé (+3 pts)');
      } else if (activity.type === 'sms') {
        scoreEngagement += 3;
        raisons.push('SMS échangé (+3 pts)');
      } else if (activity.type === 'visite') {
        const title = (activity.title || '').toLowerCase();
        if (title.includes('effectuée')) {
          scoreEngagement += 10;
          raisons.push('Visite effectuée (+10 pts)');
        } else {
          scoreEngagement += 6;
          raisons.push('Visite planifiée (+6 pts)');
        }
      } else if (activity.type === 'matching_proposition') {
        scoreEngagement += 3;
        raisons.push('Bien proposé (+3 pts)');
      } else if (activity.type === 'matching_accepte') {
        scoreEngagement += 12;
        raisons.push('Bien accepté — engagement fort (+12 pts)');
      } else if (activity.type === 'matching_refuse') {
        scoreEngagement -= 2;
        raisons.push('Bien refusé (-2 pts)');
      }
    }

    for (const task of (tasks || [])) {
      if (task.status === 'completed') {
        scoreEngagement += 2;
        raisons.push('Tâche complétée (+2 pts)');
      }
    }

    // B. ANALYSE DES NOTES (contexte et réactivité)
    const notesText = lead.notes ? lead.notes.toLowerCase() : '';
    const allNotesText = (notes || []).map(n => (n.content || '').toLowerCase()).join(' ') + ' ' + notesText;

    // Signes positifs
    if (allNotesText.includes('très motivé') || allNotesText.includes('motivée') || allNotesText.includes('motivé')) {
      scoreEngagement += 3;
      raisons.push('Très motivé(e) (+3 pts)');
    }
    if (allNotesText.includes('urgent') || allNotesText.includes('pressé')) {
      scoreEngagement += 3;
      raisons.push('Urgence détectée (+3 pts)');
    }
    if (allNotesText.includes('rapidement') || allNotesText.includes('peut signer')) {
      scoreEngagement += 3;
      raisons.push('Prêt(e) à signer rapidement (+3 pts)');
    }
    if (allNotesText.includes('réactif') || allNotesText.includes('< 2h') || allNotesText.includes('répond rapidement')) {
      scoreEngagement += 3;
      raisons.push('Très réactif(ve) (+3 pts)');
    }

    // Signes négatifs
    if (allNotesText.includes('annule')) {
      scoreEngagement -= 8;
      raisons.push('Annulation visite (-8 pts)');
    }
    if (allNotesText.includes('pas de réponse') || allNotesText.includes('ne répond pas')) {
      scoreEngagement -= 5;
      raisons.push('Pas de réponse (-5 pts)');
    }
    if (allNotesText.includes('réfléchis') || allNotesText.includes('je vais voir')) {
      const count = (allNotesText.match(/réfléchis|je vais voir/g) || []).length;
      if (count > 1) {
        scoreEngagement -= 5;
        raisons.push('Hésite beaucoup (-5 pts)');
      }
    }

    // Plafonner entre 0 et 30
    scoreEngagement = Math.max(0, Math.min(30, scoreEngagement));

    // ═══════════════════════════════════════════════════════════
    // 3. CALCUL DU SCORE DE PROGRESSION (0-20 points)
    // ═══════════════════════════════════════════════════════════
    let scoreProgression = 0;

    // A. ÉTAPES FRANCHIES
    if (allNotesText.includes('dossier complet') || allNotesText.includes('documents fournis')) {
      scoreProgression += 8;
      raisons.push('Dossier complet fourni (+8 pts)');
    }
    
    const hasBankMeeting = (events || []).some(e => 
      e.type === 'meeting' && (e.title?.toLowerCase().includes('banque') || e.description?.toLowerCase().includes('banque'))
    );
    if (hasBankMeeting) {
      scoreProgression += 4;
      raisons.push('RDV banquier planifié (+4 pts)');
    }

    // B. NÉGOCIATIONS
    if (lead.status === 'en_negociation') {
      scoreProgression += 10;
      raisons.push('En négociation active (+10 pts)');
    }

    if (allNotesText.includes('offre') || allNotesText.includes('proposition')) {
      scoreProgression += 15;
      raisons.push('Offre d\'achat faite (+15 pts)');
    }

    if (allNotesText.includes('dpe') || allNotesText.includes('charges') || allNotesText.includes('travaux')) {
      scoreProgression += 5;
      raisons.push('Questions précises posées (+5 pts)');
    }

    // Visite du même bien plusieurs fois
    const visitCounts = {};
    for (const event of (events || [])) {
      if (event.type === 'visit' && event.location) {
        visitCounts[event.location] = (visitCounts[event.location] || 0) + 1;
      }
    }
    const hasMultipleVisits = Object.values(visitCounts).some(count => count > 1);
    if (hasMultipleVisits) {
      scoreProgression += 8;
      raisons.push('Visite 2ème fois même bien (+8 pts)');
    }

    // C. RÉGRESSION
    if (allNotesText.includes('pause') || allNotesText.includes('reporter')) {
      scoreProgression -= 20;
      raisons.push('Projet en pause (-20 pts)');
    }
    if (allNotesText.includes('cherche ailleurs') || allNotesText.includes('autre agence')) {
      scoreProgression -= 15;
      raisons.push('Cherche ailleurs (-15 pts)');
    }
    if (allNotesText.includes('budget réduit')) {
      scoreProgression -= 10;
      raisons.push('Budget réduit (-10 pts)');
    }

    // Plafonner entre 0 et 20
    scoreProgression = Math.max(0, Math.min(20, scoreProgression));

    // ═══════════════════════════════════════════════════════════
    // 4. CALCUL DU SCORE TOTAL
    // ═══════════════════════════════════════════════════════════
    const scoreTotal = Math.max(0, Math.min(100, scoreInitial + scoreEngagement + scoreProgression));

    // ═══════════════════════════════════════════════════════════
    // 5. CATÉGORISATION
    // ═══════════════════════════════════════════════════════════
    let categorie;
    if (scoreTotal >= 75) {
      categorie = 'CHAUD';
    } else if (scoreTotal >= 50) {
      categorie = 'TIEDE';
    } else {
      categorie = 'FROID';
    }

    // ═══════════════════════════════════════════════════════════
    // 6. CRÉATION DU LOG
    // ═══════════════════════════════════════════════════════════
    const newLog = {
      date: new Date().toISOString(),
      ancien_score: oldScore,
      nouveau_score: scoreTotal,
      variation: scoreTotal - oldScore >= 0 ? `+${scoreTotal - oldScore}` : `${scoreTotal - oldScore}`,
      ancien_categorie: oldCategorie,
      nouveau_categorie: categorie,
      raisons: raisons.slice(0, 10),
      score_detail: {
        initial: scoreInitial,
        engagement: scoreEngagement,
        progression: scoreProgression
      }
    };

    const scoringLogs = lead.scoring_logs || [];
    scoringLogs.unshift(newLog);

    if (scoringLogs.length > 20) {
      scoringLogs.splice(20);
    }

    // ═══════════════════════════════════════════════════════════
    // 7. MISE À JOUR DU LEAD
    // ═══════════════════════════════════════════════════════════
    await supabase
      .from('leads')
      .update({
        score: scoreTotal,
        score_initial: scoreInitial,
        score_engagement: scoreEngagement,
        score_progression: scoreProgression,
        categorie: categorie,
        date_scoring: new Date().toISOString(),
        scoring_logs: scoringLogs
      })
      .eq('id', leadId);

    return Response.json({
      success: true,
      leadId,
      score: {
        total: scoreTotal,
        initial: scoreInitial,
        engagement: scoreEngagement,
        progression: scoreProgression
      },
      categorie,
      changement: scoreTotal !== oldScore || categorie !== oldCategorie
    });

  } catch (error) {
    console.error('Error in leadScoring:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

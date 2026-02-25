import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
    try {
        const { event } = await req.json();
        const entityType = event?.entity_name;
        const entityId = event?.entity_id;

        if (!entityType || !entityId) {
            return Response.json({ error: 'Invalid event data' }, { status: 400 });
        }

        // Récupérer la configuration de matching
        const { data: configs } = await supabase.from('matching_configs').select('*');
        const config = (configs && configs[0]) || {
            thresholds: { chaud_min: 75, tiede_min: 40 },
            weights: { budget: 35, city: 25, surface: 20, rooms: 10, property_type: 10 },
            tolerance: { budget_percentage: 15, surface_percentage: 20, rooms_difference: 1 },
            financing_bonus: { valide: 15, en_cours: 5 }
        };

        let notifications = [];

        if (entityType === 'Lead') {
            // Nouveau lead créé : trouver les biens correspondants
            const { data: lead, error: leadError } = await supabase
                .from('leads')
                .select('*')
                .eq('id', entityId)
                .single();

            if (leadError || !lead || (lead.lead_type !== 'acheteur' && lead.lead_type !== 'locataire')) {
                return Response.json({ success: true, message: 'Lead type not applicable for matching' });
            }

            const { data: listings } = await supabase
                .from('listings')
                .select('*')
                .eq('status', 'publie');

            let bestMatches = [];

            for (const listing of (listings || [])) {
                const matchResult = calculateMatch(lead, listing, config);
                
                if (matchResult.score >= config.thresholds.tiede_min) {
                    bestMatches.push({
                        listing,
                        score: matchResult.score
                    });
                }
            }

            if (bestMatches.length > 0) {
                bestMatches.sort((a, b) => b.score - a.score);
                const topMatches = bestMatches.slice(0, 3);

                const createdByUser = lead.created_by;
                if (createdByUser) {
                    await supabase.from('notifications').insert({
                        type: 'new_lead_matches',
                        title: '🎯 Nouveau lead avec correspondances',
                        message: `${lead.first_name} ${lead.last_name} correspond à ${bestMatches.length} bien(s). Meilleur match : ${topMatches[0].listing.title} (${topMatches[0].score}%)`,
                        linked_lead_id: lead.id,
                        match_count: bestMatches.length,
                        read: false,
                        created_by: createdByUser
                    });

                    notifications.push({
                        type: 'new_lead_matches',
                        leadId: lead.id,
                        matchCount: topMatches.length
                    });
                }
            }

        } else if (entityType === 'Listing') {
            // Nouveau bien créé : trouver les leads correspondants
            const { data: listing, error: listingError } = await supabase
                .from('listings')
                .select('*')
                .eq('id', entityId)
                .single();

            if (listingError || !listing) {
                return Response.json({ error: 'Listing not found' }, { status: 404 });
            }

            const { data: allLeads } = await supabase.from('leads').select('*');
            const leads = (allLeads || []).filter(lead => 
                lead.lead_type === 'acheteur' || lead.lead_type === 'locataire'
            );

            let bestMatches = [];

            for (const lead of leads) {
                const matchResult = calculateMatch(lead, listing, config);
                
                if (matchResult.score >= config.thresholds.tiede_min) {
                    bestMatches.push({
                        lead,
                        score: matchResult.score
                    });
                }
            }

            if (bestMatches.length > 0) {
                bestMatches.sort((a, b) => b.score - a.score);
                const topMatches = bestMatches.slice(0, 5);

                const createdByUser = listing.created_by;
                if (createdByUser) {
                    await supabase.from('notifications').insert({
                        type: 'new_listing_matches',
                        title: '🏡 Nouveau bien avec correspondances',
                        message: `${listing.title} correspond à ${bestMatches.length} lead(s). Meilleur match : ${topMatches[0].lead.first_name} ${topMatches[0].lead.last_name} (${topMatches[0].score}%)`,
                        linked_listing_id: listing.id,
                        match_count: bestMatches.length,
                        read: false,
                        created_by: createdByUser
                    });

                    notifications.push({
                        type: 'new_listing_matches',
                        listingId: listing.id,
                        matchCount: topMatches.length
                    });
                }
            }
        }

        return Response.json({ 
            success: true,
            notifications: notifications,
            message: `Processed ${entityType} ${entityId}`
        });

    } catch (error) {
        console.error('Error in notifyNewMatches:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function calculateMatch(lead, listing, config) {
    let score = 0;
    let details = {};

    const normalizeCity = (city) => {
        if (!city) return '';
        let normalized = city.trim().toLowerCase();
        normalized = normalized.replace(/\s\d+(?:ème|e)?$/g, ''); 
        return normalized;
    };

    // CRITÈRE BLOQUANT 1 : TYPE DE TRANSACTION (priorité absolue)
    if (lead.lead_type === 'acheteur' && listing.transaction_type !== 'vente') {
        return { score: 0, details: { blocked: true, reason: 'Lead acheteur mais bien en location' } };
    }
    if (lead.lead_type === 'locataire' && listing.transaction_type !== 'location') {
        return { score: 0, details: { blocked: true, reason: 'Lead locataire mais bien en vente' } };
    }

    // CRITÈRE BLOQUANT 2 : VILLE (priorité absolue)
    if (lead.city && listing.city) {
        const leadCities = lead.city.split(',').map(c => normalizeCity(c));
        const listingCity = normalizeCity(listing.city);
        if (!leadCities.includes(listingCity)) {
            return { score: 0, details: { blocked: true, reason: 'Ville non correspondante' } };
        }
    }

    // Vérifier les critères bloquants (équipements)
    if (lead.blocking_criteria && lead.blocking_criteria.length > 0) {
        const listingAmenities = (listing.amenities || []).map(a => a.toLowerCase().trim());
        
        for (const criterion of lead.blocking_criteria) {
            const criterionLower = criterion.toLowerCase().trim();
            if (!listingAmenities.includes(criterionLower)) {
                return { score: 0, details: { blocked: true, criterion } };
            }
        }
    }

    // Type de bien
    if (lead.property_type && listing.property_type && lead.property_type.toLowerCase() === listing.property_type.toLowerCase()) {
        details.property_type = config.weights.property_type;
        score += config.weights.property_type;
    }

    // Ville
    if (lead.city && listing.city) {
        const leadCities = lead.city.split(',').map(c => normalizeCity(c));
        const listingCity = normalizeCity(listing.city);
        if (leadCities.includes(listingCity)) {
            details.city = config.weights.city;
            score += config.weights.city;
        }
    }

    // Budget avec tolérance
    if (lead.budget_max !== undefined && lead.budget_max > 0) {
        const toleranceRate = config.tolerance.budget_percentage / 100;
        const budgetMax = lead.budget_max * (1 + toleranceRate);
        const budgetMin = lead.budget_min ? lead.budget_min * (1 - toleranceRate) : 0;
        
        if (listing.price >= budgetMin && listing.price <= budgetMax) {
            details.budget = config.weights.budget;
            score += config.weights.budget;
        } else if (listing.price <= budgetMax * 1.2) {
            const partialScore = Math.round(config.weights.budget * 0.5);
            details.budget = partialScore;
            score += partialScore;
        }
    } else if (lead.budget_min !== undefined && lead.budget_min > 0) {
        const toleranceRate = config.tolerance.budget_percentage / 100;
        const budgetMin = lead.budget_min * (1 - toleranceRate);
        
        if (listing.price >= budgetMin) {
            details.budget = config.weights.budget;
            score += config.weights.budget;
        }
    }

    // Nombre de pièces avec tolérance
    if (lead.rooms_min !== undefined && lead.rooms_min > 0 && listing.rooms !== undefined) {
        const roomsTolerance = config.tolerance.rooms_difference;
        if (listing.rooms >= lead.rooms_min - roomsTolerance) {
            details.rooms = config.weights.rooms;
            score += config.weights.rooms;
        }
    }

    // Surface avec tolérance
    if (lead.surface_min !== undefined && lead.surface_min > 0 && listing.surface !== undefined) {
        const toleranceRate = config.tolerance.surface_percentage / 100;
        const surfaceMin = lead.surface_min * (1 - toleranceRate);
        const surfaceMax = lead.surface_max ? lead.surface_max * (1 + toleranceRate) : Infinity;
        
        if (listing.surface >= surfaceMin && listing.surface <= surfaceMax) {
            details.surface = config.weights.surface;
            score += config.weights.surface;
        } else if (listing.surface >= surfaceMin * 0.8 && listing.surface <= surfaceMax * 1.2) {
            const partialScore = Math.round(config.weights.surface * 0.5);
            details.surface = partialScore;
            score += partialScore;
        }
    }

    // Bonus financement
    if (score > 0 && lead.financing_status) {
        if (lead.financing_status === 'valide') {
            details.financing_bonus = config.financing_bonus.valide;
            score += config.financing_bonus.valide;
        } else if (lead.financing_status === 'en_cours') {
            details.financing_bonus = config.financing_bonus.en_cours;
            score += config.financing_bonus.en_cours;
        }
    }

    return { 
        score: Math.min(score, 100), 
        details 
    };
}

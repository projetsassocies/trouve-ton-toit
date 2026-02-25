import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

Deno.serve(async (req) => {
    try {
        const { event } = await req.json();
        const listingId = event?.entity_id;

        if (!listingId) {
            return Response.json({ error: 'listingId is required' }, { status: 400 });
        }

        const { data: listing, error: listingError } = await supabase
            .from('listings')
            .select('*')
            .eq('id', listingId)
            .single();

        if (listingError || !listing) {
            return Response.json({ error: 'Listing not found' }, { status: 404 });
        }

        // Récupérer la configuration de matching
        const { data: configs } = await supabase.from('matching_configs').select('*');
        const config = (configs && configs[0]) || {
            weights: {
                budget: 35,
                city: 25,
                surface: 20,
                rooms: 10,
                property_type: 10
            },
            thresholds: {
                chaud_min: 75,
                tiede_min: 40
            },
            tolerance: {
                budget_percentage: 15,
                surface_percentage: 20,
                rooms_difference: 1
            },
            blocking_criteria_weight: 100,
            financing_bonus: {
                valide: 15,
                en_cours: 5
            }
        };

        // Fetch all leads that are either 'acheteur' or 'locataire'
        const { data: allLeads } = await supabase.from('leads').select('*');
        const leads = (allLeads || []).filter(lead => lead.lead_type === 'acheteur' || lead.lead_type === 'locataire');

        const updatedLeads = [];
        const allMatches = {};

        for (const lead of leads) {
            let matchScore = 0;
            let isBlocked = false;

            const normalizeCity = (city) => {
                if (!city) return '';
                let normalized = city.trim().toLowerCase();
                normalized = normalized.replace(/\s\d+(?:ème|e)?$/g, ''); 
                return normalized;
            };

            // CRITÈRE BLOQUANT 1 : TYPE DE TRANSACTION (priorité absolue)
            if (lead.lead_type === 'acheteur' && listing.transaction_type !== 'vente') {
                isBlocked = true;
            }
            if (lead.lead_type === 'locataire' && listing.transaction_type !== 'location') {
                isBlocked = true;
            }

            // CRITÈRE BLOQUANT 2 : VILLE (priorité absolue)
            if (!isBlocked && lead.city && listing.city) {
                const leadCities = lead.city.split(',').map(c => normalizeCity(c));
                const listingCity = normalizeCity(listing.city);
                if (!leadCities.includes(listingCity)) {
                    isBlocked = true;
                }
            }

            // VÉRIFICATION DES CRITÈRES BLOQUANTS (équipements)
            if (!isBlocked && lead.blocking_criteria && lead.blocking_criteria.length > 0) {
                const listingAmenities = (listing.amenities || []).map(a => a.toLowerCase().trim());
                
                for (const criterion of lead.blocking_criteria) {
                    const criterionLower = criterion.toLowerCase().trim();
                    
                    if (!listingAmenities.includes(criterionLower)) {
                        isBlocked = true;
                        break;
                    }
                }
            }

            // Si un critère bloquant n'est pas respecté, score = 0
            if (isBlocked) {
                matchScore = 0;
            } else {
                let scoreDetails = {};

                // 1. Type de bien (poids configurable)
                if (lead.property_type && listing.property_type && lead.property_type.toLowerCase() === listing.property_type.toLowerCase()) {
                    scoreDetails.property_type = config.weights.property_type;
                    matchScore += config.weights.property_type;
                }

                // 2. Ville (poids configurable)
                if (lead.city && listing.city) {
                    const leadCities = lead.city.split(',').map(c => normalizeCity(c));
                    const listingCity = normalizeCity(listing.city);
                    if (leadCities.includes(listingCity)) {
                        scoreDetails.city = config.weights.city;
                        matchScore += config.weights.city;
                    }
                }

                // 3. Budget (poids configurable, avec tolérance)
                if (lead.budget_max !== undefined && lead.budget_max > 0) {
                    const tolerance = config.tolerance.budget_percentage / 100;
                    const budgetMax = lead.budget_max * (1 + tolerance);
                    const budgetMin = lead.budget_min ? lead.budget_min * (1 - tolerance) : 0;
                    
                    if (listing.price >= budgetMin && listing.price <= budgetMax) {
                        scoreDetails.budget = config.weights.budget;
                        matchScore += config.weights.budget;
                    } else if (listing.price <= budgetMax * 1.2) {
                        const partialScore = Math.round(config.weights.budget * 0.5);
                        scoreDetails.budget = partialScore;
                        matchScore += partialScore;
                    } else {
                        scoreDetails.budget = 0;
                    }
                } else if (lead.budget_min !== undefined && lead.budget_min > 0) {
                    const tolerance = config.tolerance.budget_percentage / 100;
                    const budgetMin = lead.budget_min * (1 - tolerance);
                    
                    if (listing.price >= budgetMin) {
                        scoreDetails.budget = config.weights.budget;
                        matchScore += config.weights.budget;
                    } else {
                        scoreDetails.budget = 0;
                    }
                }

                // 4. Nombre de pièces (poids configurable, avec tolérance)
                if (lead.rooms_min !== undefined && lead.rooms_min > 0 && listing.rooms !== undefined) {
                    const tolerance = config.tolerance.rooms_difference;
                    if (listing.rooms >= lead.rooms_min - tolerance) {
                        scoreDetails.rooms = config.weights.rooms;
                        matchScore += config.weights.rooms;
                    } else {
                        scoreDetails.rooms = 0;
                    }
                }

                // 5. Surface (poids configurable, avec tolérance en %)
                if (lead.surface_min !== undefined && lead.surface_min > 0 && listing.surface !== undefined) {
                    const toleranceRate = config.tolerance.surface_percentage / 100;
                    const surfaceMin = lead.surface_min * (1 - toleranceRate);
                    const surfaceMax = lead.surface_max ? lead.surface_max * (1 + toleranceRate) : Infinity;
                    
                    if (listing.surface >= surfaceMin && listing.surface <= surfaceMax) {
                        scoreDetails.surface = config.weights.surface;
                        matchScore += config.weights.surface;
                    } else if (listing.surface >= surfaceMin * 0.8 && listing.surface <= surfaceMax * 1.2) {
                        const partialScore = Math.round(config.weights.surface * 0.5);
                        scoreDetails.surface = partialScore;
                        matchScore += partialScore;
                    } else {
                        scoreDetails.surface = 0;
                    }
                }

                // BONUS FINANCEMENT (appliqué en fin de calcul)
                if (matchScore > 0 && lead.financing_status) {
                    if (lead.financing_status === 'valide') {
                        const bonus = config.financing_bonus.valide;
                        scoreDetails.financing_bonus = bonus;
                        matchScore += bonus;
                    } else if (lead.financing_status === 'en_cours') {
                        const bonus = config.financing_bonus.en_cours;
                        scoreDetails.financing_bonus = bonus;
                        matchScore += bonus;
                    }
                }

                // Cap at 100
                matchScore = Math.min(matchScore, 100);
            }

            // Déterminer la catégorie selon les seuils de la config
            let newCategorie;
            if (matchScore >= config.thresholds.chaud_min) {
                newCategorie = 'CHAUD';
            } else if (matchScore >= config.thresholds.tiede_min) {
                newCategorie = 'TIEDE';
            } else {
                newCategorie = 'FROID';
            }

            // Stocker ce match pour analyse globale
            if (!allMatches[lead.id]) {
                allMatches[lead.id] = {
                    lead,
                    matches: [],
                    currentMatchedListings: lead.matched_listings || []
                };
            }

            allMatches[lead.id].matches.push({
                listingId: String(listing.id),
                score: matchScore,
                categorie: newCategorie
            });
            }

            // PHASE 2 : Analyse globale et mise à jour intelligente des leads
            for (const [leadId, matchData] of Object.entries(allMatches)) {
            const { lead, matches } = matchData;
            let currentMatchedListings = lead.matched_listings || [];

            const validMatches = matches.filter(m => m.score >= config.thresholds.tiede_min);

            const newMatchedIds = validMatches.map(m => m.listingId);

            const bestScore = validMatches.length > 0 
                ? Math.max(...validMatches.map(m => m.score)) 
                : (lead.match_score || 0);

            // SYNCHRONISATION BIDIRECTIONNELLE INTELLIGENTE
            let suggestedCategorie = null;

            const chaudMatches = validMatches.filter(m => m.score >= config.thresholds.chaud_min).length;
            const tiedeMatches = validMatches.filter(m => m.score >= config.thresholds.tiede_min).length;

            if (chaudMatches >= 3) {
                suggestedCategorie = 'CHAUD';
            } else if (chaudMatches >= 1 && tiedeMatches >= 5) {
                suggestedCategorie = 'CHAUD';
            } else if (tiedeMatches >= 3) {
                suggestedCategorie = 'TIEDE';
            } else if (bestScore >= config.thresholds.chaud_min) {
                suggestedCategorie = 'CHAUD';
            } else if (bestScore >= config.thresholds.tiede_min) {
                suggestedCategorie = 'TIEDE';
            } else {
                suggestedCategorie = 'FROID';
            }

            const leadUpdateData = {};
            let shouldUpdate = false;

            if (bestScore !== lead.match_score || suggestedCategorie !== lead.categorie) {
                leadUpdateData.match_score = bestScore;
                leadUpdateData.score = bestScore;
                leadUpdateData.categorie = suggestedCategorie;
                leadUpdateData.date_scoring = new Date().toISOString();
                shouldUpdate = true;
            }

            if (JSON.stringify(newMatchedIds.sort()) !== JSON.stringify(currentMatchedListings.sort())) {
                leadUpdateData.matched_listings = newMatchedIds;
                shouldUpdate = true;
            }

            if (shouldUpdate) {
                await supabase
                    .from('leads')
                    .update(leadUpdateData)
                    .eq('id', lead.id);

                updatedLeads.push({ 
                    id: lead.id, 
                    score: bestScore, 
                    categorie: suggestedCategorie,
                    chaudMatches,
                    tiedeMatches
                });
            }
            }

        return Response.json({ 
            success: true,
            message: `Matching complete for listing ${listingId}`,
            updatedLeadsCount: updatedLeads.length,
            updatedLeads: updatedLeads
        });

    } catch (error) {
        console.error('Error in matchListingWithLeads:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

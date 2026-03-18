/**
 * TrouveTonToit — Shared Matching Engine
 *
 * Single source of truth for Lead <-> Listing scoring.
 * Weights: City 30%, Budget 25%, Type 20%, Rooms 15%, Surface 10%
 * Blocking criteria abort with score 0.
 */

function normalizeCity(city) {
  if (!city) return '';
  let n = city.trim().toLowerCase();
  n = n.replace(/\s\d+(?:ème|e|er)?$/g, '');
  return n;
}

function getArrondissement(city) {
  if (!city) return null;
  const m = city.match(/\s(\d+)(?:ème|e|er)?$/);
  return m ? parseInt(m[1]) : null;
}

function extractPiecesFromType(type) {
  if (type === 'studio') return 1;
  const m = type.match(/t(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

export function getCityMatchScore(leadCity, listingCity) {
  if (!leadCity || !listingCity) return 0;
  const leadBase = normalizeCity(leadCity);
  const listingBase = normalizeCity(listingCity);
  const leadArr = getArrondissement(leadCity);
  const listingArr = getArrondissement(listingCity);

  if (leadBase === listingBase) {
    if (!leadArr) return 100;
    if (leadArr === listingArr) return 100;
    const diff = Math.abs(leadArr - listingArr);
    if (diff === 1) return 90;
    if (diff === 2) return 85;
    return 80;
  }
  return 0;
}

export function getPropertyTypeMatch(leadType, listingType) {
  if (!leadType || !listingType) return 50;
  const lt = leadType.toLowerCase();
  const lst = listingType.toLowerCase();
  if (lt === lst) return 100;

  const apparts = ['studio', 't1', 't2', 't3', 't4', 't5', 'loft'];
  const maisons = ['maison', 'villa'];
  const leadIsAppart = apparts.includes(lt);
  const listingIsAppart = apparts.includes(lst);
  const leadIsMaison = maisons.includes(lt);
  const listingIsMaison = maisons.includes(lst);

  if ((leadIsAppart && listingIsMaison) || (leadIsMaison && listingIsAppart)) return 0;

  if (leadIsAppart && listingIsAppart) {
    const lp = extractPiecesFromType(lt);
    const lstp = extractPiecesFromType(lst);
    if (lstp > lp) return 95;
    if (lstp < lp) return 75;
  }
  return 50;
}

export function getBudgetMatchScore(leadBudgetMax, listingPrice) {
  if (!leadBudgetMax || !listingPrice) return 50;
  const minPrice = leadBudgetMax * 0.8;
  const maxPrice100 = leadBudgetMax;
  const maxPrice95 = leadBudgetMax * 1.08;
  const maxPrice80 = leadBudgetMax * 1.15;

  if (listingPrice >= minPrice && listingPrice <= maxPrice100) return 100;
  if (listingPrice > maxPrice100 && listingPrice <= maxPrice95) return 95;
  if (listingPrice > maxPrice95 && listingPrice <= maxPrice80) return 80;
  if (listingPrice > maxPrice80) {
    const excess = (listingPrice - maxPrice80) / maxPrice80;
    return Math.max(0, 50 - Math.floor(excess * 100));
  }
  if (listingPrice < minPrice) {
    const deficit = (minPrice - listingPrice) / minPrice;
    return Math.max(0, 80 - Math.floor(deficit * 100));
  }
  return 50;
}

export function getRoomsMatchScore(leadRoomsMin, listingRooms) {
  if (!leadRoomsMin || !listingRooms) return 50;
  if (listingRooms === leadRoomsMin) return 100;
  if (listingRooms === leadRoomsMin + 1) return 95;
  if (listingRooms === leadRoomsMin - 1) return 75;
  if (listingRooms > leadRoomsMin + 1) return 90;
  if (listingRooms < leadRoomsMin - 1) return 60;
  return 50;
}

export function getSurfaceMatchScore(leadSurfaceMin, leadSurfaceMax, listingSurface) {
  if (!leadSurfaceMin || !listingSurface) return 50;
  const targetMin = leadSurfaceMin;
  const targetMax = leadSurfaceMax || leadSurfaceMin * 1.5;
  if (listingSurface >= targetMin && listingSurface <= targetMax) return 100;

  const midpoint = (targetMin + targetMax) / 2;
  const deviation = Math.abs(listingSurface - midpoint) / midpoint;
  if (deviation <= 0.05) return 100;
  if (deviation <= 0.10) return 90;
  if (deviation <= 0.15) return 80;
  if (deviation <= 0.20) return 70;
  return Math.max(0, 70 - Math.floor(deviation * 100));
}

/**
 * Main scoring function.
 * @returns {{ score: number, details: object, blocked: boolean, reason: string|null }}
 */
export function calculateMatchScore(lead, listing) {
  if (!lead || !listing) return { score: 0, details: {}, blocked: true, reason: 'Données manquantes' };

  // --- Blocking: transaction type ---
  if (lead.lead_type === 'acheteur' && listing.transaction_type !== 'vente') {
    return { score: 0, details: {}, blocked: true, reason: 'Transaction non compatible (Achat ≠ Location)' };
  }
  if (lead.lead_type === 'locataire' && listing.transaction_type !== 'location') {
    return { score: 0, details: {}, blocked: true, reason: 'Transaction non compatible (Location ≠ Vente)' };
  }

  // --- Blocking: mandatory amenities ---
  if (lead.blocking_criteria && lead.blocking_criteria.length > 0) {
    const listingAmenities = (listing.amenities || []).map(a => a.toLowerCase().trim());
    for (const criterion of lead.blocking_criteria) {
      if (!listingAmenities.includes(criterion.toLowerCase().trim())) {
        return { score: 0, details: {}, blocked: true, reason: `Critère bloquant manquant : ${criterion}` };
      }
    }
  }

  const details = {};

  // 1. City (30%)
  let cityScore = 50;
  if (lead.city && listing.city) {
    const leadCities = lead.city.split(',').map(c => c.trim());
    let best = 0;
    for (const lc of leadCities) {
      const s = getCityMatchScore(lc, listing.city);
      if (s > best) best = s;
    }
    cityScore = best;
    if (cityScore === 0) {
      return { score: 0, details: {}, blocked: true, reason: 'Ville non compatible' };
    }
  }
  details.city = Math.round(cityScore * 0.30);

  // 2. Budget (25%)
  let budgetScore = 50;
  if (lead.budget_max && listing.price) {
    budgetScore = getBudgetMatchScore(lead.budget_max, listing.price);
  }
  details.budget = Math.round(budgetScore * 0.25);

  // 3. Property type (20%)
  let typeScore = 50;
  if (lead.property_type && listing.property_type) {
    typeScore = getPropertyTypeMatch(lead.property_type, listing.property_type);
    if (typeScore === 0) {
      return { score: 0, details: {}, blocked: true, reason: 'Type de bien incompatible (Appartement ≠ Maison)' };
    }
  }
  details.property_type = Math.round(typeScore * 0.20);

  // 4. Rooms (15%)
  let roomsScore = 50;
  if (lead.rooms_min && listing.rooms) {
    roomsScore = getRoomsMatchScore(lead.rooms_min, listing.rooms);
  }
  details.rooms = Math.round(roomsScore * 0.15);

  // 5. Surface (10%)
  let surfaceScore = 50;
  if (lead.surface_min && listing.surface) {
    surfaceScore = getSurfaceMatchScore(lead.surface_min, lead.surface_max, listing.surface);
  }
  details.surface = Math.round(surfaceScore * 0.10);

  const total = details.city + details.budget + details.property_type + details.rooms + details.surface;

  // Financing bonus
  if (total >= 60 && lead.financing_status) {
    if (lead.financing_status === 'valide') details.financing_bonus = 5;
    else if (lead.financing_status === 'en_cours') details.financing_bonus = 2;
  }

  const finalScore = Math.min(100, Math.round(total + (details.financing_bonus || 0)));

  return { score: finalScore, details, blocked: false, reason: null };
}

export function getScoreColor(score) {
  if (score >= 90) return 'bg-green-100 text-green-700 border-green-300';
  if (score >= 75) return 'bg-amber-100 text-amber-700 border-amber-300';
  if (score >= 60) return 'bg-orange-100 text-orange-700 border-orange-300';
  return 'bg-gray-100 text-gray-700 border-gray-300';
}

export function getScoreColorHex(score) {
  if (score >= 90) return '#22c55e';
  if (score >= 75) return '#f59e0b';
  if (score >= 60) return '#f97316';
  return '#9ca3af';
}

export const SCORE_CRITERIA = [
  { key: 'city', label: 'Ville', iconName: 'MapPin', weight: 30, colorClass: 'bg-purple-500' },
  { key: 'budget', label: 'Budget', iconName: 'CircleDollarSign', weight: 25, colorClass: 'bg-blue-500' },
  { key: 'property_type', label: 'Type', iconName: 'Home', weight: 20, colorClass: 'bg-green-500' },
  { key: 'rooms', label: 'Pièces', iconName: 'DoorOpen', weight: 15, colorClass: 'bg-amber-500' },
  { key: 'surface', label: 'Surface', iconName: 'Ruler', weight: 10, colorClass: 'bg-teal-500' },
];

export const MATCH_STATUSES = {
  nouveau: { label: 'Nouveau', color: 'bg-gray-100 text-gray-700 border-gray-300', dot: 'bg-gray-400' },
  propose: { label: 'Proposé', color: 'bg-blue-100 text-blue-700 border-blue-300', dot: 'bg-blue-500' },
  visite_planifiee: { label: 'Visite planifiée', color: 'bg-purple-100 text-purple-700 border-purple-300', dot: 'bg-purple-500' },
  visite_effectuee: { label: 'Visite effectuée', color: 'bg-indigo-100 text-indigo-700 border-indigo-300', dot: 'bg-indigo-500' },
  accepte: { label: 'Accepté', color: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500' },
  refuse: { label: 'Refusé', color: 'bg-red-100 text-red-700 border-red-300', dot: 'bg-red-500' },
  expire: { label: 'Expiré', color: 'bg-orange-100 text-orange-700 border-orange-300', dot: 'bg-orange-500' },
};

export const LEAD_TYPE_LABELS = {
  acheteur: { label: 'Acheteur', color: 'bg-blue-100 text-blue-700' },
  vendeur: { label: 'Vendeur', color: 'bg-purple-100 text-purple-700' },
  locataire: { label: 'Locataire', color: 'bg-amber-100 text-amber-700' },
};

export function formatPrice(price) {
  if (!price) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(price);
}

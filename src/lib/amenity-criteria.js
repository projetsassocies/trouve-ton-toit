/**
 * Shared constants for amenities (équipements/commodités) and blocking criteria.
 * Flat design icons (Lucide) - style Airbnb.
 */

import {
  SquareParking,
  MoveVertical,
  Layout,
  Trees,
  Sofa,
  Archive,
  Sun,
  Waves,
  Car,
  CheckCircle2,
  CircleCheck,
  Loader2,
  BarChart3,
  Hourglass,
  XCircle,
} from 'lucide-react';

/** Équipements & critères bloquants - icône + label */
export const AMENITIES = [
  { value: 'parking', label: 'Parking', icon: SquareParking },
  { value: 'ascenseur', label: 'Ascenseur', icon: MoveVertical },
  { value: 'balcon', label: 'Balcon', icon: Layout },
  { value: 'jardin', label: 'Jardin', icon: Trees },
  { value: 'meuble', label: 'Meublé', icon: Sofa },
  { value: 'cave', label: 'Cave', icon: Archive },
  { value: 'terrasse', label: 'Terrasse', icon: Sun },
  { value: 'piscine', label: 'Piscine', icon: Waves },
  { value: 'garage', label: 'Garage', icon: Car },
];

/** Statut du financement - icônes flat style Airbnb */
export const FINANCING_STATUS_OPTIONS = [
  { value: 'pret_accepte', label: 'Prêt accepté', icon: CheckCircle2 },
  { value: 'accord_principe', label: 'Accord de principe', icon: CircleCheck },
  { value: 'dossier_en_cours', label: 'Dossier en cours', icon: Loader2 },
  { value: 'simulation_faite', label: 'Simulation faite', icon: BarChart3 },
  { value: 'pas_encore_vu', label: 'Pas encore vu', icon: Hourglass },
  { value: 'aucun', label: 'Aucun', icon: XCircle },
];

/** Retourne l'entrée amenity pour un value donné (ou null) */
export function getAmenityByValue(value) {
  const v = (value || '').toLowerCase().trim();
  return AMENITIES.find((a) => a.value === v);
}

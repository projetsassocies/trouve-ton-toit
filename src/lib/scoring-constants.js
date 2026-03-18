/**
 * Constantes pour le scoring CRM par type de lead.
 * Mapping : Froid ↔ En veille, Tiède ↔ Actif, Chaud ↔ Urgent
 */

// Types de vue raccourci
export const LEAD_TYPE_VIEWS = {
  LOCATAIRE: 'locataire',
  ACHAT_VENTE: 'achat_vente',
  TOUS: 'tous',
};

// Clé localStorage pour persistance
export const LEADS_VIEW_STORAGE_KEY = 'leads-leadTypeView';

// Mapping bidirectionnel catégories vente ↔ location
export const CATEGORY_MAPPING = {
  FROID: 'EN_VEILLE',
  TIEDE: 'ACTIF',
  CHAUD: 'URGENT',
  EN_VEILLE: 'FROID',
  ACTIF: 'TIEDE',
  URGENT: 'CHAUD',
};

// Config colonnes Kanban par vue
export const KANBAN_COLUMNS = {
  [LEAD_TYPE_VIEWS.LOCATAIRE]: [
    { id: 'EN_VEILLE', label: 'En veille ☁', bgColor: 'bg-[#EFF6FF]', borderColor: 'border-[#DBEAFE]', headerClass: 'bg-[#DBEAFE] text-[#2563EB]' },
    { id: 'ACTIF', label: 'Actif 🏃', bgColor: 'bg-[#FFFBEB]', borderColor: 'border-[#FEF3C7]', headerClass: 'bg-[#FEF3C7] text-[#D97706]' },
    { id: 'URGENT', label: 'Urgent 🚀', bgColor: 'bg-[#FEF2F2]', borderColor: 'border-[#FEE2E2]', headerClass: 'bg-[#FEE2E2] text-[#DC2626]' },
  ],
  [LEAD_TYPE_VIEWS.ACHAT_VENTE]: [
    { id: 'FROID', label: 'Froid ❄️', bgColor: 'bg-[#EFF6FF]', borderColor: 'border-[#DBEAFE]', headerClass: 'bg-[#DBEAFE] text-[#2563EB]' },
    { id: 'TIEDE', label: 'Tiède ☀️', bgColor: 'bg-[#FFFBEB]', borderColor: 'border-[#FEF3C7]', headerClass: 'bg-[#FEF3C7] text-[#D97706]' },
    { id: 'CHAUD', label: 'Chaud 🔥', bgColor: 'bg-[#FEF2F2]', borderColor: 'border-[#FEE2E2]', headerClass: 'bg-[#FEE2E2] text-[#DC2626]' },
  ],
  [LEAD_TYPE_VIEWS.TOUS]: [
    { id: 'FROID', equivLocataire: 'EN_VEILLE', label: 'Froid · En veille', bgColor: 'bg-[#EFF6FF]', borderColor: 'border-[#DBEAFE]', headerClass: 'bg-[#DBEAFE] text-[#2563EB]' },
    { id: 'TIEDE', equivLocataire: 'ACTIF', label: 'Tiède · Actif', bgColor: 'bg-[#FFFBEB]', borderColor: 'border-[#FEF3C7]', headerClass: 'bg-[#FEF3C7] text-[#D97706]' },
    { id: 'CHAUD', equivLocataire: 'URGENT', label: 'Chaud · Urgent', bgColor: 'bg-[#FEF2F2]', borderColor: 'border-[#FEE2E2]', headerClass: 'bg-[#FEE2E2] text-[#DC2626]' },
  ],
};

// Options pour le filtre catégorie (liste) selon la vue
export const CATEGORY_FILTER_OPTIONS = {
  [LEAD_TYPE_VIEWS.LOCATAIRE]: [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'URGENT', label: 'Urgent 🚀' },
    { value: 'ACTIF', label: 'Actif 🏃' },
    { value: 'EN_VEILLE', label: 'En veille ☁' },
  ],
  [LEAD_TYPE_VIEWS.ACHAT_VENTE]: [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'CHAUD', label: 'Chaud 🔥' },
    { value: 'TIEDE', label: 'Tiède ☀️' },
    { value: 'FROID', label: 'Froid ❄️' },
  ],
  [LEAD_TYPE_VIEWS.TOUS]: [
    { value: 'all', label: 'Toutes les catégories' },
    { value: 'CHAUD', label: 'Chaud / Urgent' },
    { value: 'TIEDE', label: 'Tiède / Actif' },
    { value: 'FROID', label: 'Froid / En veille' },
  ],
};

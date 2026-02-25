import React from 'react';
import { cn } from '@/lib/utils';

const statusConfig = {
  // Lead statuses
  nouveau: { label: 'Nouveau', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  contacte: { label: 'Contacté', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  en_negociation: { label: 'En négo', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  converti: { label: 'Converti', bg: 'bg-[#F9FFED]', text: 'text-black', dot: 'bg-[#c5ff4e]' },
  perdu: { label: 'Perdu', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  
  // Listing statuses
  brouillon: { label: 'Brouillon', bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' },
  en_cours: { label: 'En cours', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  publie: { label: 'Publié', bg: 'bg-[#F9FFED]', text: 'text-black', dot: 'bg-[#c5ff4e]' },
  vendu: { label: 'Vendu', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
};

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, bg: 'bg-gray-50', text: 'text-gray-700', dot: 'bg-gray-400' };
  
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
      config.bg,
      config.text
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}
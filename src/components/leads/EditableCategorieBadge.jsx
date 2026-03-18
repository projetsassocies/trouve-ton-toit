import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Flame, Sun, Snowflake, Zap, Activity, Cloud } from 'lucide-react';

const CATEGORIES_VENTE = [
  { value: 'CHAUD', label: 'Chaud', Icon: Flame, color: 'bg-[#FEE2E2] text-[#EF4444]' },
  { value: 'TIEDE', label: 'Tiède', Icon: Sun, color: 'bg-[#FEF3C7] text-[#F59E0B]' },
  { value: 'FROID', label: 'Froid', Icon: Snowflake, color: 'bg-[#DBEAFE] text-[#3B82F6]' },
];

const CATEGORIES_LOCATION = [
  { value: 'URGENT', label: 'Urgent', Icon: Zap, color: 'bg-[#FEE2E2] text-[#EF4444]' },
  { value: 'ACTIF', label: 'Actif', Icon: Activity, color: 'bg-[#FEF3C7] text-[#F59E0B]' },
  { value: 'EN_VEILLE', label: 'En veille', Icon: Cloud, color: 'bg-[#DBEAFE] text-[#3B82F6]' },
];

const ALL_CATEGORIES = [...CATEGORIES_VENTE, ...CATEGORIES_LOCATION];

export default function EditableCategorieBadge({ leadId, currentCategorie, leadType, onUpdate }) {
  const [open, setOpen] = useState(false);
  const categories = leadType === 'locataire' ? CATEGORIES_LOCATION : CATEGORIES_VENTE;
  const currentConfig = ALL_CATEGORIES.find((c) => c.value === currentCategorie) || categories[2];

  const handleSelect = (value) => {
    onUpdate(leadId, { categorie: value });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium justify-center hover:opacity-80 transition-opacity",
            currentConfig.color
          )}
        >
          {currentConfig.Icon && <currentConfig.Icon className="w-3.5 h-3.5" />}
          {currentConfig.label}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-40 p-1" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-0.5">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(cat.value);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-2",
                currentCategorie === cat.value && "bg-gray-100 font-medium"
              )}
            >
              {cat.Icon ? React.createElement(cat.Icon, { className: 'w-4 h-4 shrink-0' }) : null}
              {cat.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
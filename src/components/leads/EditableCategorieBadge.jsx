import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const CATEGORIES = [
  { value: 'CHAUD', label: 'Chaud 🔥', color: 'bg-[#FEE2E2] text-[#EF4444]' },
  { value: 'TIÈDE', label: 'Tiède ☀️', color: 'bg-[#FEF3C7] text-[#F59E0B]' },
  { value: 'FROID', label: 'Froid ❄️', color: 'bg-[#DBEAFE] text-[#3B82F6]' },
];

export default function EditableCategorieBadge({ leadId, currentCategorie, onUpdate }) {
  const [open, setOpen] = useState(false);
  
  const currentConfig = CATEGORIES.find(c => c.value === currentCategorie) || CATEGORIES[2];

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
          {currentConfig.label}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-40 p-1" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-0.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(cat.value);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors",
                currentCategorie === cat.value && "bg-gray-100 font-medium"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
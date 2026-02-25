import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const LEAD_TYPES = [
  { value: 'acheteur', label: 'Acheteur', color: 'bg-purple-50 text-purple-700' },
  { value: 'vendeur', label: 'Vendeur', color: 'bg-orange-50 text-orange-700' },
  { value: 'locataire', label: 'Locataire', color: 'bg-teal-50 text-teal-700' },
];

export default function EditableLeadTypeBadge({ leadId, currentType, onUpdate }) {
  const [open, setOpen] = useState(false);
  
  const currentConfig = LEAD_TYPES.find(t => t.value === currentType) || LEAD_TYPES[0];

  const handleSelect = (value) => {
    onUpdate(leadId, { lead_type: value });
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
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize justify-center hover:opacity-80 transition-opacity",
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
          {LEAD_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(type.value);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors capitalize",
                currentType === type.value && "bg-gray-100 font-medium"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
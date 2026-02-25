import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const STATUSES = [
  { value: 'nouveau', label: 'Nouveau', bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  { value: 'contacte', label: 'Contacté', bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  { value: 'en_negociation', label: 'En négo', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  { value: 'converti', label: 'Converti', bg: 'bg-[#c5ff4e]/10', text: 'text-[#000000]', dot: 'bg-[#c5ff4e]' },
  { value: 'perdu', label: 'Perdu', bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
];

export default function EditableStatusBadge({ leadId, currentStatus, onUpdate }) {
  const [open, setOpen] = useState(false);
  
  const currentConfig = STATUSES.find(s => s.value === currentStatus) || STATUSES[0];

  const handleSelect = (value) => {
    onUpdate(leadId, { status: value });
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
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity",
            currentConfig.bg,
            currentConfig.text
          )}
        >
          <span className={cn("w-1.5 h-1.5 rounded-full", currentConfig.dot)} />
          {currentConfig.label}
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-40 p-1" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-0.5">
          {STATUSES.map((status) => (
            <button
              key={status.value}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSelect(status.value);
              }}
              className={cn(
                "w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors flex items-center gap-2",
                currentStatus === status.value && "bg-gray-100 font-medium"
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
              {status.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
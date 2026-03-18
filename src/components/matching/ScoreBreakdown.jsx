import React from 'react';
import { MapPin, CircleDollarSign, Home, DoorOpen, Ruler, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SCORE_CRITERIA } from '@/lib/matching-engine';

const CRITERIA_ICONS = { MapPin, CircleDollarSign, Home, DoorOpen, Ruler };

export default function ScoreBreakdown({ details, compact = false }) {
  if (!details || Object.keys(details).length === 0) return null;

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      {SCORE_CRITERIA.map(({ key, label, iconName, weight, colorClass }) => {
        const points = details[key];
        if (points === undefined) return null;
        const percentage = Math.round((points / weight) * 100);

        return (
          <div key={key} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#666666] flex items-center gap-1.5">
                {iconName && CRITERIA_ICONS[iconName] && <CRITERIA_ICONS[iconName] className="w-3.5 h-3.5 shrink-0" />}
                {label}
              </span>
              <span className="font-medium tabular-nums">
                {points}/{weight}
              </span>
            </div>
            {!compact && (
              <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", colorClass)}
                  style={{ width: `${Math.min(100, percentage)}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
      {details.financing_bonus > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#666666] flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-600" />
          Financement
        </span>
          <span className="font-medium text-green-600">+{details.financing_bonus}</span>
        </div>
      )}
    </div>
  );
}

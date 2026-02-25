import React from 'react';
import { cn } from '@/lib/utils';
import { SCORE_CRITERIA } from '@/lib/matching-engine';

export default function ScoreBreakdown({ details, compact = false }) {
  if (!details || Object.keys(details).length === 0) return null;

  return (
    <div className={cn("space-y-2", compact && "space-y-1.5")}>
      {SCORE_CRITERIA.map(({ key, label, icon, weight, colorClass }) => {
        const points = details[key];
        if (points === undefined) return null;
        const percentage = Math.round((points / weight) * 100);

        return (
          <div key={key} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#666666]">
                {icon} {label}
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
          <span className="text-[#666666]">✅ Financement</span>
          <span className="font-medium text-green-600">+{details.financing_bonus}</span>
        </div>
      )}
    </div>
  );
}

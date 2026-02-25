import React from 'react';
import { cn } from '@/lib/utils';
import { MATCH_STATUSES } from '@/lib/matching-engine';

export default function MatchStatusBadge({ status }) {
  const config = MATCH_STATUSES[status] || MATCH_STATUSES.nouveau;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border", config.color)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

import React from 'react';
import { cn } from '@/lib/utils';

export default function StatCard({ title, value, icon: Icon, trend, trendUp, className }) {
  return (
    <div className={cn(
      "bg-white rounded-2xl p-6 border border-[#E5E5E5] hover:shadow-lg hover:shadow-black/5 transition-all duration-300",
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[#999999] font-medium">{title}</p>
          <p className="text-3xl font-semibold mt-2 tracking-tight">{value}</p>
          {trend && (
            <p className={cn(
              "text-xs font-medium mt-2",
              trendUp ? "text-[#6ba002]" : "text-rose-500"
            )}>
              {trendUp ? '↑' : '↓'} {trend}
            </p>
          )}
        </div>
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
            <Icon className="w-5 h-5 text-[#666666]" />
          </div>
        )}
      </div>
    </div>
  );
}
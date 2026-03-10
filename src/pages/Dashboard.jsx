import React from 'react';
import AIAssistantTabs from '@/components/dashboard/AIAssistantTabs';
import DashboardKPIs from '@/components/dashboard/DashboardKPIs';
import PrioritizedActionsCard from '@/components/dashboard/PrioritizedActionsCard';
import TodaySchedule from '@/components/dashboard/TodaySchedule';
import MyTodoList from '@/components/dashboard/MyTodoList';
import LeadsPipelineCompact from '@/components/dashboard/LeadsPipelineCompact';
import BottomSummaryBar from '@/components/dashboard/BottomSummaryBar';

const formatPrice = (price) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);

export default function Dashboard() {
  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      {/* AI Chat Block */}
      <AIAssistantTabs fullWidth />

      {/* KPIs with period selector */}
      <DashboardKPIs />

      {/* Main Grid: Left = Actions + Pipeline, Right = Schedule + Todo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PrioritizedActionsCard formatPrice={formatPrice} />
          <LeadsPipelineCompact formatPrice={formatPrice} />
        </div>
        <div className="space-y-6">
          <TodaySchedule />
          <MyTodoList />
        </div>
      </div>

      {/* Bottom Summary Bar */}
      <BottomSummaryBar />
    </div>
  );
}

import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import GlobalSearch from '@/components/dashboard/GlobalSearch';
import AIAssistantTabs from '@/components/dashboard/AIAssistantTabs';
import DashboardKPIs from '@/components/dashboard/DashboardKPIs';
import PrioritizedActionsCard from '@/components/dashboard/PrioritizedActionsCard';
import TodaySchedule from '@/components/dashboard/TodaySchedule';
import MyTodoList from '@/components/dashboard/MyTodoList';
import LeadsPipelineCompact from '@/components/dashboard/LeadsPipelineCompact';
import BottomSummaryBar from '@/components/dashboard/BottomSummaryBar';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import NotificationPopover from '@/components/notifications/NotificationPopover';

const formatPrice = (price) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);

export default function Dashboard() {
  const { user } = useAuth();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => base44.entities.Lead.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['listings', user?.email],
    queryFn: () => base44.entities.Listing.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const firstName = user?.full_name?.trim().split(' ')[0] || '';

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#111] dark:text-white">
            Bonjour, {firstName || 'vous'} 👋
          </h1>
          <p className="text-[#999] dark:text-[#666] mt-1">Voici votre activité du jour</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <GlobalSearch leads={leads} listings={listings} compact />
          <ThemeToggle />
          <NotificationPopover user={user} />
        </div>
      </div>

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

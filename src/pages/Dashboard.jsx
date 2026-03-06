import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/ui/StatusBadge';
import GlobalSearch from '@/components/dashboard/GlobalSearch';
import AIAssistantTabs from '@/components/dashboard/AIAssistantTabs';
import CompactStatsBar from '@/components/dashboard/CompactStatsBar';
import InsightPostits from '@/components/dashboard/InsightPostits';
import PriorityLeadsZone from '@/components/dashboard/PriorityLeadsZone';
import RecentActivity from '@/components/dashboard/RecentActivity';
import NotificationPopover from '@/components/notifications/NotificationPopover';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => base44.entities.Lead.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', user?.email],
    queryFn: () => base44.entities.Listing.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const recentListings = listings.slice(0, 4);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Bonjour{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="text-[#999999] mt-1">Votre copilote opérationnel</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:flex-shrink-0">
          <NotificationPopover user={user} />
          <InsightPostits className="w-full sm:w-56 min-w-0" />
        </div>
      </div>

      {/* Search Bar */}
      <div className="my-6">
        <GlobalSearch leads={leads} listings={listings} />
      </div>

      {/* Stats compactes stratégiques */}
      <CompactStatsBar />

      {/* AI Assistant with Tabs */}
      <AIAssistantTabs />

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads prioritaires + Activité */}
        <div className="space-y-6">
          <PriorityLeadsZone formatPrice={formatPrice} />
        </div>

        {/* Sidebar - Recent Activity & Listings */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <RecentActivity user={user} />

          {/* Recent Listings */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
            <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between">
              <h2 className="font-semibold">Derniers biens</h2>
              <Link 
                to={createPageUrl('Listings')}
                className="text-sm text-[#999999] hover:text-black flex items-center gap-1 transition-colors"
              >
                Voir tout
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            
            {listingsLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
            ) : recentListings.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
                  <Home className="w-6 h-6 text-[#999999]" />
                </div>
                <p className="text-[#999999]">Aucun bien pour le moment</p>
                <Link to={createPageUrl('AddListing')}>
                  <Button variant="outline" className="mt-4 rounded-xl text-sm">
                    Ajouter un bien
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {recentListings.map((listing) => (
                  <Link
                    key={listing.id}
                    to={createPageUrl(`ListingDetail?id=${listing.id}`)}
                    className="flex gap-3 p-2 rounded-xl hover:bg-[#FAFAFA] transition-colors group"
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-[#E5E5E5] to-[#F5F5F5] flex-shrink-0">
                      {listing.images?.[0] ? (
                        <img 
                          src={listing.images[0]} 
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Home className="w-6 h-6 text-[#CCCCCC]" />
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm truncate">{listing.title}</p>
                      </div>
                      <p className="text-xs text-[#999999] mt-0.5">
                        {listing.transaction_type && (
                          <span className="capitalize">{listing.transaction_type === 'vente' ? 'À vendre' : 'À louer'} • </span>
                        )}
                        {listing.city}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <StatusBadge status={listing.status} />
                        <p className="font-semibold text-sm">
                          {formatPrice(listing.price)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
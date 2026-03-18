import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Users, ChevronRight, Flame } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const COLUMNS = [
  { id: 'nouveau', label: 'Nouveaux', status: 'nouveau' },
  { id: 'contacte', label: 'Contactés', status: 'contacte' },
  { id: 'qualifie', label: 'Qualifiés', status: 'en_negociation' },
  { id: 'visite', label: 'Visite planifiée', status: null },
];

export default function LeadsPipelineCompact({ formatPrice, className }) {
  const { user } = useAuth();

  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => api.entities.Lead.filter({ created_by: user.email }, '-created_date', 200),
    enabled: !!user?.email,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', user?.email],
    queryFn: () => api.entities.Match.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const leadsByColumn = useMemo(() => {
    const withVisitPlanifiee = new Set(
      matches
        .filter((m) => ['visite_planifiee', 'visite_effectuee'].includes(m.status))
        .map((m) => m.lead_id)
    );

    const nouveau = leads.filter((l) => (l.status || 'nouveau') === 'nouveau');
    const contacte = leads.filter((l) => l.status === 'contacte');
    const qualifie = leads.filter((l) => l.status === 'en_negociation');
    const visite = leads.filter((l) => withVisitPlanifiee.has(l.id));

    return { nouveau, contacte, qualifie, visite };
  }, [leads, matches]);

  const formatPriceFn = formatPrice || ((p) => `${(p || 0).toLocaleString('fr-FR')}€`);

  const hotLeadsCount = useMemo(() =>
    leads.filter((l) => l.categorie === 'CHAUD').length,
    [leads]
  );

  if (leadsLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-secondary" />
            <h3 className="font-semibold">Pipeline des Leads</h3>
          </div>
          <Link to={createPageUrl('Leads')}>
            <Button variant="outline" size="sm">
              Voir tous les leads
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => {
            const columnLeads = leadsByColumn[col.id] || [];
            return (
              <div key={col.id}>
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="text-sm font-medium">{col.label}</h4>
                  <Badge variant="secondary">{columnLeads.length}</Badge>
                </div>
                <div className="space-y-2">
                  {columnLeads.slice(0, 3).map((lead) => (
                    <Link
                      key={lead.id}
                      to={createPageUrl(`LeadDetail?id=${lead.id}`)}
                      className="group relative flex flex-col gap-0.5 rounded-lg border border-border bg-card p-3 hover:bg-secondary hover:text-secondary-foreground hover:border-secondary/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <h5 className="text-sm font-medium truncate">
                          {lead.first_name} {lead.last_name}
                        </h5>
                        <div className="flex items-center gap-1">
                          {lead.categorie === 'CHAUD' && (
                            <Flame className="h-4 w-4 text-destructive group-hover:text-destructive/80" />
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-secondary-foreground" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground group-hover:text-secondary-foreground/80 truncate">
                        {lead.property_type || 'Achat'} {lead.budget_max ? `• ${formatPriceFn(lead.budget_max)}` : ''}
                      </p>
                    </Link>
                  ))}
                  {columnLeads.length > 3 && (
                    <Link to={createPageUrl('Leads')} className="block">
                      <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                        +{columnLeads.length - 3} autre{columnLeads.length - 3 > 1 ? 's' : ''}
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="h-4 w-4 text-destructive" />
              <span className="text-xl font-semibold">{hotLeadsCount}</span>
            </div>
            <p className="text-xs text-muted-foreground">Leads chauds</p>
          </div>
          <div className="text-center">
            <span className="text-xl font-semibold block mb-1">{leads.length}</span>
            <p className="text-xs text-muted-foreground">Total leads</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

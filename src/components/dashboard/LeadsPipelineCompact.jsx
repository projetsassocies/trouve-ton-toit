import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Users, ChevronRight, Flame, Sun, Snowflake } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { LEAD_TYPE_LABELS } from '@/lib/matching-engine';

// Icône scoring selon catégorie (vente ou location)
function ScoringIcon({ categorie }) {
  if (categorie === 'CHAUD' || categorie === 'URGENT') {
    return <Flame className="w-4 h-4 text-destructive" title="Chaud" />;
  }
  if (categorie === 'TIEDE' || categorie === 'ACTIF') {
    return <Sun className="w-4 h-4 text-amber-500" title="Tiède / Actif" />;
  }
  if (categorie === 'FROID' || categorie === 'EN_VEILLE') {
    return <Snowflake className="w-4 h-4 text-blue-400" title="Froid / En veille" />;
  }
  return <Snowflake className="w-4 h-4 text-muted-foreground" title="À qualifier" />;
}

function getDossierStatus(lead) {
  if (lead.lead_type === 'locataire') {
    if (lead.dossier_location_complet) return '100% (Vérifié ✓)';
    if (lead.dossier_valide_agent) return 'Dossier validé';
    return 'En cours';
  }
  if (lead.lead_type === 'vendeur') {
    if (lead.mandat_signe) return 'Mandat signé';
    if (lead.bien_sous_compromis) return 'Compromis en cours';
    if (lead.estimation_demandee) return 'Estimation demandée';
    return 'En cours';
  }
  // acheteur / autre
  if (lead.financing_status === 'pret_accepte' || lead.financing_status === 'accord_principe') {
    return 'Financement validé';
  }
  if (lead.financing_status === 'dossier_en_cours' || lead.financing_status === 'simulation_faite') {
    return '75% (Dossier financement)';
  }
  if (lead.financing_status === 'pas_encore_vu') {
    return 'Manque avis financement';
  }
  if (lead.status === 'en_negociation') return 'En négociation';
  if (lead.status === 'contacte') return 'Contacté';
  return 'À compléter';
}

function getPriorityAction(lead, matches) {
  const leadMatches = matches.filter((m) => m.lead_id === lead.id);
  const accepteMatch = leadMatches.find((m) => m.status === 'accepte');
  const visiteMatch = leadMatches.find((m) =>
    ['visite_planifiee', 'visite_effectuee'].includes(m.status)
  );
  const proposeMatch = leadMatches.find((m) => m.status === 'propose');

  if (accepteMatch) return 'Signer mandat';
  if (visiteMatch) return 'Relancer : Rdv visite';
  if (proposeMatch) return 'Relancer proposition';
  if (lead.categorie === 'CHAUD' || lead.categorie === 'URGENT') return 'Appeler';
  if (lead.status === 'contacte') return 'Relancer';
  if (lead.status === 'nouveau' || !lead.status) return 'Contacter';
  return 'Suivre';
}

// Priorité pour sélection intelligente : avancement projet + score
function getLeadPriority(lead, matches) {
  const leadMatches = matches.filter((m) => m.lead_id === lead.id);
  let score = lead.score ?? 0;
  score += (lead.categorie === 'CHAUD' || lead.categorie === 'URGENT') ? 50 : 0;
  score += (lead.categorie === 'TIEDE' || lead.categorie === 'ACTIF') ? 25 : 0;
  if (leadMatches.some((m) => m.status === 'accepte')) score += 100;
  else if (leadMatches.some((m) => ['visite_planifiee', 'visite_effectuee'].includes(m.status))) score += 80;
  else if (leadMatches.some((m) => m.status === 'propose')) score += 60;
  if (lead.status === 'en_negociation') score += 20;
  if (lead.status === 'contacte') score += 10;
  const created = lead.created_date ? new Date(lead.created_date) : new Date(0);
  const daysSince = (Date.now() - created) / (1000 * 60 * 60 * 24);
  if (daysSince < 7) score += 5; // récent
  return score;
}

export default function LeadsPipelineCompact({ formatPrice, className }) {
  const { user } = useAuth();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => api.entities.Lead.filter({ created_by: user.email }, '-created_date', 200),
    enabled: !!user?.email,
  });

  const { data: matches = [] } = useQuery({
    queryKey: ['matches', user?.email],
    queryFn: () => api.entities.Match.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const topLeads = useMemo(() => {
    return [...leads]
      .map((l) => ({ lead: l, priority: getLeadPriority(l, matches) }))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5)
      .map(({ lead }) => lead);
  }, [leads, matches]);

  if (isLoading) {
    return (
      <Card className={cn('shadow-none', className)}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-[#E5E5E5]">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('shadow-none', className)}>
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
      <CardContent className="p-0">
        {topLeads.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucun lead pour le moment</p>
            <Link to={createPageUrl('AddLead')}>
              <Button variant="outline" size="sm" className="mt-2">
                Ajouter un lead
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5E5]">
            {topLeads.map((lead) => (
              <Link
                key={lead.id}
                to={createPageUrl(`LeadDetail?id=${lead.id}`)}
                className="flex items-center gap-3 p-4 hover:bg-[#FAFAFA] transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-sm text-secondary flex-shrink-0">
                  {lead.first_name?.[0]}{lead.last_name?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_1fr] gap-x-4 gap-y-1 items-center">
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {LEAD_TYPE_LABELS[lead.lead_type]?.label || 'Lead'}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground truncate sm:text-center">
                    {getDossierStatus(lead)}
                  </p>
                  <div className="flex items-center justify-center">
                    <ScoringIcon categorie={lead.categorie} />
                  </div>
                  <p className="text-xs font-medium truncate sm:text-right">
                    {getPriorityAction(lead, matches)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-secondary flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

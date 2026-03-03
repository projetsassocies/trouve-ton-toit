import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { SendEmail, SendSMS } from '@/api/integrations';
import {
  BarChart3, Target, ArrowLeftRight, Columns3,
  Users, CheckCircle2, TrendingUp, Loader2, Calendar,
  Building2, Flame, Trophy, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import {
  calculateMatchScore, formatPrice, getScoreColor,
  MATCH_STATUSES, LEAD_TYPE_LABELS,
} from '@/lib/matching-engine';

import LeadSelector from '@/components/matching/LeadSelector';
import ListingSelector from '@/components/matching/ListingSelector';
import MatchResultsPanel from '@/components/matching/MatchResultsPanel';
import MatchActionsPanel from '@/components/matching/MatchActionsPanel';
import ComparisonView from '@/components/matching/ComparisonView';

export default function Matching() {
  const urlParams = new URLSearchParams(window.location.search);
  const preSelectedLeadId = urlParams.get('leadId');
  const preSelectedListingId = urlParams.get('listingId');

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('matching');
  const [mode, setMode] = useState('lead-to-listing');
  const [selectedLead, setSelectedLead] = useState(null);
  const [selectedListing, setSelectedListing] = useState(null);
  const [matchResults, setMatchResults] = useState([]);
  const [isMatching, setIsMatching] = useState(false);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [leadFilters, setLeadFilters] = useState({ search: '', leadType: 'all', status: 'all', categorie: 'all' });
  const [listingFilters, setListingFilters] = useState({ search: '', transactionType: 'all', propertyType: 'all', listingStatus: 'all' });
  const [statsPeriod, setStatsPeriod] = useState('all');

  // --- Data queries ---
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => base44.entities.Lead.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['listings', user?.email],
    queryFn: () => base44.entities.Listing.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: matchRecords = [], isLoading: matchesLoading } = useQuery({
    queryKey: ['matches', user?.email],
    queryFn: () => base44.entities.Match.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  // --- Auto-select from URL ---
  useEffect(() => {
    if (autoTriggered) return;
    if (preSelectedLeadId && leads.length > 0 && listings.length > 0) {
      const lead = leads.find(l => l.id === preSelectedLeadId);
      if (lead) {
        setAutoTriggered(true);
        setMode('lead-to-listing');
        setSelectedLead(lead);
        runMatchingForLead(lead);
      }
    }
    if (preSelectedListingId && leads.length > 0 && listings.length > 0) {
      const listing = listings.find(l => l.id === preSelectedListingId);
      if (listing) {
        setAutoTriggered(true);
        setMode('listing-to-lead');
        setSelectedListing(listing);
        runMatchingForListing(listing);
      }
    }
  }, [preSelectedLeadId, preSelectedListingId, leads, listings, autoTriggered]);

  // --- Restore match results from DB (historique) ---
  const loadMatchResultsFromRecords = useCallback((leadId, isLeadMode) => {
    const records = matchRecords.filter(m =>
      isLeadMode ? m.lead_id === leadId : m.listing_id === leadId
    );
    if (records.length === 0) return null;
    const available = isLeadMode
      ? listings.filter(l => l.status === 'publie' || l.status === 'en_cours')
      : leads.filter(l => l.lead_type === 'acheteur' || l.lead_type === 'locataire');
    const results = records
      .map(r => {
        const item = isLeadMode
          ? available.find(l => l.id === r.listing_id)
          : available.find(l => l.id === r.lead_id);
        if (!item) return null;
        return {
          item,
          score: r.score || 0,
          details: r.score_details || {},
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    return results.length > 0 ? results : null;
  }, [matchRecords, listings, leads]);

  // --- Matching logic ---
  const runMatchingForLead = useCallback((lead) => {
    setIsMatching(true);
    setSelectedLead(lead);
    setMatchResults([]);
    setSelectedMatchId(null);
    setCompareIds([]);

    const available = listings.filter(l => l.status === 'publie' || l.status === 'en_cours');
    const results = available
      .map(listing => {
        const result = calculateMatchScore(lead, listing);
        return { item: listing, ...result };
      })
      .filter(m => !m.blocked && m.score >= 60)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    setMatchResults(results);
    setIsMatching(false);

    if (results.length > 0) {
      saveMatchRecords(lead, results);
      toast.success(`${results.length} correspondance(s) trouvée(s)`);
    } else {
      toast.info('Aucune correspondance trouvée (score min : 60%)');
    }
  }, [listings]);

  const runMatchingForListing = useCallback((listing) => {
    setIsMatching(true);
    setSelectedListing(listing);
    setMatchResults([]);
    setSelectedMatchId(null);
    setCompareIds([]);

    const results = leads
      .filter(l => l.lead_type === 'acheteur' || l.lead_type === 'locataire')
      .map(lead => {
        const result = calculateMatchScore(lead, listing);
        return { item: lead, ...result };
      })
      .filter(m => !m.blocked && m.score >= 60)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    setMatchResults(results);
    setIsMatching(false);

    if (results.length > 0) {
      saveMatchRecordsForListing(listing, results);
      toast.success(`${results.length} lead(s) compatible(s)`);
    } else {
      toast.info('Aucun lead compatible trouvé');
    }
  }, [leads]);

  // --- Persist match records ---
  const saveMatchRecords = async (lead, results) => {
    for (const { item: listing, score, details } of results) {
      const existing = matchRecords.find(m => m.lead_id === lead.id && m.listing_id === listing.id);
      if (existing) {
        await base44.entities.Match.update(existing.id, { score, score_details: details });
      } else {
        await base44.entities.Match.create({
          lead_id: lead.id,
          listing_id: listing.id,
          score,
          score_details: details,
          status: 'nouveau',
          history: [{ status: 'nouveau', date: new Date().toISOString() }],
        });
      }
    }
    // Also update legacy fields on lead
    const matchedIds = results.map(r => r.item.id);
    await base44.entities.Lead.update(lead.id, {
      matched_listings: matchedIds,
      match_score: results[0]?.score || 0,
    });
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    queryClient.invalidateQueries({ queryKey: ['leads'] });
  };

  const saveMatchRecordsForListing = async (listing, results) => {
    for (const { item: lead, score, details } of results) {
      const existing = matchRecords.find(m => m.lead_id === lead.id && m.listing_id === listing.id);
      if (existing) {
        await base44.entities.Match.update(existing.id, { score, score_details: details });
      } else {
        await base44.entities.Match.create({
          lead_id: lead.id,
          listing_id: listing.id,
          score,
          score_details: details,
          status: 'nouveau',
          history: [{ status: 'nouveau', date: new Date().toISOString() }],
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['matches'] });
  };

  // --- Sync lead status from match status (only advance, never retreat) ---
  const getLeadStatusFromMatchStatus = (currentLeadStatus, matchStatus) => {
    const order = { nouveau: 0, contacte: 1, en_negociation: 2, converti: 3, perdu: -1 };
    const current = order[currentLeadStatus] ?? 0;
    let target = current;
    if (matchStatus === 'propose' || matchStatus === 'visite_planifiee') {
      target = Math.max(current, 1); // contacte
    } else if (matchStatus === 'visite_effectuee' || matchStatus === 'accepte') {
      target = Math.max(current, 2); // en_negociation
    }
    return Object.entries(order).find(([, v]) => v === target)?.[0] || currentLeadStatus;
  };

  // --- Match status update (with lead sync + activity creation) ---
  const updateMatchStatusMutation = useMutation({
    mutationFn: async ({ matchId, newStatus, note, leadId, listingTitle }) => {
      const match = matchRecords.find(m => m.id === matchId);
      if (!match) return;
      const history = [...(match.history || []), {
        status: newStatus,
        date: new Date().toISOString(),
        note,
      }];
      const updates = { status: newStatus, history };
      if (newStatus === 'propose') updates.proposed_date = new Date().toISOString();
      if (newStatus === 'visite_planifiee' || newStatus === 'visite_effectuee') updates.visit_date = new Date().toISOString();
      if (newStatus === 'accepte' || newStatus === 'refuse') updates.decision_date = new Date().toISOString();
      await base44.entities.Match.update(matchId, updates);

      // Sync lead status
      if (leadId) {
        const lead = await base44.entities.Lead.get(leadId);
        if (lead) {
          const newLeadStatus = getLeadStatusFromMatchStatus(lead.status || 'nouveau', newStatus);
          if (newLeadStatus !== (lead.status || 'nouveau')) {
            await base44.entities.Lead.update(leadId, { status: newLeadStatus });
          }
        }
      }

      // Create activity for traceability (skip visite_planifiee: handleScheduleVisit creates it)
      if (leadId && listingTitle) {
        const activityLabels = {
          propose: { type: 'matching_proposition', title: `Bien proposé : ${listingTitle}` },
          visite_effectuee: { type: 'visite', title: `Visite effectuée : ${listingTitle}` },
          accepte: { type: 'matching_accepte', title: `Bien accepté : ${listingTitle} — Prêt pour signature du mandat` },
          refuse: { type: 'matching_refuse', title: `Bien refusé : ${listingTitle}` },
        };
        const activityConfig = activityLabels[newStatus];
        if (activityConfig) {
          try {
            await base44.entities.Activity.create({
              type: activityConfig.type,
              title: activityConfig.title,
              ...(note && { description: note }),
              linked_to_id: leadId,
              linked_to_type: 'lead',
            });
          } catch (err) {
            console.error('Erreur création activité:', err);
          }
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead'] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      if (variables.leadId) {
        queryClient.invalidateQueries({ queryKey: ['activities', variables.leadId] });
      }
      toast.success('Statut mis à jour');
    },
  });

  const handleUpdateMatchStatus = (newStatus) => {
    const selectedEntity = mode === 'lead-to-listing' ? selectedLead : selectedListing;
    const matchRecord = mode === 'lead-to-listing'
      ? matchRecords.find(m => m.lead_id === selectedEntity?.id && m.listing_id === selectedMatchId)
      : matchRecords.find(m => m.listing_id === selectedEntity?.id && m.lead_id === selectedMatchId);
    const matchResult = matchResults.find(r => r.item.id === selectedMatchId);
    const listing = mode === 'lead-to-listing' ? matchResult?.item : selectedListing;
    const lead = mode === 'lead-to-listing' ? selectedLead : matchResult?.item;
    if (matchRecord) {
      updateMatchStatusMutation.mutate({
        matchId: matchRecord.id,
        newStatus,
        leadId: matchRecord.lead_id,
        listingTitle: listing?.title || 'Bien',
      });
    }
  };

  // --- Actions ---
  const handleSendEmail = async ({ subject, body }) => {
    const lead = mode === 'lead-to-listing'
      ? selectedLead
      : matchResults.find(r => r.item.id === selectedMatchId)?.item;
    const listing = mode === 'lead-to-listing'
      ? matchResults.find(r => r.item.id === selectedMatchId)?.item
      : selectedListing;
    if (!lead?.email) {
      toast.error('Pas d\'email pour ce lead');
      return;
    }
    try {
      await SendEmail({ to: lead.email, subject, html: body.replace(/\n/g, '<br/>') });
      await base44.entities.Activity.create({
        type: 'email',
        title: `Email envoyé : ${subject}`,
        description: `Proposition de bien : ${listing?.title || 'Bien'}`,
        linked_to_id: lead.id,
        linked_to_type: 'lead',
      });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      toast.success('Email envoyé');
      handleUpdateMatchStatus('propose');
    } catch {
      toast.error('Erreur d\'envoi email');
    }
  };

  const handleSendSMS = async ({ body }) => {
    const lead = mode === 'lead-to-listing'
      ? selectedLead
      : matchResults.find(r => r.item.id === selectedMatchId)?.item;
    const listing = mode === 'lead-to-listing'
      ? matchResults.find(r => r.item.id === selectedMatchId)?.item
      : selectedListing;
    if (!lead?.phone) {
      toast.error('Pas de numéro pour ce lead');
      return;
    }
    try {
      await SendSMS({ to: lead.phone, message: body });
      await base44.entities.Activity.create({
        type: 'sms',
        title: `SMS envoyé : proposition de bien`,
        description: `Bien proposé : ${listing?.title || 'Bien'}`,
        linked_to_id: lead.id,
        linked_to_type: 'lead',
      });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['activities', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      toast.success('SMS envoyé');
      handleUpdateMatchStatus('propose');
    } catch {
      toast.error('Erreur d\'envoi SMS');
    }
  };

  const handleScheduleVisit = async ({ date, time }) => {
    const lead = mode === 'lead-to-listing' ? selectedLead : matchResults.find(r => r.item.id === selectedMatchId)?.item;
    const listing = mode === 'lead-to-listing' ? matchResults.find(r => r.item.id === selectedMatchId)?.item : selectedListing;
    const visitDatetime = new Date(`${date}T${time}`);
    try {
      await base44.entities.Activity.create({
        type: 'visite',
        title: `Visite : ${lead?.first_name} ${lead?.last_name} — ${listing?.title || 'Bien'}`,
        description: `Visite programmée le ${visitDatetime.toLocaleDateString('fr-FR')} à ${time}`,
        linked_to_id: lead?.id,
        linked_to_type: 'lead',
      });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      if (lead?.id) queryClient.invalidateQueries({ queryKey: ['activities', lead.id] });
      queryClient.invalidateQueries({ queryKey: ['recent-activities'] });
      handleUpdateMatchStatus('visite_planifiee');
      toast.success('Visite planifiée');
    } catch {
      toast.error('Erreur lors de la planification');
    }
  };

  const handleAddNote = async (text) => {
    const selectedEntity = mode === 'lead-to-listing' ? selectedLead : selectedListing;
    const record = mode === 'lead-to-listing'
      ? matchRecords.find(m => m.lead_id === selectedEntity?.id && m.listing_id === selectedMatchId)
      : matchRecords.find(m => m.listing_id === selectedEntity?.id && m.lead_id === selectedMatchId);
    if (record) {
      const existing = record.notes || '';
      const timestamp = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const newNotes = existing ? `${existing}\n\n[${timestamp}] ${text}` : `[${timestamp}] ${text}`;
      await base44.entities.Match.update(record.id, { notes: newNotes });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Note ajoutée');
    }
  };

  // --- Compare toggle ---
  const handleCompareToggle = (id) => {
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= 3) {
        toast.info('Maximum 3 éléments à comparer');
        return prev;
      }
      return [...prev, id];
    });
  };

  // --- Selected match entity and record ---
  const selectedMatch = matchResults.find(r => r.item.id === selectedMatchId)?.item || null;
  const selectedEntity = mode === 'lead-to-listing' ? selectedLead : selectedListing;
  const currentMatchRecord = (() => {
    if (!selectedEntity || !selectedMatchId) return null;
    return mode === 'lead-to-listing'
      ? matchRecords.find(m => m.lead_id === selectedEntity.id && m.listing_id === selectedMatchId)
      : matchRecords.find(m => m.listing_id === selectedEntity.id && m.lead_id === selectedMatchId);
  })();

  // --- Comparison data ---
  const comparisonItems = matchResults.filter(r => compareIds.includes(r.item.id)).map(r => r.item);
  const comparisonScores = {};
  matchResults.filter(r => compareIds.includes(r.item.id)).forEach(r => {
    comparisonScores[r.item.id] = { score: r.score, details: r.details };
  });

  // --- Statistics ---
  const statistics = useMemo(() => {
    const now = new Date();
    let filteredMatches = matchRecords;
    if (statsPeriod !== 'all') {
      const days = statsPeriod === '7d' ? 7 : statsPeriod === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 86400000);
      filteredMatches = matchRecords.filter(m => new Date(m.created_date) >= cutoff);
    }

    const totalLeads = leads.length;
    const totalListings = listings.filter(l => l.status === 'publie').length;
    const totalMatches = filteredMatches.length;
    const proposed = filteredMatches.filter(m => m.status !== 'nouveau').length;
    const accepted = filteredMatches.filter(m => m.status === 'accepte').length;
    const visits = filteredMatches.filter(m =>
      m.status === 'visite_planifiee' || m.status === 'visite_effectuee' || m.status === 'accepte'
    ).length;
    const avgScore = totalMatches > 0
      ? Math.round(filteredMatches.reduce((s, m) => s + (m.score || 0), 0) / totalMatches)
      : 0;
    const conversionRate = proposed > 0 ? Math.round((accepted / proposed) * 100) : 0;

    const scoreDistribution = [
      { name: '60-70%', count: filteredMatches.filter(m => m.score >= 60 && m.score < 70).length },
      { name: '70-80%', count: filteredMatches.filter(m => m.score >= 70 && m.score < 80).length },
      { name: '80-90%', count: filteredMatches.filter(m => m.score >= 80 && m.score < 90).length },
      { name: '90-100%', count: filteredMatches.filter(m => m.score >= 90).length },
    ];

    const statusDistribution = Object.entries(MATCH_STATUSES).map(([key, val]) => ({
      name: val.label,
      value: filteredMatches.filter(m => m.status === key).length,
      color: key === 'nouveau' ? '#9ca3af' : key === 'propose' ? '#3b82f6' : key === 'visite_planifiee' ? '#a855f7'
        : key === 'visite_effectuee' ? '#6366f1' : key === 'accepte' ? '#22c55e' : key === 'refuse' ? '#ef4444' : '#f97316',
    })).filter(d => d.value > 0);

    const typeDistribution = [
      { name: 'Acheteurs', value: leads.filter(l => l.lead_type === 'acheteur').length, color: '#3b82f6' },
      { name: 'Vendeurs', value: leads.filter(l => l.lead_type === 'vendeur').length, color: '#a855f7' },
      { name: 'Locataires', value: leads.filter(l => l.lead_type === 'locataire').length, color: '#f59e0b' },
    ];

    // Top matched listings
    const listingMatchCounts = {};
    filteredMatches.forEach(m => {
      listingMatchCounts[m.listing_id] = (listingMatchCounts[m.listing_id] || 0) + 1;
    });
    const topListings = Object.entries(listingMatchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const listing = listings.find(l => l.id === id);
        return { listing, count };
      })
      .filter(t => t.listing);

    // Top matched leads
    const leadMatchCounts = {};
    filteredMatches.forEach(m => {
      leadMatchCounts[m.lead_id] = (leadMatchCounts[m.lead_id] || 0) + 1;
    });
    const topLeads = Object.entries(leadMatchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => {
        const lead = leads.find(l => l.id === id);
        return { lead, count };
      })
      .filter(t => t.lead);

    // Weekly trend (last 8 weeks)
    const weeklyData = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i + 1) * 7 * 86400000);
      const weekEnd = new Date(now.getTime() - i * 7 * 86400000);
      const count = matchRecords.filter(m => {
        const d = new Date(m.created_date);
        return d >= weekStart && d < weekEnd;
      }).length;
      weeklyData.push({
        week: `S-${i}`,
        matchs: count,
      });
    }

    return {
      totalLeads, totalListings, totalMatches, proposed, accepted, visits,
      avgScore, conversionRate, scoreDistribution, statusDistribution,
      typeDistribution, topListings, topLeads, weeklyData,
    };
  }, [leads, listings, matchRecords, statsPeriod]);

  return (
    <div className="max-w-[1600px] mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analyse</h1>
          <p className="text-[#999999] text-sm mt-0.5">Centre de matching et d'analyse des correspondances</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-[#E5E5E5]">
          <TabsTrigger value="matching" className="data-[state=active]:bg-[#c5ff4e] data-[state=active]:text-black">
            <Target className="w-4 h-4 mr-2" />
            Matching
          </TabsTrigger>
          <TabsTrigger value="analytics" className="data-[state=active]:bg-[#c5ff4e] data-[state=active]:text-black">
            <BarChart3 className="w-4 h-4 mr-2" />
            Statistiques
          </TabsTrigger>
        </TabsList>

        {/* ============ MATCHING TAB ============ */}
        <TabsContent value="matching" className="mt-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant={mode === 'lead-to-listing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMode('lead-to-listing');
                setMatchResults([]);
                setSelectedMatchId(null);
                setCompareIds([]);
              }}
              className={cn(
                "rounded-xl h-8 text-xs",
                mode === 'lead-to-listing' && "bg-[#c5ff4e] hover:bg-[#b5ef3e] text-black"
              )}
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              Lead → Biens
            </Button>
            <ArrowLeftRight className="w-4 h-4 text-[#CCCCCC]" />
            <Button
              variant={mode === 'listing-to-lead' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setMode('listing-to-lead');
                setMatchResults([]);
                setSelectedMatchId(null);
                setCompareIds([]);
              }}
              className={cn(
                "rounded-xl h-8 text-xs",
                mode === 'listing-to-lead' && "bg-[#c5ff4e] hover:bg-[#b5ef3e] text-black"
              )}
            >
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              Bien → Leads
            </Button>

            <span
              title={compareIds.length < 2 ? 'Sélectionnez au moins 2 éléments pour comparer' : `Comparer ${compareIds.length} éléments`}
              className="inline-block"
            >
              <Button
                size="sm"
                onClick={() => compareIds.length >= 2 && setShowComparison(true)}
                disabled={compareIds.length < 2}
                className={cn(
                  "rounded-xl h-8 text-xs",
                  compareIds.length >= 2
                    ? "bg-black hover:bg-black/90 text-white"
                    : "bg-[#E5E5E5] text-[#999999] cursor-not-allowed opacity-80"
                )}
              >
                <Columns3 className="w-3.5 h-3.5 mr-1.5" />
                Comparer {compareIds.length > 0 ? `(${compareIds.length})` : ''}
              </Button>
            </span>
          </div>

          {/* 3-panel layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-3 items-start">
            {/* Left panel: Selector */}
            <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden h-[calc(100vh-220px)] min-h-[500px]">
              {mode === 'lead-to-listing' ? (
                <LeadSelector
                  leads={leads}
                  isLoading={leadsLoading}
                  selectedLeadId={selectedLead?.id}
                  onSelect={(lead) => {
                    setSelectedLead(lead);
                    setSelectedMatchId(null);
                    setCompareIds([]);
                    // Historique : si des matchs existent en DB, les afficher
                    const cached = loadMatchResultsFromRecords(lead.id, true);
                    if (cached && cached.length > 0) {
                      setMatchResults(cached);
                    } else {
                      // Sinon lancer le matching automatiquement
                      runMatchingForLead(lead);
                    }
                  }}
                  filters={leadFilters}
                  onFilterChange={setLeadFilters}
                />
              ) : (
                <ListingSelector
                  listings={listings}
                  isLoading={listingsLoading}
                  selectedListingId={selectedListing?.id}
                  onSelect={(listing) => {
                    setSelectedListing(listing);
                    setSelectedMatchId(null);
                    setCompareIds([]);
                    // Historique : si des matchs existent en DB, les afficher
                    const cached = loadMatchResultsFromRecords(listing.id, false);
                    if (cached && cached.length > 0) {
                      setMatchResults(cached);
                    } else {
                      // Sinon lancer le matching automatiquement
                      runMatchingForListing(listing);
                    }
                  }}
                  filters={listingFilters}
                  onFilterChange={setListingFilters}
                />
              )}
            </div>

            {/* Center panel: Results */}
            <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden h-[calc(100vh-220px)] min-h-[500px]">
              <MatchResultsPanel
                mode={mode}
                selectedEntity={mode === 'lead-to-listing' ? selectedLead : selectedListing}
                matchResults={matchResults}
                matchRecords={matchRecords}
                isMatching={isMatching}
                onRunMatching={() => {
                  if (mode === 'lead-to-listing' && selectedLead) runMatchingForLead(selectedLead);
                  if (mode === 'listing-to-lead' && selectedListing) runMatchingForListing(selectedListing);
                }}
                compareIds={compareIds}
                onCompareToggle={handleCompareToggle}
                selectedMatchId={selectedMatchId}
                onSelectMatch={setSelectedMatchId}
              />
            </div>

            {/* Right panel: Actions */}
            <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden h-[calc(100vh-220px)] min-h-[500px]">
              <MatchActionsPanel
                mode={mode}
                selectedEntity={selectedEntity}
                selectedMatch={selectedMatch}
                matchRecord={currentMatchRecord}
                onUpdateMatchStatus={handleUpdateMatchStatus}
                onSendEmail={handleSendEmail}
                onSendSMS={handleSendSMS}
                onScheduleVisit={handleScheduleVisit}
                onAddNote={handleAddNote}
                isUpdating={updateMatchStatusMutation.isPending}
              />
            </div>
          </div>

          {/* Comparison overlay */}
          {showComparison && comparisonItems.length >= 2 && (
            <ComparisonView
              items={comparisonItems}
              scores={comparisonScores}
              mode={mode}
              onClose={() => setShowComparison(false)}
              onPropose={(item) => {
                setSelectedMatchId(item.id);
                setShowComparison(false);
              }}
            />
          )}
        </TabsContent>

        {/* ============ STATISTICS TAB ============ */}
        <TabsContent value="analytics" className="mt-4 space-y-6">
          {/* Period filter */}
          <div className="flex items-center justify-end">
            <Select value={statsPeriod} onValueChange={setStatsPeriod}>
              <SelectTrigger className="w-40 h-9 rounded-xl border-[#E5E5E5]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">7 derniers jours</SelectItem>
                <SelectItem value="30d">30 derniers jours</SelectItem>
                <SelectItem value="90d">90 derniers jours</SelectItem>
                <SelectItem value="all">Tout</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Users className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-[#999999]">Total Leads</p>
                  <p className="text-xl font-semibold">{statistics.totalLeads}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-50 rounded-xl">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-[#999999]">Matchs créés</p>
                  <p className="text-xl font-semibold">{statistics.totalMatches}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-purple-50 rounded-xl">
                  <Calendar className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-[#999999]">Visites</p>
                  <p className="text-xl font-semibold">{statistics.visits}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 rounded-xl">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-[#999999]">Taux conversion</p>
                  <p className="text-xl font-semibold">{statistics.conversionRate}%</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Score moyen + proposés */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4 border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-50 rounded-xl">
                  <Target className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <p className="text-xs text-[#999999]">Score moyen</p>
                  <p className="text-xl font-semibold">{statistics.avgScore}%</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 rounded-xl">
                  <Building2 className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-xs text-[#999999]">Biens publiés</p>
                  <p className="text-xl font-semibold">{statistics.totalListings}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 rounded-xl">
                  <Flame className="w-4 h-4 text-rose-600" />
                </div>
                <div>
                  <p className="text-xs text-[#999999]">Proposés</p>
                  <p className="text-xl font-semibold">{statistics.proposed}</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-[#E5E5E5]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-50 rounded-xl">
                  <Trophy className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-[#999999]">Acceptés</p>
                  <p className="text-xl font-semibold">{statistics.accepted}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Weekly trend */}
            <Card className="p-5 border-[#E5E5E5]">
              <h3 className="font-semibold text-sm mb-4">Evolution hebdomadaire des matchs</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={statistics.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="matchs" stroke="#c5ff4e" strokeWidth={2} dot={{ fill: '#c5ff4e', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Score distribution */}
            <Card className="p-5 border-[#E5E5E5]">
              <h3 className="font-semibold text-sm mb-4">Distribution des scores</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={statistics.scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#c5ff4e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Status distribution */}
            <Card className="p-5 border-[#E5E5E5]">
              <h3 className="font-semibold text-sm mb-4">Répartition par statut</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statistics.statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {statistics.statusDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            {/* Type distribution */}
            <Card className="p-5 border-[#E5E5E5]">
              <h3 className="font-semibold text-sm mb-4">Répartition par type de lead</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={statistics.typeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ''}
                    outerRadius={90}
                    dataKey="value"
                  >
                    {statistics.typeDistribution.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Top rankings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top biens */}
            <Card className="p-5 border-[#E5E5E5]">
              <h3 className="font-semibold text-sm mb-3">Top 5 biens les plus matchés</h3>
              {statistics.topListings.length === 0 ? (
                <p className="text-xs text-[#999999]">Aucun match encore</p>
              ) : (
                <div className="space-y-2.5">
                  {statistics.topListings.map(({ listing, count }, i) => (
                    <div key={listing.id} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#999999] w-5 text-right">{i + 1}.</span>
                      <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] overflow-hidden flex-shrink-0">
                        {listing.images?.[0] ? (
                          <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-3 h-3 text-[#CCCCCC]" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{listing.title}</p>
                        <p className="text-[10px] text-[#999999]">{listing.city} — {formatPrice(listing.price)}</p>
                      </div>
                      <span className="text-xs font-semibold bg-[#F5F5F5] px-2 py-0.5 rounded-md">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top leads */}
            <Card className="p-5 border-[#E5E5E5]">
              <h3 className="font-semibold text-sm mb-3">Top 5 leads les plus actifs</h3>
              {statistics.topLeads.length === 0 ? (
                <p className="text-xs text-[#999999]">Aucun match encore</p>
              ) : (
                <div className="space-y-2.5">
                  {statistics.topLeads.map(({ lead, count }, i) => (
                    <div key={lead.id} className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#999999] w-5 text-right">{i + 1}.</span>
                      <div className="w-8 h-8 rounded-full bg-[#F5F5F5] flex items-center justify-center text-[10px] font-medium flex-shrink-0">
                        {lead.first_name?.[0]}{lead.last_name?.[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{lead.first_name} {lead.last_name}</p>
                        <p className="text-[10px] text-[#999999]">{lead.city} — {LEAD_TYPE_LABELS[lead.lead_type]?.label || ''}</p>
                      </div>
                      <span className="text-xs font-semibold bg-[#F5F5F5] px-2 py-0.5 rounded-md">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

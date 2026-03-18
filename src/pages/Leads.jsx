import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Plus, ChevronRight, Phone, LayoutList, LayoutGrid, CheckSquare, Square, Trash2, X, BrushCleaning, CircleDollarSign, Key } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import LeadsKanbanView from '@/components/leads/LeadsKanbanView';
import EditableLeadTypeBadge from '@/components/leads/EditableLeadTypeBadge';
import EditableCategorieBadge from '@/components/leads/EditableCategorieBadge';
import EditableStatusBadge from '@/components/leads/EditableStatusBadge';
import { toast } from 'sonner';
import {
  LEAD_TYPE_VIEWS,
  LEADS_VIEW_STORAGE_KEY,
  CATEGORY_FILTER_OPTIONS,
} from '@/lib/scoring-constants';

export default function Leads() {
  const [search, setSearch] = useState('');
  const [leadTypeView, setLeadTypeView] = useState(() => {
    try {
      const stored = localStorage.getItem(LEADS_VIEW_STORAGE_KEY);
      if (stored && Object.values(LEAD_TYPE_VIEWS).includes(stored)) return stored;
    } catch (_) {}
    return LEAD_TYPE_VIEWS.TOUS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LEADS_VIEW_STORAGE_KEY, leadTypeView);
    } catch (_) {}
  }, [leadTypeView]);

  useEffect(() => {
    setCategoryFilter('all');
  }, [leadTypeView]);

  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => api.entities.Lead.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ leadId, data }) => api.entities.Lead.update(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead mis à jour');
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const deleteLeadsMutation = useMutation({
    mutationFn: async (leadIds) => {
      for (const id of leadIds) {
        await api.entities.Lead.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      toast.success(`${selectedLeads.length} lead(s) supprimé(s)`);
      setSelectedLeads([]);
      setSelectionMode(false);
    },
  });

  const cleanDuplicatesMutation = useMutation({
    mutationFn: async () => {
      const response = await api.functions.invoke('cleanDuplicateLeads', {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['leads']);
      if (data.duplicatesDeleted > 0) {
        toast.success(`${data.duplicatesDeleted} doublon(s) supprimé(s) avec succès`);
      } else {
        toast.info('Aucun doublon trouvé');
      }
    },
    onError: () => {
      toast.error('Erreur lors du nettoyage des doublons');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ leadIds, status }) => {
      for (const id of leadIds) {
        await api.entities.Lead.update(id, { status });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      toast.success(`Statut mis à jour pour ${selectedLeads.length} lead(s)`);
      setSelectedLeads([]);
      setSelectionMode(false);
    },
  });

  // Filtre par type de lead (vue raccourci)
  const leadsByView = leads.filter((lead) => {
    if (leadTypeView === LEAD_TYPE_VIEWS.LOCATAIRE) return lead.lead_type === 'locataire';
    if (leadTypeView === LEAD_TYPE_VIEWS.ACHAT_VENTE) return ['acheteur', 'vendeur'].includes(lead.lead_type);
    return true; // tous
  });

  const filteredLeads = leadsByView.filter(lead => {
    const matchesSearch = search === '' || 
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.city?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || lead.categorie === categoryFilter ||
      (categoryFilter === 'CHAUD' && lead.categorie === 'URGENT') ||
      (categoryFilter === 'TIEDE' && lead.categorie === 'ACTIF') ||
      (categoryFilter === 'FROID' && lead.categorie === 'EN_VEILLE');
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const countByView = {
    [LEAD_TYPE_VIEWS.LOCATAIRE]: leads.filter((l) => l.lead_type === 'locataire').length,
    [LEAD_TYPE_VIEWS.ACHAT_VENTE]: leads.filter((l) => ['acheteur', 'vendeur'].includes(l.lead_type)).length,
    [LEAD_TYPE_VIEWS.TOUS]: leads.length,
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  const handleUpdateLead = (leadId, data) => {
    // Calculer automatiquement le score en fonction de la catégorie
    const updatedData = { ...data };
    if (data.categorie) {
      if (data.categorie === 'CHAUD' || data.categorie === 'URGENT') {
        updatedData.score = 80;
      } else if (data.categorie === 'TIEDE' || data.categorie === 'ACTIF') {
        updatedData.score = 55;
      } else if (data.categorie === 'FROID' || data.categorie === 'EN_VEILLE') {
        updatedData.score = 25;
      }
      updatedData.date_scoring = new Date().toISOString();
    }
    updateLeadMutation.mutate({ leadId, data: updatedData });
  };

  const handleToggleSelection = (leadId) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLeads.length === filteredLeads.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads.map(l => l.id));
    }
  };

  const handleDeleteSelected = () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedLeads.length} lead(s) ?`)) {
      deleteLeadsMutation.mutate(selectedLeads);
    }
  };

  const handleUpdateStatus = (status) => {
    updateStatusMutation.mutate({ leadIds: selectedLeads, status });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header - minimalist on mobile: title + primary CTA only */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between sm:block gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Leads</h1>
            <p className="text-[#999999] text-sm mt-0.5">
              {selectionMode && selectedLeads.length > 0 
                ? `${selectedLeads.length} sélectionné(s)` 
                : `${leads.length} prospect${leads.length > 1 ? 's' : ''}`}
            </p>
          </div>
          <Link to={createPageUrl('AddLead')} className="sm:hidden flex-shrink-0">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-4 text-sm font-medium">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </Link>
        </div>
        {/* Desktop only: duplicate Add button for consistency when not in selection mode */}
        {!selectionMode && (
          <Link to={createPageUrl('AddLead')} className="hidden sm:block">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-4 text-sm font-medium">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un lead
            </Button>
          </Link>
        )}
      </div>

      {/* Filters - search full width, view + filters on second row; compact on mobile */}
      <div className="flex flex-col gap-3">
        <div className="relative w-full min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999] flex-shrink-0" />
          <Input
            placeholder="Rechercher un lead..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl border-[#E5E5E5] focus:border-black focus:ring-0 w-full"
          />
        </div>
        {/* Barre vues raccourcis - ordre: Tous | Achat/Vente | Locataires | icônes actions à droite */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setLeadTypeView(LEAD_TYPE_VIEWS.TOUS)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              leadTypeView === LEAD_TYPE_VIEWS.TOUS
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-white border border-[#E5E5E5] text-[#666666] hover:bg-[#F5F5F5]'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Tous</span>
            <span className="text-xs opacity-80">{countByView[LEAD_TYPE_VIEWS.TOUS]}</span>
          </button>
          <button
            type="button"
            onClick={() => setLeadTypeView(LEAD_TYPE_VIEWS.ACHAT_VENTE)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              leadTypeView === LEAD_TYPE_VIEWS.ACHAT_VENTE
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-white border border-[#E5E5E5] text-[#666666] hover:bg-[#F5F5F5]'
            }`}
          >
            <CircleDollarSign className="w-4 h-4" />
            <span>Achat / Vente</span>
            <span className="text-xs opacity-80">{countByView[LEAD_TYPE_VIEWS.ACHAT_VENTE]}</span>
          </button>
          <button
            type="button"
            onClick={() => setLeadTypeView(LEAD_TYPE_VIEWS.LOCATAIRE)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              leadTypeView === LEAD_TYPE_VIEWS.LOCATAIRE
                ? 'bg-secondary text-secondary-foreground'
                : 'bg-white border border-[#E5E5E5] text-[#666666] hover:bg-[#F5F5F5]'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Locataires</span>
            <span className="text-xs opacity-80">{countByView[LEAD_TYPE_VIEWS.LOCATAIRE]}</span>
          </button>
          </div>
          <TooltipProvider delayDuration={200}>
            <div className="flex items-center gap-2 ml-auto">
              {!selectionMode ? (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => cleanDuplicatesMutation.mutate()}
                        disabled={cleanDuplicatesMutation.isPending}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#E5E5E5] text-[#666666] hover:bg-[#F5F5F5] transition-colors disabled:opacity-50"
                      >
                        <BrushCleaning className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Nettoyer les doublons</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setSelectionMode(true)}
                        className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#E5E5E5] text-[#666666] hover:bg-[#F5F5F5] transition-colors"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Sélectionner</TooltipContent>
                  </Tooltip>
                </>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectionMode(false);
                        setSelectedLeads([]);
                      }}
                      className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-[#E5E5E5] text-[#666666] hover:bg-[#F5F5F5] transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Annuler la sélection</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList className="bg-white border border-[#E5E5E5] h-10">
              <TabsTrigger value="list" className="flex items-center gap-1.5 px-3 text-sm h-8">
                <LayoutList className="w-4 h-4" />
                Liste
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-1.5 px-3 text-sm h-8">
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {viewMode === 'list' && (
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 min-w-0 sm:w-36 rounded-xl border-[#E5E5E5] text-sm flex-1 sm:flex-initial">
                  <Filter className="w-3.5 h-3.5 mr-1 text-[#999999] shrink-0" />
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="nouveau">Nouveau</SelectItem>
                  <SelectItem value="contacte">Contacté</SelectItem>
                  <SelectItem value="en_negociation">Négo</SelectItem>
                  <SelectItem value="converti">Converti</SelectItem>
                  <SelectItem value="perdu">Perdu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-10 min-w-0 sm:w-36 rounded-xl border-[#E5E5E5] text-sm flex-1 sm:flex-initial">
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_FILTER_OPTIONS[leadTypeView].map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
        </div>
        {selectionMode && viewMode === 'list' && (
          <Button 
            variant="outline"
            onClick={handleSelectAll}
            className="border-[#E5E5E5] rounded-xl h-9 px-3 text-sm font-medium hover:bg-[#F5F5F5] w-fit"
          >
            {selectedLeads.length === filteredLeads.length ? (
              <><Square className="w-4 h-4 mr-2" />Tout désélectionner</>
            ) : (
              <><CheckSquare className="w-4 h-4 mr-2" />Tout sélectionner</>
            )}
          </Button>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-40 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        <LeadsKanbanView leads={filteredLeads} leadTypeView={leadTypeView} onUpdateLead={handleUpdateLead} />
      ) : (
        /* List View */
        <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
          {filteredLeads.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
                <Search className="w-7 h-7 text-[#CCCCCC]" />
              </div>
              <p className="text-[#999999] font-medium">Aucun lead trouvé</p>
              <p className="text-sm text-[#CCCCCC] mt-1">Modifiez vos filtres ou ajoutez un nouveau lead</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E5]">
              {filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-start md:items-center gap-3 p-4 hover:bg-[#FAFAFA] transition-colors group"
                >
                  {selectionMode ? (
                    <div
                      className="w-10 h-10 flex items-center justify-center flex-shrink-0 cursor-pointer"
                      onClick={() => handleToggleSelection(lead.id)}
                    >
                      <Checkbox 
                        checked={selectedLeads.includes(lead.id)}
                        className="w-5 h-5"
                      />
                    </div>
                  ) : (
                    <Link
                      to={createPageUrl(`LeadDetail?id=${lead.id}`)}
                      className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-sm flex-shrink-0 text-secondary"
                    >
                      {lead.first_name?.[0]}{lead.last_name?.[0]}
                    </Link>
                  )}
                  
                  {/* Mobile: minimalist - name + categorie only; tap for details */}
                  <div className="flex-1 min-w-0 md:hidden flex items-center gap-3">
                    <Link to={createPageUrl(`LeadDetail?id=${lead.id}`)} className="flex-1 min-w-0 flex flex-col gap-0.5">
                      <p className="font-medium truncate text-sm">{lead.first_name} {lead.last_name}</p>
                      {lead.phone && (
                        <p className="text-xs text-[#999999] flex items-center gap-1 min-w-0">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate whitespace-nowrap">{lead.phone}</span>
                        </p>
                      )}
                    </Link>
                    {lead.categorie && (
                      <EditableCategorieBadge leadId={lead.id} currentCategorie={lead.categorie} leadType={lead.lead_type} onUpdate={handleUpdateLead} />
                    )}
                    <Link to={createPageUrl(`LeadDetail?id=${lead.id}`)} className="flex-shrink-0">
                      <ChevronRight className="w-5 h-5 text-[#CCCCCC]" />
                    </Link>
                  </div>

                  {/* Desktop: table row */}
                  <div className="flex-1 hidden md:grid grid-cols-[2fr_1fr_1fr_1.2fr_1fr_1fr_1fr_auto] items-center gap-3 min-w-0">
                    <Link to={createPageUrl(`LeadDetail?id=${lead.id}`)} className="min-w-0 hover:underline">
                      <p className="font-medium truncate text-sm">{lead.first_name} {lead.last_name}</p>
                      {lead.phone && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-[#999999]">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </div>
                      )}
                    </Link>
                    <div className="flex justify-center">
                      <EditableLeadTypeBadge leadId={lead.id} currentType={lead.lead_type} onUpdate={handleUpdateLead} />
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F2F2F2] text-[#666666] capitalize justify-center truncate">
                      {lead.property_type || '-'}
                    </span>
                    <span className="text-sm font-medium text-right truncate">
                      {lead.budget_max ? formatPrice(lead.budget_max) : '-'}
                    </span>
                    <span className="text-sm text-[#666666] truncate" title={lead.city}>{lead.city || '-'}</span>
                    <div className="flex justify-center">
                      {lead.categorie ? (
                        <EditableCategorieBadge leadId={lead.id} currentCategorie={lead.categorie} leadType={lead.lead_type} onUpdate={handleUpdateLead} />
                      ) : <div />}
                    </div>
                    <div className="flex justify-center">
                      <EditableStatusBadge leadId={lead.id} currentStatus={lead.status} onUpdate={handleUpdateLead} />
                    </div>
                    {!selectionMode && (
                      <Link to={createPageUrl(`LeadDetail?id=${lead.id}`)} className="flex justify-center">
                        <ChevronRight className="w-4 h-4 text-[#CCCCCC] group-hover:text-[#999999]" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Bar - Fixed at bottom when items selected */}
      {selectionMode && selectedLeads.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:bottom-6 z-50 bg-black text-white rounded-2xl shadow-2xl px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
          <span className="text-sm font-medium">
            {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} sélectionné{selectedLeads.length > 1 ? 's' : ''}
          </span>
          <div className="h-6 w-px bg-white/20" />
          <Select onValueChange={handleUpdateStatus}>
            <SelectTrigger className="w-full sm:w-40 h-9 bg-white/10 border-white/20 text-white rounded-lg">
              <SelectValue placeholder="Changer statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nouveau">Nouveau</SelectItem>
              <SelectItem value="contacte">Contacté</SelectItem>
              <SelectItem value="en_negociation">En négociation</SelectItem>
              <SelectItem value="converti">Converti</SelectItem>
              <SelectItem value="perdu">Perdu</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            className="h-9 rounded-lg bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Supprimer
          </Button>
        </div>
      )}
    </div>
  );
}
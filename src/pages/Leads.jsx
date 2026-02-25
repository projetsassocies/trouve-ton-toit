import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Plus, ChevronRight, Mail, Phone, LayoutList, LayoutGrid, CheckSquare, Square, Trash2, X, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import LeadsKanbanView from '@/components/leads/LeadsKanbanView';
import EditableLeadTypeBadge from '@/components/leads/EditableLeadTypeBadge';
import EditableCategorieBadge from '@/components/leads/EditableCategorieBadge';
import EditableStatusBadge from '@/components/leads/EditableStatusBadge';
import { toast } from 'sonner';

export default function Leads() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'kanban'
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState([]);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => base44.entities.Lead.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const updateLeadMutation = useMutation({
    mutationFn: ({ leadId, data }) => base44.entities.Lead.update(leadId, data),
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
        await base44.entities.Lead.delete(id);
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
      const response = await base44.functions.invoke('cleanDuplicateLeads', {});
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
        await base44.entities.Lead.update(id, { status });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['leads']);
      toast.success(`Statut mis à jour pour ${selectedLeads.length} lead(s)`);
      setSelectedLeads([]);
      setSelectionMode(false);
    },
  });

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = search === '' || 
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      lead.email?.toLowerCase().includes(search.toLowerCase()) ||
      lead.city?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || lead.categorie === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

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
      if (data.categorie === 'CHAUD') {
        updatedData.score = 80;
      } else if (data.categorie === 'TIÈDE') {
        updatedData.score = 55;
      } else if (data.categorie === 'FROID') {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads</h1>
          <p className="text-[#999999] mt-1">
            {selectionMode && selectedLeads.length > 0 
              ? `${selectedLeads.length} lead(s) sélectionné(s)` 
              : `${leads.length} prospect${leads.length > 1 ? 's' : ''} au total`}
          </p>
        </div>
        <div className="flex gap-2">
          {!selectionMode ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => cleanDuplicatesMutation.mutate()}
                disabled={cleanDuplicatesMutation.isPending}
                className="border-[#E5E5E5] rounded-xl h-10 px-4 text-sm font-medium hover:bg-[#F5F5F5]"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Nettoyer les doublons
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSelectionMode(true)}
                className="border-[#E5E5E5] rounded-xl h-10 px-4 text-sm font-medium hover:bg-[#F5F5F5]"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Sélectionner
              </Button>
              <Link to={createPageUrl('AddLead')}>
                <Button className="bg-[#c5ff4e] hover:bg-[#b5ef3e] text-black rounded-xl h-10 px-4 text-sm font-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un lead
                </Button>
              </Link>
            </>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectionMode(false);
                setSelectedLeads([]);
              }}
              className="border-[#E5E5E5] rounded-xl h-10 px-4 text-sm font-medium hover:bg-[#F5F5F5]"
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          )}
        </div>
      </div>

      {/* View Toggle & Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList className="bg-white border border-[#E5E5E5]">
              <TabsTrigger value="list" className="flex items-center gap-2">
                <LayoutList className="w-4 h-4" />
                Liste
              </TabsTrigger>
              <TabsTrigger value="kanban" className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" />
                Kanban
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {selectionMode && viewMode === 'list' && (
            <Button 
              variant="outline"
              onClick={handleSelectAll}
              className="border-[#E5E5E5] rounded-xl h-10 px-4 text-sm font-medium hover:bg-[#F5F5F5]"
            >
              {selectedLeads.length === filteredLeads.length ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Tout désélectionner
                </>
              ) : (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Tout sélectionner
                </>
              )}
            </Button>
          )}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
            <Input
              placeholder="Rechercher un lead..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 rounded-xl border-[#E5E5E5] focus:border-black focus:ring-0"
            />
          </div>
          {viewMode === 'list' && (
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl border-[#E5E5E5]">
                  <Filter className="w-4 h-4 mr-2 text-[#999999]" />
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="nouveau">Nouveau</SelectItem>
                  <SelectItem value="contacte">Contacté</SelectItem>
                  <SelectItem value="en_negociation">En négociation</SelectItem>
                  <SelectItem value="converti">Converti</SelectItem>
                  <SelectItem value="perdu">Perdu</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl border-[#E5E5E5]">
                  <Filter className="w-4 h-4 mr-2 text-[#999999]" />
                  <SelectValue placeholder="Catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  <SelectItem value="CHAUD">Chaud 🔥</SelectItem>
                  <SelectItem value="TIÈDE">Tiède ☀️</SelectItem>
                  <SelectItem value="FROID">Froid ❄️</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
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
        <LeadsKanbanView leads={filteredLeads} onUpdateLead={handleUpdateLead} />
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
                  className="flex items-center gap-3 p-4 hover:bg-[#FAFAFA] transition-colors group relative"
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
                      className="w-10 h-10 rounded-full bg-[#f9ffed] flex items-center justify-center font-medium text-sm flex-shrink-0 text-[#095237]"
                    >
                      {lead.first_name?.[0]}{lead.last_name?.[0]}
                    </Link>
                  )}
                  
                  <div 
                    className="flex-1 grid grid-cols-[2fr_1fr_1fr_1.2fr_1fr_1fr_1fr_auto] items-center gap-3 min-w-0"
                    onClick={() => selectionMode && handleToggleSelection(lead.id)}
                  >
                    {/* Name & Phone */}
                    <Link
                      to={createPageUrl(`LeadDetail?id=${lead.id}`)}
                      className="min-w-0 hover:underline"
                    >
                      <p className="font-medium truncate text-sm">
                        {lead.first_name} {lead.last_name}
                      </p>
                      {lead.phone && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-[#999999]">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </div>
                      )}
                    </Link>

                    {/* Lead Type */}
                    <div className="hidden lg:flex justify-center">
                      <EditableLeadTypeBadge
                        leadId={lead.id}
                        currentType={lead.lead_type}
                        onUpdate={handleUpdateLead}
                      />
                    </div>

                    {/* Property Type */}
                    <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#F2F2F2] text-[#666666] capitalize justify-center">
                      {lead.property_type || '-'}
                    </span>

                    {/* Budget */}
                    <span className="hidden md:block text-sm font-medium text-right">
                      {lead.budget_max ? formatPrice(lead.budget_max) : '-'}
                    </span>

                    {/* City */}
                    <span className="hidden sm:block text-sm text-[#666666] truncate" title={lead.city}>
                      {lead.city || '-'}
                    </span>

                    {/* Categorie Badge */}
                    <div className="flex justify-center">
                      {lead.categorie ? (
                        <EditableCategorieBadge
                          leadId={lead.id}
                          currentCategorie={lead.categorie}
                          onUpdate={handleUpdateLead}
                        />
                      ) : <div />}
                    </div>

                    {/* Pipeline Status Badge */}
                    <div className="flex justify-center">
                      <EditableStatusBadge
                        leadId={lead.id}
                        currentStatus={lead.status}
                        onUpdate={handleUpdateLead}
                      />
                    </div>
                    
                    {!selectionMode && (
                      <Link
                        to={createPageUrl(`LeadDetail?id=${lead.id}`)}
                        className="flex items-center justify-center"
                      >
                        <ChevronRight className="w-4 h-4 text-[#CCCCCC] group-hover:text-[#999999] transition-colors flex-shrink-0" />
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedLeads.length} lead{selectedLeads.length > 1 ? 's' : ''} sélectionné{selectedLeads.length > 1 ? 's' : ''}
          </span>
          <div className="h-6 w-px bg-white/20" />
          <Select onValueChange={handleUpdateStatus}>
            <SelectTrigger className="w-40 h-9 bg-white/10 border-white/20 text-white rounded-lg">
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
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Euro, 
  Home,
  Pencil,
  Trash2,
  Save,
  X,
  Sparkles,
  Shield,
  Banknote,
  Maximize,
  BarChart2,
  FileText
} from 'lucide-react';
import { AMENITIES, FINANCING_STATUS_OPTIONS, getAmenityByValue } from '@/lib/amenity-criteria';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import EditableLeadTypeBadge from '@/components/leads/EditableLeadTypeBadge';
import EditableCategorieBadge from '@/components/leads/EditableCategorieBadge';
import EditableStatusBadge from '@/components/leads/EditableStatusBadge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import MatchedListings from '@/components/matching/MatchedListings';
import LeadActivityTimeline from '@/components/leads/LeadActivityTimeline';

export default function LeadDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const leadId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: async () => {
      const leads = await api.entities.Lead.filter({ id: leadId });
      return leads[0];
    },
    enabled: !!leadId,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['listings', user?.email],
    queryFn: () => api.entities.Listing.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const updateMutation = useMutation({
    mutationFn: (data) => {
      // Calculer automatiquement la catégorie si le score change
      const updatedData = { ...data };
      if (data.score !== undefined && data.score !== null) {
        const score = Number(data.score);
        const isLocataire = data.lead_type === 'locataire';
        if (score >= 76) {
          updatedData.categorie = isLocataire ? 'URGENT' : 'CHAUD';
        } else if (score >= 41) {
          updatedData.categorie = isLocataire ? 'ACTIF' : 'TIEDE';
        } else {
          updatedData.categorie = isLocataire ? 'EN_VEILLE' : 'FROID';
        }
        updatedData.date_scoring = new Date().toISOString();
      }
      // Calculer le score si la catégorie change (pour les badges éditables)
      if (data.categorie && !data.score) {
        const hot = ['CHAUD', 'URGENT'].includes(data.categorie);
        const mid = ['TIEDE', 'ACTIF'].includes(data.categorie);
        if (hot) updatedData.score = 80;
        else if (mid) updatedData.score = 55;
        else updatedData.score = 25;
        if (data.categorie) updatedData.date_scoring = new Date().toISOString();
      }
      return api.entities.Lead.update(leadId, updatedData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setIsEditing(false);
    },
  });

  const handleUpdateLead = (id, data) => {
    updateMutation.mutate({ ...data, lead_type: data.lead_type ?? lead?.lead_type });
  };

  const deleteMutation = useMutation({
    mutationFn: () => api.entities.Lead.delete(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      navigate(createPageUrl('Leads'));
    },
  });

  const handleEdit = () => {
    setEditData(lead);
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(editData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <Skeleton className="h-6 w-64 mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <p className="text-[#999999]">Lead non trouvé</p>
        <Link to={createPageUrl('Leads')}>
          <Button variant="outline" className="mt-4 rounded-xl">
            Retour aux leads
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Leads')}>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {lead.first_name} {lead.last_name}
            </h1>
            <p className="text-[#999999] text-sm mt-0.5">
              Créé le {format(new Date(lead.created_date), 'dd MMMM yyyy', { locale: fr })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="rounded-xl"
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button 
                onClick={handleSave}
                disabled={updateMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
              >
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={handleEdit}
                className="rounded-xl"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Modifier
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowDeleteDialog(true)}
                className="rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Info */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">Informations de contact</h2>
            
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Prénom</label>
                  <Input
                    value={editData.first_name || ''}
                    onChange={(e) => setEditData({...editData, first_name: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Nom</label>
                  <Input
                    value={editData.last_name || ''}
                    onChange={(e) => setEditData({...editData, last_name: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    value={editData.email || ''}
                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Téléphone</label>
                  <Input
                    value={editData.phone || ''}
                    onChange={(e) => setEditData({...editData, phone: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {lead.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                      <Mail className="w-4 h-4 text-[#666666]" />
                    </div>
                    <a href={`mailto:${lead.email}`} className="hover:underline">{lead.email}</a>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                      <Phone className="w-4 h-4 text-[#666666]" />
                    </div>
                    <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Search Criteria / Bien à vendre */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">
              {lead.lead_type === 'vendeur' ? 'Bien à vendre' : 'Critères de recherche'}
            </h2>
            
            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Ville recherchée</label>
                  <Input
                    value={editData.city || ''}
                    onChange={(e) => setEditData({...editData, city: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Type de bien</label>
                  <Select 
                    value={editData.property_type || ''} 
                    onValueChange={(v) => setEditData({...editData, property_type: v})}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="t1">T1</SelectItem>
                      <SelectItem value="t2">T2</SelectItem>
                      <SelectItem value="t3">T3</SelectItem>
                      <SelectItem value="t4">T4</SelectItem>
                      <SelectItem value="t5">T5</SelectItem>
                      <SelectItem value="maison">Maison</SelectItem>
                      <SelectItem value="loft">Loft</SelectItem>
                      <SelectItem value="villa">Villa</SelectItem>
                      <SelectItem value="terrain">Terrain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Budget min</label>
                  <Input
                    type="number"
                    value={editData.budget_min || ''}
                    onChange={(e) => setEditData({...editData, budget_min: Number(e.target.value)})}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Budget max</label>
                  <Input
                    type="number"
                    value={editData.budget_max || ''}
                    onChange={(e) => setEditData({...editData, budget_max: Number(e.target.value)})}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Surface min (m²)</label>
                  <Input
                    type="number"
                    value={editData.surface_min || ''}
                    onChange={(e) => setEditData({...editData, surface_min: Number(e.target.value)})}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Surface max (m²)</label>
                  <Input
                    type="number"
                    value={editData.surface_max || ''}
                    onChange={(e) => setEditData({...editData, surface_max: Number(e.target.value)})}
                    className="rounded-xl"
                  />
                </div>
                {(editData.lead_type === 'acheteur' || !editData.lead_type) && (
                <>
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Statut du financement</label>
                  <Select 
                    value={editData.financing_status || ''} 
                    onValueChange={(v) => setEditData({...editData, financing_status: v})}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Non renseigné" />
                    </SelectTrigger>
                    <SelectContent>
                      {FINANCING_STATUS_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <SelectItem key={opt.value} value={opt.value}>
                            <span className="flex items-center gap-2">
                              <Icon className="w-4 h-4 text-[#666666]" strokeWidth={1.5} />
                              {opt.label}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Apport (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={editData.apport_percentage || ''}
                    onChange={(e) => setEditData({...editData, apport_percentage: Number(e.target.value)})}
                    className="rounded-xl"
                    placeholder="Ex: 20"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Délai</label>
                  <Select 
                    value={editData.delai || ''} 
                    onValueChange={(v) => setEditData({...editData, delai: v})}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Non défini" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="moins_1_mois">Moins de 1 mois</SelectItem>
                      <SelectItem value="1_2_mois">1-2 mois</SelectItem>
                      <SelectItem value="2_3_mois">2-3 mois</SelectItem>
                      <SelectItem value="3_6_mois">3-6 mois</SelectItem>
                      <SelectItem value="plus_6_mois">Plus de 6 mois</SelectItem>
                      <SelectItem value="non_defini">Non défini</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-[#999999] mb-1.5 block">Disponibilité</label>
                  <Select 
                    value={editData.disponibilite || ''} 
                    onValueChange={(v) => setEditData({...editData, disponibilite: v})}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Non défini" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tous_les_jours">Tous les jours</SelectItem>
                      <SelectItem value="plusieurs_jours_semaine">Plusieurs jours/semaine</SelectItem>
                      <SelectItem value="weekends">Week-ends</SelectItem>
                      <SelectItem value="1_2_creneaux_semaine">1-2 créneaux/semaine</SelectItem>
                      <SelectItem value="tres_limitee">Très limitée</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-[#999999] mb-1.5 block">Critères bloquants</label>
                  <div className="flex flex-wrap gap-2">
                    {AMENITIES.map((item) => {
                      const Icon = item.icon;
                      const selected = (editData.blocking_criteria || []).map((c) => c.toLowerCase().trim()).includes(item.value);
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            const current = editData.blocking_criteria || [];
                            const next = selected
                              ? current.filter((c) => c.toLowerCase().trim() !== item.value)
                              : [...current, item.value];
                            setEditData({ ...editData, blocking_criteria: next });
                          }}
                          className={cn(
                            "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                            selected
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-white text-[#666666] border-[#E5E5E5] hover:border-[#CCCCCC]"
                          )}
                        >
                          <Icon className="w-4 h-4" strokeWidth={1.5} />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                </>
                )}
                {(editData.lead_type === 'locataire') && (
                  <>
                    <div>
                      <label className="text-sm text-[#999999] mb-1.5 block">Loyer max (€/mois)</label>
                      <Input
                        type="number"
                        value={editData.loyer_cible_max || ''}
                        onChange={(e) => setEditData({...editData, loyer_cible_max: e.target.value ? Number(e.target.value) : ''})}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-[#999999] mb-1.5 block">Revenus nets mensuels (€)</label>
                      <Input
                        type="number"
                        value={editData.revenus_mensuels_nets || ''}
                        onChange={(e) => setEditData({...editData, revenus_mensuels_nets: e.target.value ? Number(e.target.value) : ''})}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-[#999999] mb-1.5 block">Date d&apos;entrée souhaitée</label>
                      <Input
                        type="date"
                        value={editData.date_entree_souhaitee || ''}
                        onChange={(e) => setEditData({...editData, date_entree_souhaitee: e.target.value})}
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-[#999999] mb-1.5 block">Garantie</label>
                      <Select
                        value={editData.garantie_type || ''}
                        onValueChange={(v) => setEditData({...editData, garantie_type: v})}
                      >
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="visale">Visale</SelectItem>
                          <SelectItem value="cautioneo">Cautionéo</SelectItem>
                          <SelectItem value="physique">Garant physique</SelectItem>
                          <SelectItem value="aucune">Aucune</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Checkbox
                        id="preavis_pose"
                        checked={!!editData.preavis_pose}
                        onCheckedChange={(v) => setEditData({...editData, preavis_pose: !!v})}
                      />
                      <label htmlFor="preavis_pose" className="text-sm cursor-pointer">Préavis posé</label>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Checkbox
                        id="dossier_location_complet"
                        checked={!!editData.dossier_location_complet}
                        onCheckedChange={(v) => setEditData({...editData, dossier_location_complet: !!v})}
                      />
                      <label htmlFor="dossier_location_complet" className="text-sm cursor-pointer">Dossier complet</label>
                    </div>
                  </>
                )}
                {(editData.lead_type === 'vendeur') && (
                  <div className="col-span-2 flex flex-wrap gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="mandat_signe"
                        checked={!!editData.mandat_signe}
                        onCheckedChange={(v) => setEditData({...editData, mandat_signe: !!v})}
                      />
                      <label htmlFor="mandat_signe" className="text-sm cursor-pointer">Mandat signé</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="estimation_demandee"
                        checked={!!editData.estimation_demandee}
                        onCheckedChange={(v) => setEditData({...editData, estimation_demandee: !!v})}
                      />
                      <label htmlFor="estimation_demandee" className="text-sm cursor-pointer">Estimation demandée</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="bien_sous_compromis"
                        checked={!!editData.bien_sous_compromis}
                        onCheckedChange={(v) => setEditData({...editData, bien_sous_compromis: !!v})}
                      />
                      <label htmlFor="bien_sous_compromis" className="text-sm cursor-pointer">Bien sous compromis</label>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-[#666666]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">Ville recherchée</p>
                    <p className="text-sm font-medium">{lead.city || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <Home className="w-4 h-4 text-[#666666]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">Type de bien</p>
                    <p className="text-sm font-medium capitalize">{lead.property_type || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <Euro className="w-4 h-4 text-[#666666]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">Budget min</p>
                    <p className="text-sm font-medium">
                      {lead.budget_min ? formatPrice(lead.budget_min) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <Euro className="w-4 h-4 text-[#666666]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">Budget max</p>
                    <p className="text-sm font-medium">
                      {lead.budget_max ? formatPrice(lead.budget_max) : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <Maximize className="w-4 h-4 text-[#666666]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">Surface min</p>
                    <p className="text-sm font-medium">
                      {lead.surface_min ? `${lead.surface_min} m²` : '-'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <Maximize className="w-4 h-4 text-[#666666]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">Surface max</p>
                    <p className="text-sm font-medium">
                      {lead.surface_max ? `${lead.surface_max} m²` : '-'}
                    </p>
                  </div>
                </div>
                {lead.financing_status && (
                  <div className="flex items-center gap-3 col-span-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                      <Banknote className="w-4 h-4 text-[#666666]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#999999]">Statut du financement</p>
                      <p className="text-sm font-medium flex items-center gap-2">
                        {(() => {
                          const opt = FINANCING_STATUS_OPTIONS.find((o) => o.value === lead.financing_status);
                          if (!opt) return lead.financing_status;
                          const Icon = opt.icon;
                          return (
                            <>
                              <Icon className="w-4 h-4 text-[#666666]" strokeWidth={1.5} />
                              {opt.label}
                            </>
                          );
                        })()}
                      </p>
                      {lead.apport_percentage && (
                        <p className="text-xs text-[#999999] mt-1">
                          Apport : {lead.apport_percentage}%
                        </p>
                      )}
                    </div>
                  </div>
                )}
                {lead.blocking_criteria && lead.blocking_criteria.length > 0 && (
                  <div className="flex items-start gap-3 col-span-2">
                    <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center flex-shrink-0">
                      <Shield className="w-4 h-4 text-[#666666]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-[#999999]">Critères bloquants</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {lead.blocking_criteria.map((criterion, i) => {
                          const item = getAmenityByValue(criterion);
                          const Icon = item?.icon;
                          const label = item?.label ?? criterion;
                          return (
                            <span key={i} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                              {Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />}
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                {lead.lead_type === 'locataire' && (lead.loyer_cible_max || lead.revenus_mensuels_nets || lead.date_entree_souhaitee || lead.garantie_type || lead.preavis_pose || lead.dossier_location_complet) && (
                  <div className="flex flex-col gap-3 col-span-2 pt-2 border-t border-[#E5E5E5]">
                    <p className="text-xs font-medium text-[#999999]">Dossier location</p>
                    <div className="flex flex-wrap gap-4">
                      {lead.loyer_cible_max && <span className="text-sm"><span className="text-[#999999]">Loyer max :</span> {formatPrice(lead.loyer_cible_max)}/mois</span>}
                      {lead.revenus_mensuels_nets && <span className="text-sm"><span className="text-[#999999]">Revenus :</span> {formatPrice(lead.revenus_mensuels_nets)}/mois</span>}
                      {lead.date_entree_souhaitee && <span className="text-sm"><span className="text-[#999999]">Entrée :</span> {format(new Date(lead.date_entree_souhaitee), 'dd/MM/yyyy', { locale: fr })}</span>}
                      {lead.garantie_type && <span className="text-sm"><span className="text-[#999999]">Garantie :</span> {lead.garantie_type === 'visale' ? 'Visale' : lead.garantie_type === 'cautioneo' ? 'Cautionéo' : lead.garantie_type === 'physique' ? 'Garant physique' : lead.garantie_type}</span>}
                      {lead.preavis_pose && <span className="text-sm text-green-600">Préavis posé</span>}
                      {lead.dossier_location_complet && <span className="text-sm text-green-600">Dossier complet</span>}
                    </div>
                  </div>
                )}
                {lead.lead_type === 'vendeur' && (lead.mandat_signe || lead.estimation_demandee || lead.bien_sous_compromis) && (
                  <div className="flex flex-col gap-2 col-span-2 pt-2 border-t border-[#E5E5E5]">
                    <p className="text-xs font-medium text-[#999999]">Projet vente</p>
                    <div className="flex flex-wrap gap-3">
                      {lead.mandat_signe && <span className="text-sm text-green-600">Mandat signé</span>}
                      {lead.estimation_demandee && <span className="text-sm text-green-600">Estimation demandée</span>}
                      {lead.bien_sous_compromis && <span className="text-sm text-green-600">Bien sous compromis</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">Notes</h2>
            
            {isEditing ? (
              <Textarea
                value={editData.notes || ''}
                onChange={(e) => setEditData({...editData, notes: e.target.value})}
                placeholder="Ajouter des notes..."
                className="rounded-xl min-h-32"
              />
            ) : (
              <p className="text-sm text-[#666666] whitespace-pre-line">
                {lead.notes || 'Aucune note'}
              </p>
            )}
          </div>

          {/* Activity Timeline */}
          <LeadActivityTimeline leadId={leadId} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Score et Catégorie */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">Score de qualification</h2>
            
            <div className="space-y-4">
              {lead.score !== undefined && lead.score !== null ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#666666]">Score</span>
                    <span className="text-2xl font-bold">{lead.score}/100</span>
                  </div>
                  {lead.categorie && (
                    <div className="flex items-center justify-center pt-2">
                      <EditableCategorieBadge
                        leadId={lead.id}
                        currentCategorie={lead.categorie}
                        leadType={lead.lead_type}
                        onUpdate={handleUpdateLead}
                      />
                    </div>
                  )}
                  {lead.date_scoring && (
                    <p className="text-xs text-[#999999] text-center">
                      Dernière MAJ : {format(new Date(lead.date_scoring), 'dd/MM/yyyy à HH:mm', { locale: fr })}
                    </p>
                  )}
                  
                  {/* Détail du score */}
                  {(lead.score_initial !== undefined || lead.score_engagement !== undefined || lead.score_progression !== undefined) && (
                    <div className="pt-4 border-t border-[#E5E5E5] space-y-2">
                      <p className="text-xs font-medium text-[#666666] mb-3 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4" strokeWidth={1.5} />
                        Détail du score
                      </p>
                      
                      <div className="space-y-2">
                        {lead.score_initial !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#666666]">• Score initial</span>
                            <span className="font-medium">{lead.score_initial}/50</span>
                          </div>
                        )}
                        {lead.score_engagement !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#666666]">• Engagement</span>
                            <span className="font-medium">{lead.score_engagement}/30</span>
                          </div>
                        )}
                        {lead.score_progression !== undefined && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-[#666666]">• Progression</span>
                            <span className="font-medium">{lead.score_progression}/20</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Logs de scoring */}
                  {lead.scoring_logs && lead.scoring_logs.length > 0 && (
                    <div className="pt-4 border-t border-[#E5E5E5]">
                      <details className="cursor-pointer">
                        <summary className="text-xs font-medium text-[#666666] hover:text-black flex items-center gap-2">
                          <FileText className="w-4 h-4" strokeWidth={1.5} />
                          Historique des changements
                        </summary>
                        <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
                          {lead.scoring_logs.slice(0, 5).map((log, idx) => (
                            <div key={idx} className="bg-[#FAFAFA] rounded-lg p-3 text-xs">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">
                                  {log.ancien_score} → {log.nouveau_score} 
                                  <span className={log.variation?.startsWith('+') ? 'text-green-600 ml-1' : 'text-rose-600 ml-1'}>
                                    ({log.variation})
                                  </span>
                                </span>
                                <span className="text-[#999999]">
                                  {format(new Date(log.date), 'dd/MM HH:mm', { locale: fr })}
                                </span>
                              </div>
                              {log.ancien_categorie !== log.nouveau_categorie && (
                                <p className="text-[#666666] mb-2">
                                  {log.ancien_categorie} → <span className="font-medium">{log.nouveau_categorie}</span>
                                </p>
                              )}
                              {log.raisons && log.raisons.length > 0 && (
                                <ul className="space-y-1 text-[#666666]">
                                  {log.raisons.slice(0, 3).map((raison, i) => (
                                    <li key={i}>• {raison}</li>
                                  ))}
                                  {log.raisons.length > 3 && (
                                    <li className="text-[#999999]">+ {log.raisons.length - 3} autres...</li>
                                  )}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-[#999999] text-center py-4">Non qualifié</p>
              )}
            </div>
          </div>

          {/* Lead Type */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">Type de lead</h2>
            
            {isEditing ? (
              <Select 
                value={editData.lead_type || 'acheteur'} 
                onValueChange={(v) => setEditData({...editData, lead_type: v})}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acheteur">Acheteur</SelectItem>
                  <SelectItem value="vendeur">Vendeur</SelectItem>
                  <SelectItem value="locataire">Locataire</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <EditableLeadTypeBadge
                leadId={lead.id}
                currentType={lead.lead_type}
                onUpdate={handleUpdateLead}
              />
            )}
          </div>

          {/* Property Type */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">Type de bien recherché</h2>
            
            {isEditing ? (
              <Select 
                value={editData.property_type || ''} 
                onValueChange={(v) => setEditData({...editData, property_type: v})}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="studio">Studio</SelectItem>
                  <SelectItem value="t1">T1</SelectItem>
                  <SelectItem value="t2">T2</SelectItem>
                  <SelectItem value="t3">T3</SelectItem>
                  <SelectItem value="t4">T4</SelectItem>
                  <SelectItem value="t5">T5</SelectItem>
                  <SelectItem value="maison">Maison</SelectItem>
                  <SelectItem value="loft">Loft</SelectItem>
                  <SelectItem value="villa">Villa</SelectItem>
                  <SelectItem value="terrain">Terrain</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                {lead.property_type || 'Non défini'}
              </span>
            )}
          </div>

          {/* Status */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">Statut de suivi</h2>
            
            {isEditing ? (
              <Select 
                value={editData.status || 'nouveau'} 
                onValueChange={(v) => setEditData({...editData, status: v})}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nouveau">Nouveau</SelectItem>
                  <SelectItem value="contacte">Contacté</SelectItem>
                  <SelectItem value="en_negociation">En négociation</SelectItem>
                  <SelectItem value="converti">Converti</SelectItem>
                  <SelectItem value="perdu">Perdu</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <EditableStatusBadge
                leadId={lead.id}
                currentStatus={lead.status}
                onUpdate={handleUpdateLead}
              />
            )}
          </div>

          {/* Source */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">Source</h2>
            
            {isEditing ? (
              <Select 
                value={editData.source || 'autre'} 
                onValueChange={(v) => setEditData({...editData, source: v})}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="social_page">Social Page</SelectItem>
                  <SelectItem value="leboncoin">Leboncoin</SelectItem>
                  <SelectItem value="seloger">SeLoger</SelectItem>
                  <SelectItem value="pap">PAP</SelectItem>
                  <SelectItem value="bouche_a_oreille">Bouche à oreille</SelectItem>
                  <SelectItem value="email_capture">Email capture</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm capitalize">
                {lead.source?.replace(/_/g, ' ') || 'Non renseigné'}
              </p>
            )}
          </div>

          {/* Matching */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Biens correspondants
              </h2>
              <Link to={createPageUrl('Matching')} className="text-xs text-[#999999] hover:text-black">
                Voir tout
              </Link>
            </div>
            <MatchedListings 
              listings={listings} 
              matchedIds={lead?.matched_listings || []}
              lead={lead}
            />
          </div>

          </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce lead ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le lead sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-rose-600 hover:bg-rose-700 rounded-xl"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
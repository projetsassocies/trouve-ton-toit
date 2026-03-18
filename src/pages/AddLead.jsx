import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Checkbox } from '@/components/ui/checkbox';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, User, ShoppingCart, Key, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AMENITIES } from '@/lib/amenity-criteria';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AddLead() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [emailToCheck, setEmailToCheck] = useState('');
  const [phoneToCheck, setPhoneToCheck] = useState('');
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lead_type: 'acheteur',
    city: '',
    property_type: '',
    budget_min: '',
    budget_max: '',
    surface_min: '',
    surface_max: '',
    rooms_min: '',
    source: 'autre',
    status: 'nouveau',
    notes: '',
    blocking_criteria: [],
    // Locataire
    garantie_type: '',
    date_entree_souhaitee: '',
    preavis_pose: false,
    revenus_mensuels_nets: '',
    loyer_cible_max: '',
    dossier_location_complet: false,
    dossier_valide_agent: false,
    // Vendeur
    mandat_signe: false,
    estimation_demandee: false,
    bien_sous_compromis: false,
  });

  // Vérifier les doublons par email
  const { data: duplicateLeadsByEmail = [] } = useQuery({
    queryKey: ['duplicate-check-email', emailToCheck, user?.email],
    queryFn: async () => {
      if (!emailToCheck || !user?.email) return [];
      const leads = await api.entities.Lead.filter({ 
        email: emailToCheck,
        created_by: user.email 
      });
      return leads;
    },
    enabled: !!emailToCheck && !!user?.email,
  });

  // Vérifier les doublons par téléphone
  const { data: duplicateLeadsByPhone = [] } = useQuery({
    queryKey: ['duplicate-check-phone', phoneToCheck, user?.email],
    queryFn: async () => {
      if (!phoneToCheck || !user?.email) return [];
      const allLeads = await api.entities.Lead.filter({ 
        created_by: user.email 
      });
      // Filtrer côté client car on ne peut pas filtrer sur phone avec normalisation
      const normalizedPhone = phoneToCheck.replace(/\s/g, '');
      return allLeads.filter(lead => 
        lead.phone && lead.phone.replace(/\s/g, '') === normalizedPhone
      );
    },
    enabled: !!phoneToCheck && !!user?.email,
  });

  const duplicateLeads = [...duplicateLeadsByEmail, ...duplicateLeadsByPhone].reduce((acc, lead) => {
    if (!acc.find(l => l.id === lead.id)) acc.push(lead);
    return acc;
  }, []);

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Lead.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      navigate(createPageUrl('Leads'));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Vérifier les doublons avant création
    if (duplicateLeads.length > 0) {
      const reasons = [];
      if (duplicateLeadsByEmail.length > 0) reasons.push(`email (${formData.email})`);
      if (duplicateLeadsByPhone.length > 0) reasons.push(`téléphone (${formData.phone})`);
      toast.error(`Un lead avec ce ${reasons.join(' ou ')} existe déjà. Veuillez modifier le lead existant.`);
      return;
    }
    
    const data = {
      ...formData,
      budget_min: formData.budget_min ? Number(formData.budget_min) : undefined,
      budget_max: formData.budget_max ? Number(formData.budget_max) : undefined,
      surface_min: formData.surface_min ? Number(formData.surface_min) : undefined,
      surface_max: formData.surface_max ? Number(formData.surface_max) : undefined,
      rooms_min: formData.rooms_min ? Number(formData.rooms_min) : undefined,
      revenus_mensuels_nets: formData.revenus_mensuels_nets ? Number(formData.revenus_mensuels_nets) : undefined,
      loyer_cible_max: formData.loyer_cible_max ? Number(formData.loyer_cible_max) : undefined,
      date_entree_souhaitee: formData.date_entree_souhaitee || undefined,
      garantie_type: formData.garantie_type || undefined,
      preavis_pose: formData.lead_type === 'locataire' ? formData.preavis_pose : undefined,
      dossier_location_complet: formData.lead_type === 'locataire' ? formData.dossier_location_complet : undefined,
      dossier_valide_agent: formData.lead_type === 'locataire' ? formData.dossier_valide_agent : undefined,
      mandat_signe: formData.lead_type === 'vendeur' ? formData.mandat_signe : undefined,
      estimation_demandee: formData.lead_type === 'vendeur' ? formData.estimation_demandee : undefined,
      bien_sous_compromis: formData.lead_type === 'vendeur' ? formData.bien_sous_compromis : undefined,
    };
    createMutation.mutate(data);
  };

  const handleEmailChange = (e) => {
    const email = e.target.value;
    setFormData({...formData, email});
    // Déclencher la vérification uniquement si l'email est valide
    if (email && email.includes('@')) {
      setEmailToCheck(email);
    } else {
      setEmailToCheck('');
    }
  };

  const handlePhoneChange = (e) => {
    const phone = e.target.value;
    setFormData({...formData, phone});
    // Déclencher la vérification uniquement si le téléphone a au moins 8 chiffres
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length >= 8) {
      setPhoneToCheck(phone);
    } else {
      setPhoneToCheck('');
    }
  };

  const leadTypes = [
    { value: 'acheteur', label: 'Acheteur', icon: ShoppingCart, desc: 'Recherche un bien à acheter' },
    { value: 'vendeur', label: 'Vendeur', icon: Key, desc: 'Souhaite vendre son bien' },
    { value: 'locataire', label: 'Locataire', icon: User, desc: 'Recherche une location' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Leads')}>
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nouveau lead</h1>
          <p className="text-[#999999] text-sm mt-0.5">Ajoutez un nouveau prospect</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Lead Type */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <h2 className="font-semibold mb-4">Type de lead</h2>
          <div className="grid grid-cols-3 gap-3">
            {leadTypes.map((type) => {
              const Icon = type.icon;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData({...formData, lead_type: type.value})}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all",
                    formData.lead_type === type.value
                      ? "border-black bg-black/5"
                      : "border-[#E5E5E5] hover:border-[#CCCCCC]"
                  )}
                >
                  <Icon className={cn(
                    "w-5 h-5 mb-2",
                    formData.lead_type === type.value ? "text-black" : "text-[#999999]"
                  )} />
                  <p className="font-medium text-sm">{type.label}</p>
                  <p className="text-xs text-[#999999] mt-0.5">{type.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Contact Info */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <h2 className="font-semibold mb-4">Informations de contact</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[#999999] mb-1.5 block">Prénom *</label>
              <Input
                value={formData.first_name}
                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                required
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm text-[#999999] mb-1.5 block">Nom *</label>
              <Input
                value={formData.last_name}
                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                required
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm text-[#999999] mb-1.5 block">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={handleEmailChange}
                className={cn(
                  "rounded-xl",
                  duplicateLeads.length > 0 && "border-rose-500 focus:border-rose-500"
                )}
              />
              {duplicateLeads.length > 0 && (
                <div className="flex items-start gap-2 mt-2 text-xs text-rose-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Ce lead existe déjà</p>
                    <p className="text-rose-500 mt-0.5">
                      {duplicateLeads.length} lead{duplicateLeads.length > 1 ? 's' : ''} trouvé{duplicateLeads.length > 1 ? 's' : ''} avec cet email. 
                      {duplicateLeads.length === 1 && (
                        <Link 
                          to={createPageUrl(`LeadDetail?id=${duplicateLeads[0].id}`)}
                          className="underline ml-1 hover:text-rose-700"
                        >
                          Voir le lead existant
                        </Link>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-[#999999] mb-1.5 block">Téléphone</label>
              <Input
                value={formData.phone}
                onChange={handlePhoneChange}
                className={cn(
                  "rounded-xl",
                  duplicateLeadsByPhone.length > 0 && "border-rose-500 focus:border-rose-500"
                )}
              />
              {duplicateLeadsByPhone.length > 0 && (
                <div className="flex items-start gap-2 mt-2 text-xs text-rose-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Ce lead existe déjà</p>
                    <p className="text-rose-500 mt-0.5">
                      {duplicateLeadsByPhone.length} lead{duplicateLeadsByPhone.length > 1 ? 's' : ''} trouvé{duplicateLeadsByPhone.length > 1 ? 's' : ''} avec ce téléphone. 
                      {duplicateLeadsByPhone.length === 1 && (
                        <Link 
                          to={createPageUrl(`LeadDetail?id=${duplicateLeadsByPhone[0].id}`)}
                          className="underline ml-1 hover:text-rose-700"
                        >
                          Voir le lead existant
                        </Link>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search Criteria */}
        {(formData.lead_type === 'acheteur' || formData.lead_type === 'locataire') && (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">Critères de recherche</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Ville recherchée</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Type de bien</label>
                <Select 
                  value={formData.property_type} 
                  onValueChange={(v) => setFormData({...formData, property_type: v})}
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
                <label className="text-sm text-[#999999] mb-1.5 block">Budget min (€)</label>
                <Input
                  type="number"
                  value={formData.budget_min}
                  onChange={(e) => setFormData({...formData, budget_min: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Budget max (€)</label>
                <Input
                  type="number"
                  value={formData.budget_max}
                  onChange={(e) => setFormData({...formData, budget_max: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Surface min (m²)</label>
                <Input
                  type="number"
                  value={formData.surface_min}
                  onChange={(e) => setFormData({...formData, surface_min: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Surface max (m²)</label>
                <Input
                  type="number"
                  value={formData.surface_max}
                  onChange={(e) => setFormData({...formData, surface_max: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Pièces minimum</label>
                <Input
                  type="number"
                  value={formData.rooms_min}
                  onChange={(e) => setFormData({...formData, rooms_min: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm text-[#999999] mb-1.5 block">Critères bloquants</label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES.map((item) => {
                    const Icon = item.icon;
                    const selected = (formData.blocking_criteria || []).map((c) => c.toLowerCase().trim()).includes(item.value);
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          const current = formData.blocking_criteria || [];
                          const next = selected
                            ? current.filter((c) => c.toLowerCase().trim() !== item.value)
                            : [...current, item.value];
                          setFormData({ ...formData, blocking_criteria: next });
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
                <p className="text-xs text-[#999999] mt-1">Critères indispensables (parking, ascenseur, balcon...)</p>
              </div>
            </div>
          </div>
        )}

        {/* Dossier Location (Locataire) */}
        {formData.lead_type === 'locataire' && (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">Dossier location</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Loyer max souhaité (€/mois)</label>
                <Input
                  type="number"
                  value={formData.loyer_cible_max}
                  onChange={(e) => setFormData({...formData, loyer_cible_max: e.target.value})}
                  placeholder="Ex. 900"
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Revenus nets mensuels (€)</label>
                <Input
                  type="number"
                  value={formData.revenus_mensuels_nets}
                  onChange={(e) => setFormData({...formData, revenus_mensuels_nets: e.target.value})}
                  placeholder="Ex. 2500"
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Date d&apos;entrée souhaitée</label>
                <Input
                  type="date"
                  value={formData.date_entree_souhaitee}
                  onChange={(e) => setFormData({...formData, date_entree_souhaitee: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Garantie</label>
                <Select
                  value={formData.garantie_type}
                  onValueChange={(v) => setFormData({...formData, garantie_type: v})}
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
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="preavis_pose"
                  checked={formData.preavis_pose}
                  onCheckedChange={(v) => setFormData({...formData, preavis_pose: !!v})}
                />
                <label htmlFor="preavis_pose" className="text-sm cursor-pointer">Préavis déjà posé</label>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="dossier_location_complet"
                  checked={formData.dossier_location_complet}
                  onCheckedChange={(v) => setFormData({...formData, dossier_location_complet: !!v})}
                />
                <label htmlFor="dossier_location_complet" className="text-sm cursor-pointer">Dossier complet (pièces d&apos;identité, bulletins, garantie)</label>
              </div>
            </div>
          </div>
        )}

        {/* Seller Info */}
        {formData.lead_type === 'vendeur' && (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">Bien à vendre</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Ville du bien</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Type de bien</label>
                <Select 
                  value={formData.property_type} 
                  onValueChange={(v) => setFormData({...formData, property_type: v})}
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
                <label className="text-sm text-[#999999] mb-1.5 block">Prix souhaité (€)</label>
                <Input
                  type="number"
                  value={formData.budget_max}
                  onChange={(e) => setFormData({...formData, budget_max: e.target.value})}
                  placeholder="Prix de vente"
                  className="rounded-xl"
                />
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="mandat_signe"
                    checked={formData.mandat_signe}
                    onCheckedChange={(v) => setFormData({...formData, mandat_signe: !!v})}
                  />
                  <label htmlFor="mandat_signe" className="text-sm cursor-pointer">Mandat signé</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="estimation_demandee"
                    checked={formData.estimation_demandee}
                    onCheckedChange={(v) => setFormData({...formData, estimation_demandee: !!v})}
                  />
                  <label htmlFor="estimation_demandee" className="text-sm cursor-pointer">Estimation demandée</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="bien_sous_compromis"
                    checked={formData.bien_sous_compromis}
                    onCheckedChange={(v) => setFormData({...formData, bien_sous_compromis: !!v})}
                  />
                  <label htmlFor="bien_sous_compromis" className="text-sm cursor-pointer">Bien déjà sous compromis</label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Source & Status */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <h2 className="font-semibold mb-4">Informations complémentaires</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-[#999999] mb-1.5 block">Source</label>
              <Select 
                value={formData.source} 
                onValueChange={(v) => setFormData({...formData, source: v})}
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
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-[#999999] mb-1.5 block">Statut</label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({...formData, status: v})}
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
            </div>
            <div className="col-span-full">
              <label className="text-sm text-[#999999] mb-1.5 block">Notes</label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Ajouter des notes..."
                className="rounded-xl min-h-24"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link to={createPageUrl('Leads')}>
            <Button type="button" variant="outline" className="rounded-xl">
              Annuler
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={createMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
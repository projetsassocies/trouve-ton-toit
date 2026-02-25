import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Save, User, ShoppingCart, Key, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
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
  });

  // Vérifier les doublons par email
  const { data: duplicateLeadsByEmail = [] } = useQuery({
    queryKey: ['duplicate-check-email', emailToCheck, user?.email],
    queryFn: async () => {
      if (!emailToCheck || !user?.email) return [];
      const leads = await base44.entities.Lead.filter({ 
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
      const allLeads = await base44.entities.Lead.filter({ 
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
    mutationFn: (data) => base44.entities.Lead.create(data),
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
            className="bg-[#c5ff4e] hover:bg-[#b5ef3e] text-black rounded-xl"
          >
            <Save className="w-4 h-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
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
import { Calendar } from '@/components/ui/calendar';
import { X, Check, Calendar as CalendarIcon, Phone, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function LeadCaptureForm({ onClose, agentConfig, isPublic = false }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    lead_type: 'acheteur',
    property_type: '',
    city: '',
    budget_min: '',
    budget_max: '',
    notes: '',
    wants_appointment: null,
    appointment_type: '',
    appointment_date: null,
    appointment_message: ''
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setSubmitError(null);
    try {
      const leadData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        phone: formData.phone || undefined,
        lead_type: formData.lead_type,
        property_type: formData.property_type || undefined,
        city: formData.city || undefined,
        budget_min: formData.budget_min ? Number(formData.budget_min) : undefined,
        budget_max: formData.budget_max ? Number(formData.budget_max) : undefined,
        notes: formData.notes || undefined,
      };

      if (!agentConfig?.id && isPublic) {
        throw new Error('Configuration de la page manquante. Rechargez la page.');
      }

      if (isPublic && agentConfig?.id) {
        const eventData = formData.wants_appointment && formData.appointment_date
          ? {
              appointment_type: formData.appointment_type,
              appointment_date: formData.appointment_date.toISOString(),
              appointment_message: formData.appointment_message || undefined,
            }
          : null;

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseKey) {
          throw new Error('Configuration Supabase manquante.');
        }

        const res = await fetch(`${supabaseUrl}/functions/v1/capture-lead`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            social_page_config_id: agentConfig.id,
            lead_data: leadData,
            event_data: eventData,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Erreur ${res.status}`);
        }
        if (data?.error) throw new Error(data.error);
      } else {
        const fullLeadData = {
          ...leadData,
          source: 'social_page',
          status: 'nouveau',
        };
        const newLead = await base44.entities.Lead.create(fullLeadData);

        if (formData.wants_appointment && formData.appointment_date) {
          const eventRecord = {
            title: `${formData.appointment_type} - ${formData.first_name} ${formData.last_name}`,
            type: formData.appointment_type === 'Visite' ? 'visit' :
                  formData.appointment_type === 'Appel' ? 'call' : 'meeting',
            date: formData.appointment_date.toISOString(),
            end_date: new Date(formData.appointment_date.getTime() + 60 * 60 * 1000).toISOString(),
            description: formData.appointment_message || undefined,
            status: 'planned',
            linked_to_type: 'lead',
            linked_to_id: newLead.id,
          };
          await base44.entities.Event.create(eventRecord);
          await base44.entities.Notification.create({
            type: 'info',
            title: 'Nouvelle demande de rendez-vous',
            message: `${formData.first_name} ${formData.last_name} a demandé un ${formData.appointment_type.toLowerCase()} via la Social Page`,
            linked_lead_id: newLead.id,
            read: false,
          });
        } else {
          await base44.entities.Notification.create({
            type: 'info',
            title: 'Nouveau lead capturé',
            message: `${formData.first_name} ${formData.last_name} a rempli le formulaire sur la Social Page`,
            linked_lead_id: newLead.id,
            read: false,
          });
        }
      }

      toast.success('Merci ! Votre demande a bien été envoyée.');
      setStep(4);
    } catch (error) {
      console.error('Erreur lors de la soumission:', error);
      const msg = error?.message || 'Erreur inconnue';
      setSubmitError(msg);
      toast.error(msg.length > 80 ? msg.slice(0, 80) + '...' : msg);
    } finally {
      setLoading(false);
    }
  };

  const canGoToStep2 = formData.first_name && formData.last_name && formData.email;
  const canGoToStep3 = formData.lead_type;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h2 className="text-xl font-semibold">
              {step === 1 && 'Commençons par vos coordonnées'}
              {step === 2 && 'Parlez-nous de votre projet'}
              {step === 3 && 'Souhaitez-vous un rendez-vous ?'}
              {step === 4 && 'Demande envoyée !'}
            </h2>
            {step < 4 && (
              <p className="text-sm text-gray-500 mt-1">Étape {step} sur 3</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Coordonnées */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Prénom *</label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => handleChange('first_name', e.target.value)}
                    placeholder="Jean"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Nom *</label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => handleChange('last_name', e.target.value)}
                    placeholder="Dupont"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Email *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="jean.dupont@example.com"
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Téléphone</label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="rounded-xl"
                />
              </div>

              <Button
                onClick={() => setStep(2)}
                disabled={!canGoToStep2}
                className="w-full rounded-xl bg-black hover:bg-gray-800"
                style={{
                  backgroundColor: agentConfig?.primary_color || '#000000'
                }}
              >
                Suivant
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}

          {/* Step 2: Critères de recherche */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Je suis *</label>
                <Select value={formData.lead_type} onValueChange={(v) => handleChange('lead_type', v)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acheteur">Acheteur</SelectItem>
                    <SelectItem value="vendeur">Vendeur</SelectItem>
                    <SelectItem value="locataire">Locataire</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Type de bien recherché</label>
                <Select value={formData.property_type} onValueChange={(v) => handleChange('property_type', v)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="t1">T1</SelectItem>
                    <SelectItem value="t2">T2</SelectItem>
                    <SelectItem value="t3">T3</SelectItem>
                    <SelectItem value="t4">T4</SelectItem>
                    <SelectItem value="t5">T5+</SelectItem>
                    <SelectItem value="maison">Maison</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Ville préférée</label>
                <Input
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Paris, Lyon..."
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Budget min (€)</label>
                  <Input
                    type="number"
                    value={formData.budget_min}
                    onChange={(e) => handleChange('budget_min', e.target.value)}
                    placeholder="150000"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Budget max (€)</label>
                  <Input
                    type="number"
                    value={formData.budget_max}
                    onChange={(e) => handleChange('budget_max', e.target.value)}
                    placeholder="250000"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Informations complémentaires</label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Décrivez votre projet..."
                  className="rounded-xl min-h-24"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-full rounded-xl"
                >
                  Retour
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canGoToStep3}
                  className="w-full rounded-xl bg-black hover:bg-gray-800"
                  style={{
                    backgroundColor: agentConfig?.primary_color || '#000000'
                  }}
                >
                  Suivant
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Rendez-vous optionnel */}
          {step === 3 && (
            <div className="space-y-4">
              {submitError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                  {submitError}
                </div>
              )}
              {formData.wants_appointment === null && (
                <>
                  <p className="text-gray-600 mb-4">
                    Souhaitez-vous planifier un échange pour discuter de votre projet ?
                  </p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleChange('wants_appointment', true)}
                      className="p-4 border-2 border-gray-200 rounded-xl hover:border-gray-900 hover:bg-gray-50 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium">Oui, avec plaisir</p>
                          <p className="text-xs text-gray-500">Planifier un rendez-vous</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="p-4 border-2 border-gray-200 rounded-xl hover:border-gray-900 hover:bg-gray-50 transition-all text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <Mail className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">Pas maintenant</p>
                          <p className="text-xs text-gray-500">Envoyer ma demande</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </>
              )}

              {formData.wants_appointment === true && (
                <>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Type de rendez-vous</label>
                    <Select value={formData.appointment_type} onValueChange={(v) => handleChange('appointment_type', v)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Choisir" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Appel">📞 Appel téléphonique</SelectItem>
                        <SelectItem value="Visite">🏠 Visite d'un bien</SelectItem>
                        <SelectItem value="RDV découverte">☕ Rendez-vous découverte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Date souhaitée</label>
                    <div className="border border-gray-200 rounded-xl p-3">
                      <Calendar
                        mode="single"
                        selected={formData.appointment_date}
                        onSelect={(date) => handleChange('appointment_date', date)}
                        disabled={(date) => date < new Date()}
                        className="rounded-md"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Message (optionnel)</label>
                    <Textarea
                      value={formData.appointment_message}
                      onChange={(e) => handleChange('appointment_message', e.target.value)}
                      placeholder="Précisez vos disponibilités ou toute autre information..."
                      className="rounded-xl min-h-20"
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleChange('wants_appointment', null)}
                      className="w-full rounded-xl"
                    >
                      Retour
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={loading || !formData.appointment_type || !formData.appointment_date}
                      className="w-full rounded-xl bg-black hover:bg-gray-800"
                      style={{
                        backgroundColor: agentConfig?.primary_color || '#000000'
                      }}
                    >
                      {loading ? 'Envoi...' : 'Envoyer'}
                    </Button>
                  </div>
                </>
              )}

              {formData.wants_appointment === null && (
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="w-full rounded-xl"
                >
                  Retour
                </Button>
              )}
            </div>
          )}

          {/* Step 4: Confirmation */}
          {step === 4 && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Demande envoyée !</h3>
              <p className="text-gray-600 mb-6">
                {formData.wants_appointment 
                  ? "Merci ! Je reviendrai vers vous très rapidement pour confirmer votre rendez-vous."
                  : "Merci ! Je vous recontacterai dans les plus brefs délais pour discuter de votre projet."}
              </p>
              {agentConfig?.phone && (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Phone className="w-4 h-4" />
                  <span>{agentConfig.phone}</span>
                </div>
              )}
              <Button
                onClick={onClose}
                className="mt-6 rounded-xl bg-black hover:bg-gray-800"
                style={{
                  backgroundColor: agentConfig?.primary_color || '#000000'
                }}
              >
                Fermer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
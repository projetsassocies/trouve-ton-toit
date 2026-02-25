import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { 
  Sparkles, 
  ArrowRight, 
  Check, 
  X, 
  Loader2, 
  AlertCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Home,
  Euro,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function LeadExtractionAssistant() {
  const [inputText, setInputText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const extractLeadData = async () => {
    if (!inputText.trim()) {
      toast.error('Veuillez coller un texte à analyser');
      return;
    }

    setIsExtracting(true);
    setError(null);
    setExtractedData(null);

    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un assistant spécialisé dans l'extraction d'informations de leads immobiliers.
        
Analyse le texte suivant et extrais toutes les informations pertinentes pour créer un lead immobilier.

TEXTE À ANALYSER:
"""
${inputText}
"""

INSTRUCTIONS:
- Extrais les informations suivantes si présentes
- Pour lead_status, détermine si la personne est "acheteur", "vendeur" ou "locataire" en fonction du contexte
- Pour property_type, utilise: "studio", "t1", "t2", "t3", "t4", "t5", "maison", "loft", "villa", "terrain"
- Si une information n'est pas trouvée, laisse une chaîne vide ""
- Ne devine pas les informations manquantes
- Mets les informations supplémentaires dans le champ notes

Tu DOIS retourner UNIQUEMENT un objet JSON valide avec exactement cette structure, sans texte avant ou après:`,
        response_json_schema: {
          type: "object",
          properties: {
            first_name: { type: "string", description: "Prénom du prospect" },
            last_name: { type: "string", description: "Nom du prospect" },
            email: { type: "string", description: "Adresse email" },
            phone: { type: "string", description: "Numéro de téléphone" },
            city: { type: "string", description: "Ville recherchée" },
            property_type: { type: "string", description: "Type de bien (studio, t1, t2, t3, t4, t5, maison, loft, villa, terrain)" },
            budget_min: { type: "number", description: "Budget minimum en euros" },
            budget_max: { type: "number", description: "Budget maximum en euros" },
            lead_status: { type: "string", description: "Statut: acheteur, vendeur ou locataire" },
            notes: { type: "string", description: "Informations supplémentaires extraites" },
            extraction_confidence: { type: "string", description: "high, medium ou low selon la qualité des données extraites" }
          },
          required: ["first_name", "last_name", "email", "phone", "city", "property_type", "budget_min", "budget_max", "lead_status", "notes", "extraction_confidence"]
        }
      });

      setExtractedData(response);
    } catch (err) {
      console.error('Extraction error:', err);
      setError("Je n'ai pas pu extraire les informations. Veuillez réessayer avec plus de détails.");
    } finally {
      setIsExtracting(false);
    }
  };

  const createLead = async () => {
    if (!extractedData) return;

    try {
      const leadData = {
        first_name: extractedData.first_name || 'Inconnu',
        last_name: extractedData.last_name || 'Inconnu',
        email: extractedData.email || '',
        phone: extractedData.phone || '',
        city: extractedData.city || '',
        property_type: extractedData.property_type || '',
        budget_min: extractedData.budget_min || undefined,
        budget_max: extractedData.budget_max || undefined,
        lead_type: extractedData.lead_status || 'acheteur',
        status: 'nouveau',
        source: 'email_capture',
        notes: `${extractedData.notes || ''}\n\n--- Message original ---\n${inputText}`.trim()
      };

      await base44.entities.Lead.create(leadData);
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead créé avec succès !');
      
      setInputText('');
      setExtractedData(null);
    } catch (err) {
      console.error('Create lead error:', err);
      toast.error('Erreur lors de la création du lead');
    }
  };

  const cancelExtraction = () => {
    setExtractedData(null);
    setError(null);
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  const getLeadTypeLabel = (type) => {
    const labels = {
      acheteur: 'Acheteur',
      vendeur: 'Vendeur',
      locataire: 'Locataire'
    };
    return labels[type] || type || '-';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence === 'high') return 'text-emerald-600 bg-emerald-50';
    if (confidence === 'medium') return 'text-amber-600 bg-amber-50';
    return 'text-rose-600 bg-rose-50';
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-[580px]">
        {!extractedData ? (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h2 className="font-semibold text-[15px]">Créer un lead avec l'IA</h2>
              </div>
              <p className="text-xs text-[#999999] mb-4">Collez un message et laissez l'IA extraire les informations</p>

              <div className="relative">
                <Textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Collez ici un email, message WhatsApp, SMS ou demande client..."
                  className="min-h-[120px] max-h-[120px] rounded-xl resize-none border-[#E5E5E5] focus:border-[#CCCCCC] focus:ring-0 text-sm"
                  disabled={isExtracting}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 mt-3 p-2.5 bg-rose-50 rounded-lg text-rose-700 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <p className="text-[10px] text-[#BBBBBB]">
                  Analyse locale par votre assistant IA
                </p>
                <Button
                  onClick={extractLeadData}
                  disabled={isExtracting || !inputText.trim()}
                  size="sm"
                  className="bg-black hover:bg-black/90 text-white rounded-full h-9 px-4 text-sm font-medium gap-2"
                >
                  {isExtracting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Analyse...
                    </>
                  ) : (
                    <>
                      Créer le lead
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-[15px]">Informations extraites</span>
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium",
                  getConfidenceColor(extractedData.extraction_confidence)
                )}>
                  {extractedData.extraction_confidence === 'high' ? 'Confiance élevée' : extractedData.extraction_confidence === 'medium' ? 'Confiance moyenne' : 'Confiance faible'}
                </span>
              </div>

              <div className="bg-[#FAFAFA] rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-[#999999]" />
                    <div>
                      <p className="text-[10px] text-[#999999]">Nom</p>
                      <p className="text-xs font-medium">
                        {extractedData.first_name || '-'} {extractedData.last_name || '-'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-[#999999]" />
                    <div>
                      <p className="text-[10px] text-[#999999]">Email</p>
                      <p className="text-xs font-medium truncate">{extractedData.email || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#999999]" />
                    <div>
                      <p className="text-[10px] text-[#999999]">Téléphone</p>
                      <p className="text-xs font-medium">{extractedData.phone || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#999999]" />
                    <div>
                      <p className="text-[10px] text-[#999999]">Ville</p>
                      <p className="text-xs font-medium">{extractedData.city || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Home className="w-3.5 h-3.5 text-[#999999]" />
                    <div>
                      <p className="text-[10px] text-[#999999]">Type de bien</p>
                      <p className="text-xs font-medium capitalize">{extractedData.property_type || '-'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Euro className="w-3.5 h-3.5 text-[#999999]" />
                    <div>
                      <p className="text-[10px] text-[#999999]">Budget</p>
                      <p className="text-xs font-medium">
                        {extractedData.budget_min || extractedData.budget_max 
                          ? `${formatPrice(extractedData.budget_min)} - ${formatPrice(extractedData.budget_max)}`
                          : '-'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E5E5E5]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full font-medium capitalize",
                      extractedData.lead_status === 'acheteur' ? 'bg-purple-50 text-purple-700' :
                      extractedData.lead_status === 'vendeur' ? 'bg-orange-50 text-orange-700' :
                      extractedData.lead_status === 'locataire' ? 'bg-teal-50 text-teal-700' :
                      'bg-gray-100 text-gray-600'
                    )}>
                      {getLeadTypeLabel(extractedData.lead_status)}
                    </span>
                  </div>

                  {extractedData.notes && (
                    <div className="flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-[#999999] mt-0.5" />
                      <div>
                        <p className="text-[10px] text-[#999999]">Notes</p>
                        <p className="text-xs text-[#666666]">{extractedData.notes}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={cancelExtraction}
                  size="sm"
                  className="rounded-full h-9 px-4 text-sm"
                >
                  <X className="w-3.5 h-3.5 mr-1.5" />
                  Annuler
                </Button>
                <Button
                  onClick={createLead}
                  size="sm"
                  className="bg-black hover:bg-black/90 text-white rounded-full h-9 px-4 text-sm font-medium"
                >
                  <Check className="w-3.5 h-3.5 mr-1.5" />
                  Confirmer & Créer
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
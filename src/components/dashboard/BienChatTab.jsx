import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { supabase } from '@/api/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { Home, MapPin, Euro, Check, Paperclip, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useChatContext } from '@/contexts/ChatContext';
import ConversationalChat from './ConversationalChat';

const BIEN_SYSTEM_PROMPT = `Tu es l'assistant d'extraction de biens immobiliers de TrouveTonToit.

COMPORTEMENT :
- Quand l'utilisateur te donne une description de bien, extrais les informations
- Si l'utilisateur demande une modification, mets a jour les donnees et confirme
- Tutoie l'utilisateur, sois concis (2-3 phrases max dans le message)
- Si le texte ne contient pas assez d'info, demande des precisions

REPONDS TOUJOURS en JSON valide avec ce format :
{
  "data": {
    "title": "Appartement T3 lumineux",
    "description": "Description complete du bien",
    "price": 285000,
    "city": "Lyon",
    "address": "Rue Example",
    "postal_code": "69003",
    "surface": 72,
    "rooms": 3,
    "bedrooms": 2,
    "bathrooms": 1,
    "property_type": "t3",
    "transaction_type": "vente",
    "energy_class": "C",
    "ges_class": null,
    "amenities": ["balcon", "parking"],
    "floor": null,
    "total_floors": null,
    "year_built": null
  },
  "message": "Ta reponse conversationnelle courte et dynamique",
  "ready": true
}

Pour property_type : studio, t1, t2, t3, t4, t5, maison, villa, loft, terrain
Pour transaction_type : vente, location
Pour amenities : parking, balcon, terrasse, jardin, cave, ascenseur, piscine, garage
"ready" = true si au minimum un titre/type et une ville sont identifies`;

function isURL(text) {
  return text.includes('http') ||
    text.includes('.fr') ||
    text.includes('leboncoin') ||
    text.includes('seloger') ||
    text.includes('pap') ||
    text.includes('iadfrance') ||
    text.includes('iad.fr');
}

function buildAmenities(data) {
  const amenities = [];
  if (data.parking) amenities.push('parking');
  if (data.balcon) amenities.push('balcon');
  if (data.terrasse) amenities.push('terrasse');
  if (data.jardin) amenities.push('jardin');
  if (data.cave) amenities.push('cave');
  if (data.ascenseur) amenities.push('ascenseur');
  if (data.meuble) amenities.push('meuble');
  return amenities;
}

export default function BienChatTab() {
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdBienId, setCreatedBienId] = useState(null);
  const [images, setImages] = useState([]);

  const queryClient = useQueryClient();
  const { setActiveListing, pushAction } = useChatContext();

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      const list = await base44.agents.listConversations('bien_extractor');
      setConversations(list);
    } catch (err) {
      console.error('Failed to load bien conversations:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleSelectConversation = (conv) => {
    setActiveConversationId(conv.id);
    setMessages(conv.messages || []);
    setCreatedBienId(conv.metadata?.createdBienId || null);
    setImages([]);
  };

  const handleNewConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setCreatedBienId(null);
    setImages([]);
  };

  const handleDeleteConversation = async (id) => {
    try {
      await base44.agents.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConversationId === id) handleNewConversation();
      toast.success('Conversation supprimee');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleRenameConversation = async (id, newTitle) => {
    try {
      const conv = conversations.find(c => c.id === id);
      await base44.agents.updateConversation(id, {
        metadata: { ...conv?.metadata, title: newTitle }
      });
      setConversations(prev => prev.map(c =>
        c.id === id ? { ...c, metadata: { ...c.metadata, title: newTitle } } : c
      ));
    } catch {
      toast.error('Erreur lors du renommage');
    }
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    for (const file of files) {
      if (images.length >= 20) break;
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setImages(prev => [...prev, { url: file_url, name: file.name }]);
      } catch (err) {
        toast.error(`Erreur upload: ${file.name}`);
      }
    }
  };

  const handleSendMessage = async (text) => {
    setIsProcessing(true);

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    let convId = activeConversationId;

    try {
      if (!convId) {
        const newConv = await base44.agents.createConversation({
          agent_name: 'bien_extractor',
          metadata: { title: text.substring(0, 50) + (text.length > 50 ? '...' : '') }
        });
        convId = newConv.id;
        setActiveConversationId(convId);
      }

      let assistantMsg;

      if (isURL(text) && updatedMessages.filter(m => m.role === 'user').length === 1) {
        let siteName = 'le site';
        if (text.includes('leboncoin')) siteName = 'LeBonCoin';
        else if (text.includes('seloger')) siteName = 'SeLoger';
        else if (text.includes('pap')) siteName = 'PAP';
        else if (text.includes('iadfrance') || text.includes('iad.fr')) siteName = 'IAD';

        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) throw new Error('Session manquante. Reconnectez-vous puis réessayez.');
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          const res = await fetch(`${supabaseUrl}/functions/v1/scrapeBienImmobilier`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'apikey': anonKey,
            },
            body: JSON.stringify({ url: text.trim() }),
          });
          let scrapedData;
          try {
            scrapedData = await res.json();
          } catch {
            throw new Error(`Réponse invalide (${res.status})`);
          }
          if (!scrapedData?.success) throw new Error(scrapedData?.error || `Erreur ${res.status}`);

          const d = scrapedData.data;
          const propertyData = {
            title: d.titre || `Bien ${d.type_bien || ''} ${d.ville || ''}`.trim(),
            description: d.description || '',
            price: d.prix,
            city: d.ville,
            address: d.ville,
            postal_code: d.code_postal,
            surface: d.surface,
            rooms: d.pieces,
            bedrooms: d.chambres,
            bathrooms: d.salles_bain,
            property_type: d.type_bien || 't3',
            transaction_type: 'vente',
            energy_class: d.dpe || null,
            ges_class: d.ges || null,
            amenities: buildAmenities(d),
            floor: d.etage || null,
            images: d.photos || [],
          };

          assistantMsg = {
            role: 'assistant',
            content: `J'ai recupere les infos depuis ${siteName} ! Voici le bien detecte. Tu peux me demander de modifier des details avant de le creer.`,
            data: { property: propertyData, ready: true, source: 'scraping' },
            timestamp: new Date().toISOString()
          };
        } catch (scrapeErr) {
          const errMsg = scrapeErr?.message || scrapeErr?.error || String(scrapeErr);
          const is401 = errMsg.includes('401') || errMsg.toLowerCase().includes('unauthorized');
          const suggestion = is401
            ? 'Session expiree ? Deconnectez-vous puis reconnectez-vous, puis reessayez.'
            : 'Alternatif : copie le titre, la description, le prix et les caracteristiques de l\'annonce, colle-les ici et je creerai la fiche.';
          assistantMsg = {
            role: 'assistant',
            content: `Erreur extraction : ${errMsg.slice(0, 150)}${errMsg.length > 150 ? '...' : ''}\n\n${suggestion}`,
            timestamp: new Date().toISOString()
          };
        }
      } else {
        const openaiMessages = [
          { role: 'system', content: BIEN_SYSTEM_PROMPT },
          ...updatedMessages.map(m => {
            if (m.role === 'assistant' && m.data) {
              return { role: 'assistant', content: JSON.stringify({ data: m.data.property, message: m.content, ready: m.data.ready }) };
            }
            return { role: m.role, content: m.content };
          }),
        ];

        const aiContent = await base44.integrations.Core.InvokeLLM({
          messages: openaiMessages,
          response_json_schema: { type: 'object' },
        });

        let parsed;
        if (typeof aiContent === 'string') {
          try { parsed = JSON.parse(aiContent); } catch { parsed = { data: null, message: aiContent, ready: false }; }
        } else {
          parsed = aiContent;
        }

        assistantMsg = {
          role: 'assistant',
          content: parsed.message || "J'ai analyse la description.",
          data: parsed.data ? { property: parsed.data, ready: parsed.ready !== false } : null,
          timestamp: new Date().toISOString()
        };
      }

      const allMessages = [...updatedMessages, assistantMsg];
      setMessages(allMessages);

      await base44.agents.updateConversation(convId, { messages: allMessages });

      setConversations(prev => {
        const exists = prev.find(c => c.id === convId);
        if (exists) {
          return prev.map(c => c.id === convId ? { ...c, messages: allMessages, updated_date: new Date().toISOString() } : c);
        }
        return [{
          id: convId, agent_name: 'bien_extractor',
          metadata: { title: text.substring(0, 50) },
          messages: allMessages,
          created_date: new Date().toISOString(),
          updated_date: new Date().toISOString()
        }, ...prev];
      });
    } catch (err) {
      console.error('Bien chat error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "Desole, une erreur s'est produite. Reessaye dans un instant.",
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateBien = async (propertyData) => {
    try {
      const d = propertyData;
      const listing = await base44.entities.Listing.create({
        title: d.title || 'Nouveau bien',
        description: d.description || '',
        city: d.city || '',
        address: d.address || '',
        postal_code: d.postal_code || '',
        price: d.price || 0,
        surface: d.surface || null,
        rooms: d.rooms || null,
        bedrooms: d.bedrooms || null,
        bathrooms: d.bathrooms || null,
        property_type: d.property_type || '',
        transaction_type: d.transaction_type || 'vente',
        energy_class: d.energy_class || null,
        ges_class: d.ges_class || null,
        amenities: d.amenities || [],
        floor: d.floor || null,
        total_floors: d.total_floors || null,
        images: [...(d.images || []), ...images.map(img => img.url)],
        status: 'brouillon',
      });

      queryClient.invalidateQueries({ queryKey: ['listings'] });
      setCreatedBienId(listing.id);
      setActiveListing(listing);
      pushAction({ type: 'listing_created', listing });

      if (activeConversationId) {
        const conv = conversations.find(c => c.id === activeConversationId);
        await base44.agents.updateConversation(activeConversationId, {
          metadata: { ...conv?.metadata, createdBienId: listing.id, status: 'created' }
        });
      }

      toast.success('Bien cree avec succes !');
    } catch (err) {
      console.error('Create bien error:', err);
      toast.error('Erreur lors de la creation du bien');
    }
  };

  const formatPrice = (price) => {
    if (!price) return '-';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
  };

  const renderMessageExtra = (msg, msgIdx) => {
    if (msg.role !== 'assistant' || !msg.data?.property) return null;

    const isLastDataMsg = (() => {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant' && messages[i].data?.property) {
          return i === msgIdx;
        }
      }
      return false;
    })();

    if (!isLastDataMsg) return null;

    const d = msg.data.property;
    const hasPhoto = d.images && d.images.length > 0;

    return (
      <div className="mt-2 ml-0 max-w-[85%]">
        <div className="bg-white border-l-4 border-[#095237] rounded-lg shadow-sm overflow-hidden">
          {hasPhoto && (
            <div className="w-full h-40 overflow-hidden">
              <img src={d.images[0]} alt={d.title} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-3.5 space-y-2">
            <h4 className="text-sm font-semibold text-[#111827]">{d.title || 'Bien immobilier'}</h4>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6B7280]">
              {d.city && (
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {d.city} {d.postal_code || ''}</span>
              )}
              {d.price > 0 && (
                <span className="flex items-center gap-1 font-semibold text-[#111827]"><Euro className="w-3 h-3 text-[#6B7280]" /> {formatPrice(d.price)}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6B7280]">
              {d.property_type && (
                <span className="flex items-center gap-1"><Home className="w-3 h-3" /> <span className="capitalize">{d.property_type}</span></span>
              )}
              {d.surface && <span>{d.surface} m²</span>}
              {d.rooms && <span>{d.rooms} p.</span>}
              {d.bedrooms && <span>{d.bedrooms} ch.</span>}
            </div>

            {d.energy_class && (
              <div className="text-xs text-[#6B7280]">
                DPE: {d.energy_class}
                {d.ges_class && ` · GES: ${d.ges_class}`}
              </div>
            )}

            {d.amenities && d.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {d.amenities.map((a, i) => (
                  <span key={i} className="px-2 py-0.5 bg-[#F3F4F6] rounded text-[11px] text-[#6B7280] capitalize">{a}</span>
                ))}
              </div>
            )}

            {hasPhoto && d.images.length > 1 && (
              <p className="text-[11px] text-[#9CA3AF]">{d.images.length} photos</p>
            )}

            <div className="pt-1.5">
              {createdBienId ? (
                <div className="flex gap-2">
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                    <Check className="w-3 h-3" /> Cree dans le CRM
                  </span>
                  <Link to={createPageUrl(`ListingDetail?id=${createdBienId}`)}>
                    <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg border-[#E5E7EB] px-3">
                      Voir la fiche
                    </Button>
                  </Link>
                </div>
              ) : (
                <Button
                  onClick={(e) => { e.stopPropagation(); handleCreateBien(d); }}
                  size="sm"
                  className="h-7 text-xs bg-[#095237] hover:bg-[#074029] text-white rounded-lg px-3"
                >
                  <Home className="w-3 h-3 mr-1" /> Creer le bien
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const imagePreview = images.length > 0 ? (
    <div className="flex gap-1.5 px-3 py-2 border-t border-[#E5E7EB] bg-[#F9FAFB]">
      {images.map((img, idx) => (
        <div key={idx} className="relative w-12 h-12 rounded-lg overflow-hidden group flex-shrink-0">
          <img src={img.url} alt="" className="w-full h-full object-cover" />
          <button
            onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      ))}
    </div>
  ) : null;

  return (
    <ConversationalChat
      conversations={conversations}
      loadingConversations={loadingConversations}
      activeConversationId={activeConversationId}
      onSelectConversation={handleSelectConversation}
      onNewConversation={handleNewConversation}
      onDeleteConversation={handleDeleteConversation}
      onRenameConversation={handleRenameConversation}
      messages={messages}
      isProcessing={isProcessing}
      onSendMessage={handleSendMessage}
      renderMessageExtra={renderMessageExtra}
      placeholderPrompts={useMemo(() => [
        "T3 lumineux Lyon 3e, 72m², 285 000€, balcon",
        "Colle le texte ou une URL LeBonCoin, SeLoger, PAP",
        "Maison 5 pièces avec jardin à Bordeaux",
        "Appartement 45m² Paris 11e, 420 000€",
        "Annonce SeLoger ou LeBonCoin à coller ici",
        "Villa 4 chambres, piscine, Côte d'Azur",
        "Studio meublé centre-ville Lyon, 650€/mois",
        "T4 avec terrasse, 95m², Rennes",
        "Description libre d'un bien à ajouter",
        "URL annonce immobilière à analyser",
      ], [])}
      inputPlaceholder="Colle une annonce, URL ou description de bien..."
      inputPrefix={
        <label className="flex-shrink-0 h-11 w-11 rounded-xl hover:bg-[#F3F4F6] cursor-pointer transition-colors flex items-center justify-center border border-[#E5E7EB]">
          <Paperclip className="w-4 h-4 text-[#6B7280]" />
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      }
      renderAboveInput={imagePreview}
    />
  );
}

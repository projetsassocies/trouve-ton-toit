import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ExternalLink, 
  Save, 
  Plus, 
  Trash2, 
  Upload,
  GripVertical,
  QrCode,
  Phone,
  Mail,
  Image as ImageIcon,
  Loader2,
  User,
  Palette,
  Link as LinkIcon,
  Home,
  Eye,
  EyeOff,
  Download,
  MapPin,
  Briefcase,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from '@/components/ui/checkbox';

const PRESET_THEMES = [
  { label: 'Classique', colors: { primary: '#000000', accent: '#4a4a4a', background: '#ffffff' } },
  { label: 'Bleu', colors: { primary: '#0f4c81', accent: '#d1e8ff', background: '#f3f8ff' } },
  { label: 'Vert', colors: { primary: '#15803d', accent: '#4ade80', background: '#f0fdf4' } },
  { label: 'Violet', colors: { primary: '#7c3aed', accent: '#c4b5fd', background: '#f5f3ff' } },
  { label: 'Orange', colors: { primary: '#ea580c', accent: '#fed7aa', background: '#fff7ed' } },
  { label: 'Rose', colors: { primary: '#db2777', accent: '#fbcfe8', background: '#fdf2f8' } },
];

export default function SocialBuilder() {
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [showPropertyDialog, setShowPropertyDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    display_name: '',
    profession: '',
    zone: '',
    bio: '',
    profile_picture: '',
    phone: '',
    email: '',
    primary_color: '#000000',
    accent_color: '#4ade80',
    background_color: '#f8f9fa',
    custom_links: [],
    featured_listings: [],
    qr_label: 'Scannez pour voir mes biens',
    qr_color: '#000000',
    qr_background: '#FFFFFF',
    qr_logo: '',
    cta_button_text: 'Prendre contact avec',
    form_fields: {
      first_name: { enabled: true, required: true, label: 'Prénom' },
      last_name: { enabled: true, required: true, label: 'Nom' },
      email: { enabled: true, required: true, label: 'Email' },
      phone: { enabled: true, required: false, label: 'Téléphone' },
      property_type: { enabled: true, required: false, label: 'Type de bien' },
      city: { enabled: true, required: false, label: 'Ville' },
      budget: { enabled: true, required: false, label: 'Budget' },
      notes: { enabled: true, required: false, label: 'Message' }
    }
  });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['social-config'],
    queryFn: () => base44.entities.SocialPageConfig.list(),
  });

  const { data: allListings = [] } = useQuery({
    queryKey: ['all-listings'],
    queryFn: () => base44.entities.Listing.list('-created_date'),
  });

  const existingConfig = configs[0];

  useEffect(() => {
    if (existingConfig) {
      setFormData({
        display_name: existingConfig.display_name || '',
        profession: existingConfig.profession || '',
        zone: existingConfig.zone || '',
        bio: existingConfig.bio || '',
        profile_picture: existingConfig.profile_picture || '',
        phone: existingConfig.phone || '',
        email: existingConfig.email || '',
        primary_color: existingConfig.primary_color || '#000000',
        accent_color: existingConfig.accent_color || '#4ade80',
        background_color: existingConfig.background_color || '#f8f9fa',
        custom_links: existingConfig.custom_links || [],
        featured_listings: existingConfig.featured_listings || [],
        qr_label: existingConfig.qr_label || 'Scannez pour voir mes biens',
        qr_color: existingConfig.qr_color || '#000000',
        qr_background: existingConfig.qr_background || '#FFFFFF',
        qr_logo: existingConfig.qr_logo || '',
        cta_button_text: existingConfig.cta_button_text || 'Prendre contact avec',
        form_fields: existingConfig.form_fields || {
          first_name: { enabled: true, required: true, label: 'Prénom' },
          last_name: { enabled: true, required: true, label: 'Nom' },
          email: { enabled: true, required: true, label: 'Email' },
          phone: { enabled: true, required: false, label: 'Téléphone' },
          property_type: { enabled: true, required: false, label: 'Type de bien' },
          city: { enabled: true, required: false, label: 'Ville' },
          budget: { enabled: true, required: false, label: 'Budget' },
          notes: { enabled: true, required: false, label: 'Message' }
        }
      });
    }
  }, [existingConfig]);

  // Generate QR Code
  useEffect(() => {
    generateQRCode();
  }, [formData.qr_color, formData.qr_background, formData.qr_logo]);

  const generateQRCode = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const size = 200;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = formData.qr_background;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = formData.qr_color;
    
    const moduleSize = 8;
    const modules = Math.floor(size / moduleSize);
    const margin = 2;

    const drawPositionPattern = (x, y) => {
      ctx.fillRect(x * moduleSize, y * moduleSize, 7 * moduleSize, 7 * moduleSize);
      ctx.fillStyle = formData.qr_background;
      ctx.fillRect((x + 1) * moduleSize, (y + 1) * moduleSize, 5 * moduleSize, 5 * moduleSize);
      ctx.fillStyle = formData.qr_color;
      ctx.fillRect((x + 2) * moduleSize, (y + 2) * moduleSize, 3 * moduleSize, 3 * moduleSize);
    };

    drawPositionPattern(margin, margin);
    drawPositionPattern(modules - 9, margin);
    drawPositionPattern(margin, modules - 9);

    const seed = 12345;
    for (let y = margin; y < modules - margin; y++) {
      for (let x = margin; x < modules - margin; x++) {
        if ((x < margin + 8 && y < margin + 8) ||
            (x > modules - margin - 9 && y < margin + 8) ||
            (x < margin + 8 && y > modules - margin - 9)) {
          continue;
        }
        
        const centerStart = Math.floor(modules / 2) - 3;
        const centerEnd = Math.floor(modules / 2) + 3;
        if (x >= centerStart && x <= centerEnd && y >= centerStart && y <= centerEnd) {
          continue;
        }

        if ((seed * (x + 1) * (y + 1)) % 3 === 0) {
          ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
        }
      }
    }

    if (formData.qr_logo) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const logoSize = 40;
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.roundRect(logoX - 4, logoY - 4, logoSize + 8, logoSize + 8, 6);
        ctx.fill();
        
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(logoX, logoY, logoSize, logoSize, 4);
        ctx.clip();
        ctx.drawImage(img, logoX, logoY, logoSize, logoSize);
        ctx.restore();
      };
      img.src = formData.qr_logo;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (existingConfig) {
        return base44.entities.SocialPageConfig.update(existingConfig.id, data);
      } else {
        return base44.entities.SocialPageConfig.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-config'] });
      toast.success('Modifications enregistrées');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const result = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, profile_picture: result.file_url }));
    setUploading(false);
  };

  const addLink = () => {
    setFormData(prev => ({
      ...prev,
      custom_links: [...prev.custom_links, { title: '', url: '', visible: true }]
    }));
  };

  const removeLink = (index) => {
    setFormData(prev => ({
      ...prev,
      custom_links: prev.custom_links.filter((_, i) => i !== index)
    }));
  };

  const updateLink = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      custom_links: prev.custom_links.map((link, i) => 
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  const applyTheme = (theme) => {
    setFormData(prev => ({
      ...prev,
      primary_color: theme.colors.primary,
      accent_color: theme.colors.accent,
      background_color: theme.colors.background,
    }));
  };

  const toggleFeaturedListing = (listingId) => {
    setFormData(prev => ({
      ...prev,
      featured_listings: prev.featured_listings.includes(listingId)
        ? prev.featured_listings.filter(id => id !== listingId)
        : [...prev.featured_listings, listingId]
    }));
  };

  const downloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'mon-qrcode.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast.success('QR Code téléchargé');
  };

  const featuredListingsData = allListings.filter(l => formData.featured_listings.includes(l.id));

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[800px] rounded-2xl" />
          <Skeleton className="h-[800px] rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Social Page Builder</h1>
          <p className="text-[#999999] mt-1">Personnalisez votre page publique</p>
        </div>
        <div className="flex gap-3">
          <Link to={createPageUrl('SocialPage')} target="_blank">
            <Button variant="outline" className="rounded-xl">
              <ExternalLink className="w-4 h-4 mr-2" />
              Voir ma page
            </Button>
          </Link>
          <Button 
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-black hover:bg-black/90 text-white rounded-xl"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor - 45% */}
        <div className="lg:col-span-5 space-y-4">
          <Accordion type="multiple" defaultValue={['profile', 'colors', 'links']} className="space-y-4">
            {/* Profile Section */}
            <AccordionItem value="profile" className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <User className="w-4 h-4 text-[#666666]" />
                  </div>
                  <span className="font-semibold">Profil</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                {/* Profile Picture */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="relative">
                    {formData.profile_picture ? (
                      <img 
                        src={formData.profile_picture} 
                        alt="Profile" 
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E5E5E5] to-[#F5F5F5] flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-[#CCCCCC]" />
                      </div>
                    )}
                    <label className={cn(
                      "absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-black text-white flex items-center justify-center cursor-pointer hover:bg-black/80 transition-colors",
                      uploading && "opacity-50 pointer-events-none"
                    )}>
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Photo de profil</p>
                    <p className="text-xs text-[#999999] mt-1">Format carré recommandé</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-[#999999] mb-1.5 block">Nom complet</Label>
                    <Input
                      value={formData.display_name}
                      onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                      placeholder="Jean Dupont"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-[#999999] mb-1.5 block">Profession</Label>
                      <Input
                        value={formData.profession}
                        onChange={(e) => setFormData({...formData, profession: e.target.value})}
                        placeholder="Agent immobilier"
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-[#999999] mb-1.5 block">Zone d'activité</Label>
                      <Input
                        value={formData.zone}
                        onChange={(e) => setFormData({...formData, zone: e.target.value})}
                        placeholder="Paris & IDF"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-[#999999] mb-1.5 block">Biographie</Label>
                    <Textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      placeholder="Votre parcours, spécialités..."
                      className="rounded-xl min-h-20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-[#999999] mb-1.5 block flex items-center gap-1">
                        <Phone className="w-3 h-3" /> Téléphone
                      </Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="+33 6 00 00 00 00"
                        className="rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-sm text-[#999999] mb-1.5 block flex items-center gap-1">
                        <Mail className="w-3 h-3" /> Email
                      </Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="contact@email.com"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Colors Section */}
            <AccordionItem value="colors" className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <Palette className="w-4 h-4 text-[#666666]" />
                  </div>
                  <span className="font-semibold">Couleurs & Thème</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                {/* Preset Themes */}
                <Label className="text-sm text-[#999999] mb-3 block">Thèmes prédéfinis</Label>
                <div className="grid grid-cols-3 gap-2 mb-6">
                  {PRESET_THEMES.map((theme, index) => (
                    <button
                      key={index}
                      onClick={() => applyTheme(theme)}
                      className={cn(
                        "p-3 rounded-xl border-2 transition-all text-left",
                        formData.primary_color === theme.colors.primary &&
                        formData.background_color === theme.colors.background
                          ? "border-black"
                          : "border-transparent hover:border-[#E5E5E5]"
                      )}
                      style={{ backgroundColor: theme.colors.background }}
                    >
                      <div className="flex gap-1.5 mb-2">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
                      </div>
                      <span className="text-xs font-medium">{theme.label}</span>
                    </button>
                  ))}
                </div>

                {/* Custom Colors */}
                <Label className="text-sm text-[#999999] mb-3 block">Couleurs personnalisées</Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                      className="w-10 h-10 rounded-lg border border-[#E5E5E5] cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Couleur principale</p>
                      <p className="text-xs text-[#999999]">Boutons et accents</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.accent_color}
                      onChange={(e) => setFormData({...formData, accent_color: e.target.value})}
                      className="w-10 h-10 rounded-lg border border-[#E5E5E5] cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Couleur d'accent</p>
                      <p className="text-xs text-[#999999]">Badges et highlights</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.background_color}
                      onChange={(e) => setFormData({...formData, background_color: e.target.value})}
                      className="w-10 h-10 rounded-lg border border-[#E5E5E5] cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Couleur de fond</p>
                      <p className="text-xs text-[#999999]">Arrière-plan de la page</p>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Links Section */}
            <AccordionItem value="links" className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <LinkIcon className="w-4 h-4 text-[#666666]" />
                  </div>
                  <span className="font-semibold">Liens personnalisés</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                {formData.custom_links.length === 0 ? (
                  <div className="text-center py-6 bg-[#FAFAFA] rounded-xl mb-4">
                    <p className="text-sm text-[#999999]">Aucun lien ajouté</p>
                  </div>
                ) : (
                  <div className="space-y-3 mb-4">
                    {formData.custom_links.map((link, index) => (
                      <div key={index} className="p-3 bg-[#FAFAFA] rounded-xl">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <Input
                              value={link.title}
                              onChange={(e) => updateLink(index, 'title', e.target.value)}
                              placeholder="Titre du lien"
                              className="rounded-lg h-9 text-sm"
                            />
                            <Input
                              value={link.url}
                              onChange={(e) => updateLink(index, 'url', e.target.value)}
                              placeholder="https://..."
                              className="rounded-lg h-9 text-sm"
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLink(index)}
                            className="h-9 w-9 text-[#999999] hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[#E5E5E5]">
                          <Switch
                            checked={link.visible !== false}
                            onCheckedChange={(checked) => updateLink(index, 'visible', checked)}
                          />
                          <span className="text-xs text-[#999999]">
                            {link.visible !== false ? 'Visible' : 'Masqué'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Button 
                  variant="outline" 
                  onClick={addLink}
                  className="w-full rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un lien
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Featured Properties Section */}
            <AccordionItem value="properties" className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <Home className="w-4 h-4 text-[#666666]" />
                  </div>
                  <span className="font-semibold">Biens mis en avant</span>
                  {formData.featured_listings.length > 0 && (
                    <span className="text-xs bg-[#F5F5F5] px-2 py-0.5 rounded-full">
                      {formData.featured_listings.length}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-sm text-[#999999] mb-4">
                  Sélectionnez les biens à afficher sur votre page sociale.
                </p>
                
                {featuredListingsData.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {featuredListingsData.map((listing) => (
                      <div key={listing.id} className="flex items-center gap-3 p-2 bg-[#FAFAFA] rounded-xl">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#E5E5E5] flex-shrink-0">
                          {listing.images?.[0] ? (
                            <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="w-4 h-4 text-[#CCCCCC]" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{listing.title}</p>
                          <p className="text-xs text-[#999999]">{formatPrice(listing.price)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleFeaturedListing(listing.id)}
                          className="h-8 w-8 text-[#999999] hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button 
                  variant="outline" 
                  onClick={() => setShowPropertyDialog(true)}
                  className="w-full rounded-xl"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un bien
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Form Configuration Section */}
            <AccordionItem value="form" className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <User className="w-4 h-4 text-[#666666]" />
                  </div>
                  <span className="font-semibold">Formulaire de contact</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-sm text-[#999999] mb-4">
                  Configurez les champs du formulaire que vos prospects rempliront.
                </p>

                <div className="space-y-3">
                  {Object.entries(formData.form_fields).map(([fieldKey, fieldConfig]) => (
                    <div key={fieldKey} className="p-3 bg-[#FAFAFA] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={fieldConfig.enabled}
                            onCheckedChange={(checked) => {
                              setFormData(prev => ({
                                ...prev,
                                form_fields: {
                                  ...prev.form_fields,
                                  [fieldKey]: { ...fieldConfig, enabled: checked }
                                }
                              }));
                            }}
                          />
                          <span className="text-sm font-medium capitalize">
                            {fieldConfig.label}
                          </span>
                        </div>
                        {fieldConfig.enabled && (
                          <label className="flex items-center gap-2 text-xs text-[#666666]">
                            <input
                              type="checkbox"
                              checked={fieldConfig.required}
                              onChange={(e) => {
                                setFormData(prev => ({
                                  ...prev,
                                  form_fields: {
                                    ...prev.form_fields,
                                    [fieldKey]: { ...fieldConfig, required: e.target.checked }
                                  }
                                }));
                              }}
                              className="rounded"
                            />
                            Obligatoire
                          </label>
                        )}
                      </div>
                      {fieldConfig.enabled && (
                        <Input
                          value={fieldConfig.label}
                          onChange={(e) => {
                            setFormData(prev => ({
                              ...prev,
                              form_fields: {
                                ...prev.form_fields,
                                [fieldKey]: { ...fieldConfig, label: e.target.value }
                              }
                            }));
                          }}
                          placeholder="Libellé du champ"
                          className="rounded-lg text-sm h-8 mt-2"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-[#E5E5E5]">
                  <Label className="text-sm text-[#999999] mb-1.5 block">Texte du bouton</Label>
                  <Input
                    value={formData.cta_button_text}
                    onChange={(e) => setFormData({...formData, cta_button_text: e.target.value})}
                    placeholder="Prendre contact avec"
                    className="rounded-xl"
                  />
                  <p className="text-xs text-[#999999] mt-1">
                    Le prénom de l'agent sera automatiquement ajouté après ce texte
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* QR Code Section */}
            <AccordionItem value="qr" className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#F5F5F5] flex items-center justify-center">
                    <QrCode className="w-4 h-4 text-[#666666]" />
                  </div>
                  <span className="font-semibold">QR Code Unique</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <p className="text-sm text-[#999999] mb-4">
                  Personnalisez votre QR code lié à votre Social Page.
                </p>
                
                <div className="flex justify-center mb-4">
                  <div 
                    className="p-4 rounded-xl"
                    style={{ backgroundColor: formData.qr_background }}
                  >
                    <canvas ref={canvasRef} className="rounded-lg" />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-[#999999] mb-1.5 block">Texte sous le QR code</Label>
                    <Input
                      value={formData.qr_label}
                      onChange={(e) => setFormData({...formData, qr_label: e.target.value})}
                      placeholder="Scannez pour voir mes biens"
                      className="rounded-xl"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm text-[#999999] mb-1.5 block">Couleur QR</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.qr_color}
                          onChange={(e) => setFormData({...formData, qr_color: e.target.value})}
                          className="w-10 h-10 rounded-lg border border-[#E5E5E5] cursor-pointer"
                        />
                        <Input
                          value={formData.qr_color}
                          onChange={(e) => setFormData({...formData, qr_color: e.target.value})}
                          className="rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-[#999999] mb-1.5 block">Fond QR</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={formData.qr_background}
                          onChange={(e) => setFormData({...formData, qr_background: e.target.value})}
                          className="w-10 h-10 rounded-lg border border-[#E5E5E5] cursor-pointer"
                        />
                        <Input
                          value={formData.qr_background}
                          onChange={(e) => setFormData({...formData, qr_background: e.target.value})}
                          className="rounded-xl font-mono text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={downloadQR}
                    className="w-full rounded-xl"
                    style={{ backgroundColor: formData.primary_color }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger le QR code
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Live Preview - 55% Mobile Frame */}
        <div className="lg:col-span-7 lg:sticky lg:top-6 h-fit flex justify-center">
          <div className="relative">
            {/* Phone Frame */}
            <div className="w-[375px] bg-[#1a1a1a] rounded-[3rem] p-3 shadow-2xl">
              {/* Top Notch */}
              <div className="h-7 bg-black rounded-t-[2.5rem] relative flex items-center justify-center">
                <div className="w-32 h-6 bg-[#1a1a1a] rounded-full" />
              </div>
              
              {/* Screen */}
              <div 
                className="rounded-2xl overflow-hidden shadow-inner"
                style={{ 
                  height: '667px',
                  backgroundColor: formData.background_color 
                }}
              >
                <SocialPagePreviewLive config={formData} listings={featuredListingsData} />
              </div>
              
              {/* Bottom Home Indicator */}
              <div className="h-6 bg-black rounded-b-[2.5rem] flex items-center justify-center">
                <div className="w-32 h-1 bg-white/30 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Property Selection Dialog */}
      <Dialog open={showPropertyDialog} onOpenChange={setShowPropertyDialog}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Sélectionner des biens</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {allListings.length === 0 ? (
              <p className="text-center py-8 text-[#999999]">Aucun bien disponible</p>
            ) : (
              allListings.map((listing) => (
                <button
                  key={listing.id}
                  onClick={() => toggleFeaturedListing(listing.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                    formData.featured_listings.includes(listing.id)
                      ? "border-black bg-[#F5F5F5]"
                      : "border-transparent hover:bg-[#FAFAFA]"
                  )}
                >
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#E5E5E5] flex-shrink-0">
                    {listing.images?.[0] ? (
                      <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-5 h-5 text-[#CCCCCC]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{listing.title}</p>
                    <p className="text-sm text-[#999999]">{listing.city} • {formatPrice(listing.price)}</p>
                  </div>
                  {formData.featured_listings.includes(listing.id) && (
                    <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
          <Button onClick={() => setShowPropertyDialog(false)} className="w-full rounded-xl">
            Terminé
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Inline Preview Component
function SocialPagePreviewLive({ config, listings }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  const visibleLinks = config.custom_links?.filter(l => l.visible !== false && l.title && l.url) || [];

  return (
    <div className="max-h-[650px] overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-8 text-center" style={{ backgroundColor: config.background_color }}>
        {/* Avatar */}
        {config.profile_picture ? (
          <img 
            src={config.profile_picture} 
            alt="Profile" 
            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover shadow-lg"
          />
        ) : (
          <div 
            className="w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
            style={{ backgroundColor: config.accent_color }}
          >
            <span className="text-3xl font-semibold" style={{ color: config.primary_color }}>
              {config.display_name?.[0]?.toUpperCase() || 'A'}
            </span>
          </div>
        )}
        
        <h1 className="text-xl font-semibold" style={{ color: config.primary_color }}>
          {config.display_name || 'Votre nom'}
        </h1>
        
        {config.profession && (
          <p className="text-sm mt-1 flex items-center justify-center gap-1" style={{ color: config.primary_color, opacity: 0.7 }}>
            <Briefcase className="w-3.5 h-3.5" />
            {config.profession}
          </p>
        )}
        
        {config.zone && (
          <p className="text-sm mt-1 flex items-center justify-center gap-1" style={{ color: config.primary_color, opacity: 0.6 }}>
            <MapPin className="w-3.5 h-3.5" />
            {config.zone}
          </p>
        )}
        
        {config.bio && (
          <p className="text-sm mt-3 max-w-xs mx-auto" style={{ color: config.primary_color, opacity: 0.7 }}>
            {config.bio}
          </p>
        )}

        {/* Lead Capture CTA */}
        <div className="flex flex-col items-center">
          <button
            className="flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold text-white shadow-lg mt-4"
            style={{ backgroundColor: config.primary_color }}
          >
            {config.cta_button_text || 'Prendre contact avec'} {config.display_name?.split(' ')[0] || 'moi'}
          </button>
          <p className="text-xs mt-2" style={{ color: config.primary_color, opacity: 0.5 }}>
            Trouvez le bien de vos rêves en quelques clics
          </p>
        </div>
      </div>

      {/* Custom Links */}
      {visibleLinks.length > 0 && (
        <div className="px-4 py-4 space-y-2">
          {visibleLinks.map((link, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'white', color: config.primary_color }}
            >
              {link.title}
              <ExternalLink className="w-3.5 h-3.5 opacity-40" />
            </div>
          ))}
        </div>
      )}

      {/* Listings */}
      {listings.length > 0 && (
        <div className="px-4 py-4">
          <h2 className="text-sm font-semibold mb-3" style={{ color: config.primary_color }}>
            Mes biens
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {listings.slice(0, 4).map((listing) => (
              <div
                key={listing.id}
                className="bg-white rounded-xl overflow-hidden shadow-sm"
              >
                <div className="aspect-[4/3] bg-[#F5F5F5]">
                  {listing.images?.[0] ? (
                    <img 
                      src={listing.images[0]} 
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-6 h-6 text-[#CCCCCC]" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate" style={{ color: config.primary_color }}>
                    {listing.title}
                  </p>
                  <p className="text-xs opacity-60" style={{ color: config.primary_color }}>
                    {listing.city}
                  </p>
                  <p className="text-sm font-semibold mt-1" style={{ color: config.primary_color }}>
                    {formatPrice(listing.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Section Preview */}
      {config.qr_label && (
        <div className="px-4 py-6 text-center">
          <div 
            className="inline-block p-3 rounded-xl mb-2"
            style={{ backgroundColor: config.qr_background }}
          >
            <QrCode className="w-16 h-16" style={{ color: config.qr_color }} />
          </div>
          <p className="text-xs" style={{ color: config.primary_color, opacity: 0.6 }}>
            {config.qr_label}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-4 text-center border-t" style={{ borderColor: config.accent_color }}>
        <p className="text-xs" style={{ color: config.primary_color, opacity: 0.4 }}>
          Propulsé par <span className="font-semibold">TrouveTonToit</span>
        </p>
      </div>
    </div>
  );
}
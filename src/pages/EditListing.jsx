import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PROPERTY_TYPES = [
  { value: 'studio', label: 'Studio' },
  { value: 't2', label: 'T2' },
  { value: 't3', label: 'T3' },
  { value: 't4', label: 'T4' },
  { value: 'maison', label: 'Maison' },
  { value: 'loft', label: 'Loft' },
];

const AMENITIES = [
  { value: 'parking', label: 'Parking' },
  { value: 'ascenseur', label: 'Ascenseur' },
  { value: 'balcon', label: 'Balcon' },
  { value: 'jardin', label: 'Jardin' },
  { value: 'meuble', label: 'Meublé' },
  { value: 'cave', label: 'Cave' },
  { value: 'terrasse', label: 'Terrasse' },
  { value: 'piscine', label: 'Piscine' },
];

export default function EditListing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get('id');
  
  const [formData, setFormData] = useState({
    title: '',
    transaction_type: '',
    price: '',
    surface: '',
    city: '',
    address: '',
    postal_code: '',
    status: 'brouillon',
    property_type: '',
    rooms: '',
    bedrooms: '',
    bathrooms: '',
    amenities: [],
    description: '',
    images: [],
    featured: false,
  });

  const [uploading, setUploading] = useState(false);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const listings = await api.entities.Listing.filter({ id: listingId });
      return listings[0];
    },
    enabled: !!listingId,
  });

  useEffect(() => {
    if (listing) {
      setFormData({
        title: listing.title || '',
        transaction_type: listing.transaction_type || '',
        price: listing.price?.toString() || '',
        surface: listing.surface?.toString() || '',
        city: listing.city || '',
        address: listing.address || '',
        postal_code: listing.postal_code || '',
        status: listing.status || 'brouillon',
        property_type: listing.property_type || '',
        rooms: listing.rooms?.toString() || '',
        bedrooms: listing.bedrooms?.toString() || '',
        bathrooms: listing.bathrooms?.toString() || '',
        amenities: listing.amenities || [],
        description: listing.description || '',
        images: listing.images || [],
        featured: listing.featured || false,
      });
    }
  }, [listing]);

  const updateMutation = useMutation({
    mutationFn: (data) => api.entities.Listing.update(listingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      toast.success('Bien modifié');
      navigate(createPageUrl(`ListingDetail?id=${listingId}`));
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const { featured, ...rest } = formData;
    const data = {
      ...rest,
      price: rest.price ? Number(rest.price) : undefined,
      surface: rest.surface ? Number(rest.surface) : undefined,
      rooms: rest.rooms ? Number(rest.rooms) : undefined,
      bedrooms: rest.bedrooms ? Number(rest.bedrooms) : undefined,
      bathrooms: rest.bathrooms ? Number(rest.bathrooms) : undefined,
    };
    updateMutation.mutate(data);
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    
    const uploadPromises = files.map(async (file) => {
      const result = await api.integrations.Core.UploadFile({ file });
      return result.file_url;
    });

    const urls = await Promise.all(uploadPromises);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...urls]
    }));
    setUploading(false);
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const toggleAmenity = (amenity) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <p className="text-[#999999]">Bien non trouvé</p>
        <Link to={createPageUrl('Listings')}>
          <Button variant="outline" className="mt-4 rounded-xl">
            Retour aux biens
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl(`ListingDetail?id=${listingId}`)}>
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Modifier le bien</h1>
          <p className="text-[#999999] text-sm mt-0.5">Modifiez les informations du bien</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <h2 className="font-semibold mb-4">Informations générales</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#999999] mb-1.5 block">Titre du bien *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                placeholder="Ex: Appartement T3 lumineux centre-ville"
                required
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Prix (€) *</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  placeholder="250000"
                  required
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Surface (m²)</label>
                <Input
                  type="number"
                  value={formData.surface}
                  onChange={(e) => setFormData({...formData, surface: e.target.value})}
                  placeholder="75"
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Type de transaction *</label>
                <Select 
                  value={formData.transaction_type} 
                  onValueChange={(v) => setFormData({...formData, transaction_type: v})}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vente">À vendre</SelectItem>
                    <SelectItem value="location">À louer</SelectItem>
                  </SelectContent>
                </Select>
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
                    {PROPERTY_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <SelectItem value="brouillon">Brouillon</SelectItem>
                    <SelectItem value="en_cours">En cours</SelectItem>
                    <SelectItem value="publie">Publié</SelectItem>
                    <SelectItem value="vendu">Vendu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <h2 className="font-semibold mb-4">Localisation</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#999999] mb-1.5 block">Adresse</label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                placeholder="12 rue de la Paix"
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Ville *</label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="Paris"
                  required
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm text-[#999999] mb-1.5 block">Code postal</label>
                <Input
                  value={formData.postal_code}
                  onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                  placeholder="75001"
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Characteristics */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <h2 className="font-semibold mb-4">Caractéristiques</h2>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div>
              <label className="text-sm text-[#999999] mb-1.5 block">Pièces</label>
              <Input
                type="number"
                value={formData.rooms}
                onChange={(e) => setFormData({...formData, rooms: e.target.value})}
                placeholder="4"
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm text-[#999999] mb-1.5 block">Chambres</label>
              <Input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({...formData, bedrooms: e.target.value})}
                placeholder="2"
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm text-[#999999] mb-1.5 block">Sdb</label>
              <Input
                type="number"
                value={formData.bathrooms}
                onChange={(e) => setFormData({...formData, bathrooms: e.target.value})}
                placeholder="1"
                className="rounded-xl"
              />
            </div>
          </div>

          <label className="text-sm text-[#999999] mb-3 block">Équipements & Commodités</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AMENITIES.map(amenity => (
              <button
                key={amenity.value}
                type="button"
                onClick={() => toggleAmenity(amenity.value)}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                  formData.amenities.includes(amenity.value)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-white text-[#666666] border-[#E5E5E5] hover:border-[#CCCCCC]"
                )}
              >
                {amenity.label}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <h2 className="font-semibold mb-4">Description</h2>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Décrivez le bien en détail..."
            className="rounded-xl min-h-32"
          />
        </div>

        {/* Images */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <h2 className="font-semibold mb-4">Photos</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {formData.images.map((url, index) => (
              <div key={index} className="relative aspect-square rounded-xl overflow-hidden group">
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            <label className={cn(
              "aspect-square rounded-xl border-2 border-dashed border-[#E5E5E5] flex flex-col items-center justify-center cursor-pointer hover:border-[#CCCCCC] transition-colors",
              uploading && "opacity-50 pointer-events-none"
            )}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              {uploading ? (
                <Loader2 className="w-6 h-6 text-[#CCCCCC] animate-spin" />
              ) : (
                <>
                  <ImageIcon className="w-6 h-6 text-[#CCCCCC] mb-1" />
                  <span className="text-xs text-[#999999]">Ajouter</span>
                </>
              )}
            </label>
          </div>
        </div>

        {/* Featured */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
          <div className="flex items-center gap-3">
            <Checkbox
              id="featured"
              checked={formData.featured}
              onCheckedChange={(checked) => setFormData({...formData, featured: checked})}
            />
            <label htmlFor="featured" className="text-sm font-medium cursor-pointer">
              Mettre ce bien en vedette sur ma Social Page
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link to={createPageUrl(`ListingDetail?id=${listingId}`)}>
            <Button type="button" variant="outline" className="rounded-xl">
              Annuler
            </Button>
          </Link>
          <Button 
            type="submit" 
            disabled={updateMutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
          >
            {updateMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Enregistrer
          </Button>
        </div>
      </form>
    </div>
  );
}
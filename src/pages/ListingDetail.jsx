import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  MapPin, 
  Maximize,
  BedDouble,
  Bath,
  LayoutGrid,
  Pencil,
  Trash2,
  Star,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  MapPinned,
  Loader2,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StatusBadge from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { cn } from '@/lib/utils';
import MatchedLeads from '@/components/matching/MatchedLeads';
import AmenitiesMap from '@/components/listing/AmenitiesMap';
import AmenitiesList from '@/components/listing/AmenitiesList';
import { toast } from 'sonner';

export default function ListingDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const listingId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const { user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [exactAddress, setExactAddress] = useState('');
  const [loadingAmenities, setLoadingAmenities] = useState(false);
  const [loadingEstimation, setLoadingEstimation] = useState(false);
  const [activeTab, setActiveTab] = useState('details');

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', listingId],
    queryFn: async () => {
      const listings = await base44.entities.Listing.filter({ id: listingId });
      return listings[0];
    },
    enabled: !!listingId,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => base44.entities.Lead.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.Listing.delete(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      navigate(createPageUrl('Listings'));
    },
  });

  const updateListingMutation = useMutation({
    mutationFn: (data) => base44.entities.Listing.update(listingId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      if (variables.nearby_amenities !== undefined) {
        toast.success('Commodités générées avec succès');
      } else if (variables.estimation_min !== undefined) {
        toast.success('Estimation enregistrée');
      }
    },
  });

  useEffect(() => {
    if (listing) {
      if (listing.exact_address) {
        setExactAddress(listing.exact_address);
      } else {
        // Pré-remplir avec l'adresse du bien si disponible
        const parts = [listing.address, listing.postal_code, listing.city].filter(Boolean);
        if (parts.length > 0) {
          setExactAddress(parts.join(', '));
        }
      }
    }
  }, [listing]);

  const handleGenerateAmenities = async () => {
    if (!exactAddress.trim()) {
      toast.error('Veuillez entrer une adresse exacte');
      return;
    }

    setLoadingAmenities(true);
    try {
      const response = await base44.functions.invoke('getAmenities', { address: exactAddress });
      
      if (response?.error) {
        toast.error(response.error);
        return;
      }

      const { latitude, longitude, amenities } = response;
      
      await updateListingMutation.mutateAsync({
        exact_address: exactAddress,
        latitude,
        longitude,
        nearby_amenities: amenities
      });

      setActiveTab('commodites');
    } catch (error) {
      toast.error('Erreur lors de la génération des commodités');
      console.error(error);
    } finally {
      setLoadingAmenities(false);
    }
  };

  const handleGenerateEstimation = async () => {
    if (!listing?.surface || listing.surface <= 0) {
      toast.error('La surface du bien est requise pour l\'estimation');
      return;
    }

    setLoadingEstimation(true);
    try {
      const address = exactAddress || [listing.address, listing.postal_code, listing.city].filter(Boolean).join(', ');
      const response = await base44.functions.invoke('getPropertyEstimation', {
        address: address || undefined,
        latitude: listing.latitude,
        longitude: listing.longitude,
        surface: listing.surface,
        property_type: listing.property_type,
        postal_code: listing.postal_code
      });

      if (response?.error) {
        toast.error(response.error);
        return;
      }

      await updateListingMutation.mutateAsync({
        estimation_min: response.estimation_min,
        estimation_max: response.estimation_max,
        estimation_prix_m2: response.prix_m2,
        estimation_date: new Date().toISOString(),
        estimation_source: response.source
      });

      setActiveTab('estimation');
    } catch (error) {
      toast.error('Erreur lors de l\'estimation');
      console.error(error);
    } finally {
      setLoadingEstimation(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  const nextImage = () => {
    if (listing?.images?.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % listing.images.length);
    }
  };

  const prevImage = () => {
    if (listing?.images?.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + listing.images.length) % listing.images.length);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 rounded-2xl" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="max-w-5xl mx-auto text-center py-16">
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={createPageUrl('Listings')}>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{listing.title}</h1>
              {listing.featured && (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                  <Star className="w-3 h-3 mr-1" />
                  En vedette
                </Badge>
              )}
            </div>
            <p className="text-[#999999] text-sm mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {listing.address ? `${listing.address}, ` : ''}{listing.city} {listing.postal_code}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link to={createPageUrl(`EditListing?id=${listing.id}`)}>
            <Button variant="outline" className="rounded-xl">
              <Pencil className="w-4 h-4 mr-2" />
              Modifier
            </Button>
          </Link>
          <Button 
            variant="outline" 
            onClick={() => setShowDeleteDialog(true)}
            className="rounded-xl text-rose-600 hover:text-rose-700 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="relative aspect-[16/9] rounded-2xl overflow-hidden bg-gradient-to-br from-[#E5E5E5] to-[#F5F5F5]">
        {listing.images?.length > 0 ? (
          <>
            <img 
              src={listing.images[currentImageIndex]} 
              alt={listing.title}
              className="w-full h-full object-cover"
            />
            {listing.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-lg transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {listing.images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        index === currentImageIndex ? "bg-white" : "bg-white/50"
                      )}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-6xl font-light text-[#CCCCCC]">
              {listing.property_type?.toUpperCase() || 'BIEN'}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price & Status */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#999999]">
                {listing.transaction_type === 'vente' ? 'À vendre' : listing.transaction_type === 'location' ? 'À louer' : 'Prix'}
              </p>
              <p className="text-3xl font-semibold mt-1">{formatPrice(listing.price)}</p>
            </div>
            <StatusBadge status={listing.status} />
          </div>

          {/* Tabs Navigation */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className={cn(
              "grid w-full h-12 bg-[#F5F5F5] rounded-xl p-1",
              listing.transaction_type === 'vente' ? "grid-cols-3" : "grid-cols-2"
            )}>
              <TabsTrigger value="details" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                Détails du bien
              </TabsTrigger>
              <TabsTrigger value="commodites" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <MapPinned className="w-4 h-4 mr-2" />
                Commodités
              </TabsTrigger>
              {listing.transaction_type === 'vente' && (
                <TabsTrigger value="estimation" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Estimation
                </TabsTrigger>
              )}
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-6 mt-6">

          {/* Characteristics */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">Caractéristiques</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {listing.surface && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
                    <Maximize className="w-5 h-5 text-[#666666]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">Surface</p>
                    <p className="font-medium">{listing.surface} m²</p>
                  </div>
                </div>
              )}
              {listing.rooms && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
                    <LayoutGrid className="w-5 h-5 text-[#666666]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">Pièces</p>
                    <p className="font-medium">{listing.rooms}</p>
                  </div>
                </div>
              )}
              {listing.bedrooms && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
                    <BedDouble className="w-5 h-5 text-[#666666]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">Chambres</p>
                    <p className="font-medium">{listing.bedrooms}</p>
                  </div>
                </div>
              )}
              {listing.bathrooms && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
                    <Bath className="w-5 h-5 text-[#666666]" />
                  </div>
                  <div>
                    <p className="text-xs text-[#999999]">Sdb</p>
                    <p className="font-medium">{listing.bathrooms}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
              <h2 className="font-semibold mb-4">Description</h2>
              <p className="text-[#666666] whitespace-pre-line">{listing.description}</p>
            </div>
          )}

              {/* Amenities */}
              {listing.amenities?.length > 0 && (
                <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
                  <h2 className="font-semibold mb-4">Équipements</h2>
                  <div className="flex flex-wrap gap-2">
                    {listing.amenities.map((amenity) => (
                      <Badge key={amenity} variant="secondary" className="capitalize">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Commodités Tab */}
            <TabsContent value="commodites" className="space-y-6 mt-6">
              {/* Address Input */}
              <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
                <h2 className="font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#666666]" />
                  Adresse exacte du bien
                </h2>
                <p className="text-sm text-[#999999] mb-4">
                  Entrez l'adresse précise pour générer les commodités environnantes
                </p>
                <div className="flex gap-3">
                  <Input
                    placeholder="Ex: 123 Rue de la République, 75001 Paris"
                    value={exactAddress}
                    onChange={(e) => setExactAddress(e.target.value)}
                    className="flex-1 h-11 rounded-xl border-[#E5E5E5] focus:border-black focus:ring-0"
                  />
                  <Button 
                    onClick={handleGenerateAmenities}
                    disabled={loadingAmenities}
                    className="bg-black hover:bg-black/90 text-white rounded-xl h-11 px-6"
                  >
                    {loadingAmenities ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Chargement...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Générer
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Map */}
              {listing.latitude && listing.longitude && (
                <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
                  <h2 className="font-semibold mb-4">Carte interactive</h2>
                  <AmenitiesMap 
                    latitude={listing.latitude} 
                    longitude={listing.longitude}
                    amenities={listing.nearby_amenities}
                  />
                </div>
              )}

              {/* Amenities List */}
              {listing.nearby_amenities && (
                <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
                  <h2 className="font-semibold mb-4">Commodités à proximité</h2>
                  <AmenitiesList amenities={listing.nearby_amenities} />
                </div>
              )}

              {/* Empty State */}
              {!listing.latitude && !listing.longitude && (
                <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
                    <MapPinned className="w-8 h-8 text-[#CCCCCC]" />
                  </div>
                  <h3 className="font-semibold mb-2">Aucune commodité générée</h3>
                  <p className="text-sm text-[#999999]">
                    Entrez l'adresse exacte et cliquez sur "Générer" pour découvrir les commodités autour du bien
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Estimation Tab (vente uniquement) */}
            {listing.transaction_type === 'vente' && (
              <TabsContent value="estimation" className="space-y-6 mt-6">
                <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
                  <h2 className="font-semibold mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#666666]" />
                    Estimation de valeur
                  </h2>
                  <p className="text-sm text-[#999999] mb-4">
                    Estimation indicative basée sur les prix du marché (données DVF et prix au m² par secteur)
                  </p>
                  <Button
                    onClick={handleGenerateEstimation}
                    disabled={loadingEstimation}
                    className="bg-black hover:bg-black/90 text-white rounded-xl h-11 px-6"
                  >
                    {loadingEstimation ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Calcul en cours...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Générer l'estimation
                      </>
                    )}
                  </Button>
                </div>

                {listing.estimation_min != null && listing.estimation_max != null ? (
                  <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
                    <h2 className="font-semibold">Fourchette d'estimation</h2>
                    <div className="flex flex-wrap gap-4">
                      <div className="flex-1 min-w-[140px] p-4 rounded-xl bg-[#F5F5F5]">
                        <p className="text-xs text-[#999999] mb-1">Minimum</p>
                        <p className="text-xl font-semibold">{formatPrice(listing.estimation_min)}</p>
                      </div>
                      <div className="flex-1 min-w-[140px] p-4 rounded-xl bg-primary/20 border border-primary/40">
                        <p className="text-xs text-[#999999] mb-1">Estimation médiane</p>
                        <p className="text-xl font-semibold">
                          {formatPrice(Math.round((listing.estimation_min + listing.estimation_max) / 2))}
                        </p>
                      </div>
                      <div className="flex-1 min-w-[140px] p-4 rounded-xl bg-[#F5F5F5]">
                        <p className="text-xs text-[#999999] mb-1">Maximum</p>
                        <p className="text-xl font-semibold">{formatPrice(listing.estimation_max)}</p>
                      </div>
                    </div>
                    {listing.estimation_prix_m2 && (
                      <p className="text-sm text-[#999999]">
                        Prix de référence : {listing.estimation_prix_m2.toLocaleString('fr-FR')} €/m²
                        {listing.estimation_source && (
                          <span className="ml-2">
                            (source : {listing.estimation_source === 'dvf' ? 'données DVF' : 'référentiel départemental'})
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-8 h-8 text-[#CCCCCC]" />
                    </div>
                    <h3 className="font-semibold mb-2">Aucune estimation générée</h3>
                    <p className="text-sm text-[#999999]">
                      Cliquez sur &quot;Générer l'estimation&quot; pour obtenir une fourchette de prix basée sur le marché local
                    </p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Leads correspondants */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Leads correspondants
              </h2>
              <Link to={createPageUrl('Matching')} className="text-xs text-[#999999] hover:text-black">
                Voir tout
              </Link>
            </div>
            {listing && <MatchedLeads leads={leads} listing={listing} />}
          </div>

          {/* Info Card */}
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
            <h2 className="font-semibold mb-4">Informations</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#999999]">Type</span>
                <span className="font-medium capitalize">{listing.property_type || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#999999]">Référence</span>
                <span className="font-medium font-mono text-xs">{listing.id?.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#999999]">Créé le</span>
                <span className="font-medium">
                  {format(new Date(listing.created_date), 'dd/MM/yyyy', { locale: fr })}
                </span>
              </div>
            </div>
          </div>

          {/* Thumbnails */}
          {listing.images?.length > 1 && (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
              <div className="grid grid-cols-3 gap-2">
                {listing.images.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={cn(
                      "aspect-square rounded-lg overflow-hidden border-2 transition-colors",
                      index === currentImageIndex ? "border-black" : "border-transparent"
                    )}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce bien ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le bien sera définitivement supprimé.
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
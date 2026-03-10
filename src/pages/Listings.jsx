import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Filter, Plus, ChevronRight, MapPin, Maximize, Euro, CheckSquare, Square, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import StatusBadge from '@/components/ui/StatusBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function Listings() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedListings, setSelectedListings] = useState([]);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings', user?.email],
    queryFn: () => base44.entities.Listing.filter({ created_by: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const filteredListings = listings.filter(listing => {
    const matchesSearch = search === '' || 
      listing.title?.toLowerCase().includes(search.toLowerCase()) ||
      listing.city?.toLowerCase().includes(search.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || listing.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  const deleteListingsMutation = useMutation({
    mutationFn: async (listingIds) => {
      for (const id of listingIds) {
        await base44.entities.Listing.delete(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['listings']);
      toast.success(`${selectedListings.length} bien(s) supprimé(s)`);
      setSelectedListings([]);
      setSelectionMode(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ listingIds, status }) => {
      for (const id of listingIds) {
        await base44.entities.Listing.update(id, { status });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['listings']);
      toast.success(`Statut mis à jour pour ${selectedListings.length} bien(s)`);
      setSelectedListings([]);
      setSelectionMode(false);
    },
  });

  const handleToggleSelection = (listingId) => {
    setSelectedListings(prev => 
      prev.includes(listingId) 
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    );
  };

  const handleSelectAll = () => {
    if (selectedListings.length === filteredListings.length) {
      setSelectedListings([]);
    } else {
      setSelectedListings(filteredListings.map(l => l.id));
    }
  };

  const handleDeleteSelected = () => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedListings.length} bien(s) ?`)) {
      deleteListingsMutation.mutate(selectedListings);
    }
  };

  const handleUpdateStatus = (status) => {
    updateStatusMutation.mutate({ listingIds: selectedListings, status });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Biens</h1>
          <p className="text-[#999999] mt-1">
            {selectionMode && selectedListings.length > 0 
              ? `${selectedListings.length} bien(s) sélectionné(s)` 
              : `${listings.length} bien${listings.length > 1 ? 's' : ''} au total`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!selectionMode ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => setSelectionMode(true)}
                className="border-[#E5E5E5] rounded-xl h-10 px-4 text-sm font-medium hover:bg-[#F5F5F5]"
              >
                <CheckSquare className="w-4 h-4 mr-2" />
                Sélectionner
              </Button>
              <Link to={createPageUrl('AddListing')}>
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 px-4 text-sm font-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un bien
                </Button>
              </Link>
            </>
          ) : (
            <Button 
              variant="outline" 
              onClick={() => {
                setSelectionMode(false);
                setSelectedListings([]);
              }}
              className="border-[#E5E5E5] rounded-xl h-10 px-4 text-sm font-medium hover:bg-[#F5F5F5]"
            >
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {selectionMode && (
          <Button 
            variant="outline"
            onClick={handleSelectAll}
            className="border-[#E5E5E5] rounded-xl h-10 px-4 text-sm font-medium hover:bg-[#F5F5F5]"
          >
            {selectedListings.length === filteredListings.length ? (
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
            placeholder="Rechercher un bien..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 rounded-xl border-[#E5E5E5] focus:border-black focus:ring-0"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44 h-10 rounded-xl border-[#E5E5E5]">
            <Filter className="w-4 h-4 mr-2 text-[#999999]" />
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="brouillon">Brouillon</SelectItem>
            <SelectItem value="en_cours">En cours</SelectItem>
            <SelectItem value="publie">Publié</SelectItem>
            <SelectItem value="vendu">Vendu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              <Skeleton className="h-48" />
              <div className="p-4">
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-3" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
            <Search className="w-7 h-7 text-[#CCCCCC]" />
          </div>
          <p className="text-[#999999] font-medium">Aucun bien trouvé</p>
          <p className="text-sm text-[#CCCCCC] mt-1">Modifiez vos filtres ou ajoutez un nouveau bien</p>
          <Link to={createPageUrl('AddListing')}>
            <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un bien
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              className="relative group bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden hover:shadow-lg hover:shadow-black/5 transition-all duration-300"
            >
              {selectionMode && (
                <div 
                  className="absolute top-3 right-3 z-10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggleSelection(listing.id);
                  }}
                >
                  <Checkbox 
                    checked={selectedListings.includes(listing.id)}
                    className="w-5 h-5 border-2 border-white data-[state=checked]:bg-white data-[state=checked]:text-black"
                  />
                </div>
              )}

              <Link
                to={createPageUrl(`ListingDetail?id=${listing.id}`)}
                className="block"
                onClick={(e) => {
                  if (selectionMode) {
                    e.preventDefault();
                    handleToggleSelection(listing.id);
                  }
                }}
              >
                {/* Image */}
                <div className="aspect-[4/3] bg-gradient-to-br from-[#E5E5E5] to-[#F5F5F5] relative overflow-hidden">
                  {listing.images?.[0] ? (
                    <img 
                      src={listing.images[0]} 
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl font-light text-[#CCCCCC]">
                        {listing.property_type?.toUpperCase() || 'BIEN'}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-3 left-3">
                    <StatusBadge status={listing.status} />
                  </div>
                  {!selectionMode && listing.featured && (
                    <div className="absolute top-3 right-3 bg-black text-white text-xs px-2 py-1 rounded-full">
                      En vedette
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-semibold truncate group-hover:text-[#666666] transition-colors">
                    {listing.title}
                  </h3>
                  
                  <div className="flex items-center gap-4 mt-2 text-sm text-[#999999]">
                    {listing.transaction_type && (
                      <span className="capitalize">
                        {listing.transaction_type === 'vente' ? 'À vendre' : 'À louer'}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {listing.city || '-'}
                    </span>
                    {listing.surface && (
                      <span className="flex items-center gap-1">
                        <Maximize className="w-3.5 h-3.5" />
                        {listing.surface} m²
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E5E5E5]">
                    <span className="font-semibold text-lg">
                      {formatPrice(listing.price)}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[#CCCCCC] group-hover:text-[#999999] group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Action Bar - Fixed at bottom when items selected */}
      {selectionMode && selectedListings.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedListings.length} bien{selectedListings.length > 1 ? 's' : ''} sélectionné{selectedListings.length > 1 ? 's' : ''}
          </span>
          <div className="h-6 w-px bg-white/20" />
          <Select onValueChange={handleUpdateStatus}>
            <SelectTrigger className="w-40 h-9 bg-white/10 border-white/20 text-white rounded-lg">
              <SelectValue placeholder="Changer statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brouillon">Brouillon</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="publie">Publié</SelectItem>
              <SelectItem value="vendu">Vendu</SelectItem>
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
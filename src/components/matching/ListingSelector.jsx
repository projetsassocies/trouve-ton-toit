import React from 'react';
import { Search, Home, MapPin, Maximize } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/matching-engine';
import StatusBadge from '@/components/ui/StatusBadge';

export default function ListingSelector({
  listings,
  isLoading,
  selectedListingId,
  onSelect,
  filters,
  onFilterChange,
}) {
  const { search = '', transactionType = 'all', propertyType = 'all', listingStatus = 'all' } = filters;

  const filtered = listings.filter(listing => {
    if (transactionType !== 'all' && listing.transaction_type !== transactionType) return false;
    if (propertyType !== 'all' && listing.property_type !== propertyType) return false;
    if (listingStatus !== 'all' && listing.status !== listingStatus) return false;
    if (search) {
      const q = search.toLowerCase();
      const title = (listing.title || '').toLowerCase();
      const city = (listing.city || '').toLowerCase();
      if (!title.includes(q) && !city.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-[#E5E5E5] space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
          <Input
            placeholder="Rechercher un bien..."
            value={search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9 h-9 rounded-xl border-[#E5E5E5] text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Select value={transactionType} onValueChange={(v) => onFilterChange({ ...filters, transactionType: v })}>
            <SelectTrigger className="h-7 rounded-lg border-[#E5E5E5] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Transaction</SelectItem>
              <SelectItem value="vente">Vente</SelectItem>
              <SelectItem value="location">Location</SelectItem>
            </SelectContent>
          </Select>
          <Select value={propertyType} onValueChange={(v) => onFilterChange({ ...filters, propertyType: v })}>
            <SelectTrigger className="h-7 rounded-lg border-[#E5E5E5] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Type</SelectItem>
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
          <Select value={listingStatus} onValueChange={(v) => onFilterChange({ ...filters, listingStatus: v })}>
            <SelectTrigger className="h-7 rounded-lg border-[#E5E5E5] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Statut</SelectItem>
              <SelectItem value="publie">Publié</SelectItem>
              <SelectItem value="brouillon">Brouillon</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-3 py-2 text-xs text-[#999999] border-b border-[#F0F0F0]">
        {filtered.length} bien{filtered.length > 1 ? 's' : ''}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <Home className="w-8 h-8 text-[#CCCCCC] mx-auto mb-2" />
            <p className="text-sm text-[#999999]">Aucun bien trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {filtered.map((listing) => (
              <div
                key={listing.id}
                onClick={() => onSelect(listing)}
                className={cn(
                  "px-3 py-2.5 cursor-pointer transition-colors",
                  selectedListingId === listing.id
                    ? "bg-[#c5ff4e]/10 border-l-2 border-l-[#c5ff4e]"
                    : "hover:bg-[#FAFAFA] border-l-2 border-l-transparent"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-lg bg-[#F5F5F5] overflow-hidden flex-shrink-0">
                    {listing.images?.[0] ? (
                      <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Home className="w-4 h-4 text-[#CCCCCC]" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{listing.title || 'Sans titre'}</p>
                    <div className="flex items-center gap-2 text-[11px] text-[#999999] mt-0.5">
                      {listing.city && (
                        <span className="flex items-center gap-0.5 truncate">
                          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                          {listing.city}
                        </span>
                      )}
                      {listing.surface && (
                        <span className="flex items-center gap-0.5 flex-shrink-0">
                          <Maximize className="w-2.5 h-2.5" />
                          {listing.surface}m²
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-semibold flex-shrink-0">{formatPrice(listing.price)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Building2, MapPin, Maximize } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

const formatPrice = (price) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);

export default function RecentProperties() {
  const { user } = useAuth();
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['listings', user?.email],
    queryFn: () => base44.entities.Listing.filter({ created_by: user.email }, '-created_date', 5),
    enabled: !!user?.email,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (listings.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Derniers Biens Enregistrés</h3>
          </div>
          <Link to={createPageUrl('Listings')}>
            <Button variant="outline" size="sm">
              Voir tous les biens
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              to={createPageUrl(`ListingDetail?id=${listing.id}`)}
              className="flex gap-4 rounded-lg border border-border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer block"
            >
              <div className="h-24 w-32 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                {listing.images?.[0] ? (
                  <img
                    src={listing.images[0]}
                    alt={listing.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <span className="text-2xl text-muted-foreground">
                      {listing.property_type?.charAt(0) || 'B'}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-medium truncate">{listing.title}</h4>
                    <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{listing.address || listing.city || '-'}</span>
                    </div>
                  </div>
                  {listing.status && (
                    <Badge variant={listing.status === 'nouveau' ? 'default' : 'secondary'}>
                      {listing.status}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 font-semibold">
                    {formatPrice(listing.price)}
                  </div>
                  {listing.surface && (
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Maximize className="h-4 w-4" />
                      {listing.surface} m²
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

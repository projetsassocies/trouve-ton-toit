import { Building2, MapPin, Euro, Maximize } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

const properties = [
  {
    id: 1,
    image: 'modern apartment interior',
    title: 'Appartement T3 - Lyon 6ème',
    location: '45 rue de la République',
    price: '350 000',
    size: '75',
    status: 'Nouveau',
    statusVariant: 'default' as const
  },
  {
    id: 2,
    image: 'cozy house exterior',
    title: 'Maison 5 pièces avec jardin',
    location: 'Caluire-et-Cuire',
    price: '520 000',
    size: '120',
    status: 'Actif',
    statusVariant: 'secondary' as const
  },
  {
    id: 3,
    image: 'studio apartment',
    title: 'Studio rénové - Part-Dieu',
    location: 'Lyon 3ème',
    price: '180 000',
    size: '32',
    status: 'Nouveau',
    statusVariant: 'default' as const
  }
];

export function RecentProperties() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Derniers Biens Enregistrés</h3>
          </div>
          <Button variant="outline" size="sm">
            Voir tous les biens
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {properties.map((property) => (
            <div
              key={property.id}
              className="flex gap-4 rounded-lg border bg-card p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <ImageWithFallback
                src={`https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400`}
                alt={property.title}
                className="h-24 w-32 rounded-lg object-cover"
              />
              
              <div className="flex-1">
                <div className="mb-2 flex items-start justify-between">
                  <div>
                    <h4 className="font-medium">{property.title}</h4>
                    <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {property.location}
                    </div>
                  </div>
                  <Badge variant={property.statusVariant}>
                    {property.status}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 font-semibold">
                    <Euro className="h-4 w-4" />
                    {property.price}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Maximize className="h-4 w-4" />
                    {property.size} m²
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
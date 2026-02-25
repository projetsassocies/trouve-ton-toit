import React, { useState } from 'react';
import { Bus, GraduationCap, ShoppingCart, Heart, Palmtree, UtensilsCrossed, ParkingCircle, MapPin, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const categoryConfig = {
  transports: {
    title: 'Transports',
    icon: Bus,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    emptyMessage: 'Aucun transport à proximité'
  },
  education: {
    title: 'Éducation',
    icon: GraduationCap,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    emptyMessage: 'Aucune école à proximité'
  },
  commerces: {
    title: 'Commerces essentiels',
    icon: ShoppingCart,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    emptyMessage: 'Aucun commerce à proximité'
  },
  sante: {
    title: 'Santé',
    icon: Heart,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    emptyMessage: 'Aucun établissement de santé à proximité'
  },
  loisirs: {
    title: 'Loisirs',
    icon: Palmtree,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    emptyMessage: 'Aucun lieu de loisirs à proximité'
  },
  restaurants: {
    title: 'Restaurants',
    icon: UtensilsCrossed,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    emptyMessage: 'Aucun restaurant à proximité'
  },
  parking: {
    title: 'Parking',
    icon: ParkingCircle,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    emptyMessage: 'Aucun parking à proximité'
  }
};

function AmenityItem({ item }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-[#FAFAFA] transition-colors border border-transparent hover:border-[#E5E5E5]">
      <MapPin className="w-4 h-4 text-[#999999] flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-[#666666]">{item.type}</span>
          {item.lines && (
            <>
              <span className="text-xs text-[#CCCCCC]">•</span>
              <span className="text-xs font-mono text-[#666666]">{item.lines}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs font-semibold text-black">{item.distance}m</span>
          <span className="text-xs text-[#CCCCCC]">•</span>
          <span className="text-xs text-[#999999]">{item.walkingTime} min à pied</span>
        </div>
      </div>
    </div>
  );
}

function AmenityCategory({ category, items, isRestaurant = false, isFirstWithData = false }) {
  const config = categoryConfig[category];
  const Icon = config.icon;
  const [showMore, setShowMore] = useState(false);
  const [isOpen, setIsOpen] = useState(isFirstWithData);
  const INITIAL_LIMIT = 5;

  // Format spécial pour restaurants
  if (isRestaurant && items?.count !== undefined) {
    return (
      <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full p-4 ${isOpen ? 'border-b' : ''} ${config.borderColor} flex items-center justify-between gap-3 ${config.bgColor} hover:opacity-80 transition-opacity cursor-pointer`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center border ${config.borderColor}`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-sm">{config.title}</h3>
              <p className="text-xs text-[#999999]">{items.count} dans un rayon de 500m</p>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-[#999999] transition-transform ${isOpen ? '' : '-rotate-90'}`} />
        </button>

        {isOpen && (
          <div className="p-4">
            {items.top && items.top.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-[#999999] mb-3">Les 3 plus proches</p>
                {items.top.map((item, index) => (
                  <AmenityItem key={`${category}-${item.id}-${index}`} item={item} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#999999] text-center py-4">{config.emptyMessage}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Format normal pour les autres catégories
  const displayItems = Array.isArray(items) ? items : [];
  const visibleItems = showMore ? displayItems : displayItems.slice(0, INITIAL_LIMIT);
  const hasMore = displayItems.length > INITIAL_LIMIT;

  return (
    <div className="bg-white rounded-xl border border-[#E5E5E5] overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full p-4 ${isOpen ? 'border-b' : ''} ${config.borderColor} flex items-center justify-between gap-3 ${config.bgColor} hover:opacity-80 transition-opacity cursor-pointer`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center border ${config.borderColor}`}>
            <Icon className={`w-4 h-4 ${config.color}`} />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-sm">{config.title}</h3>
            <p className="text-xs text-[#999999]">{displayItems.length} trouvé{displayItems.length > 1 ? 's' : ''}</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#999999] transition-transform ${isOpen ? '' : '-rotate-90'}`} />
      </button>

      {isOpen && (
        <div className="p-4">
          {displayItems.length === 0 ? (
            <p className="text-sm text-[#999999] text-center py-4">{config.emptyMessage}</p>
          ) : (
            <>
              <div className="space-y-2">
                {visibleItems.map((item, index) => (
                  <AmenityItem key={`${category}-${item.id}-${index}`} item={item} />
                ))}
              </div>
              
              {hasMore && (
                <Button
                  variant="ghost"
                  onClick={() => setShowMore(!showMore)}
                  className="w-full mt-3 text-xs text-[#666666] hover:text-black h-8"
                >
                  {showMore ? 'Voir moins' : `Voir ${displayItems.length - INITIAL_LIMIT} de plus`}
                  <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showMore ? 'rotate-180' : ''}`} />
                </Button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function AmenitiesList({ amenities }) {
  if (!amenities) {
    return (
      <div className="text-center py-8 text-[#999999]">
        Aucune commodité chargée
      </div>
    );
  }

  // Ordre d'affichage spécifique
  const categoryOrder = ['transports', 'education', 'commerces', 'sante', 'loisirs', 'restaurants', 'parking'];

  // Trouver la première catégorie avec des données
  let firstWithDataFound = false;
  const categoriesWithData = categoryOrder.map(category => {
    const hasData = category === 'restaurants' 
      ? amenities[category]?.count > 0 
      : Array.isArray(amenities[category]) && amenities[category].length > 0;
    
    const isFirst = hasData && !firstWithDataFound;
    if (isFirst) firstWithDataFound = true;
    
    return { category, isFirst };
  });

  return (
    <div className="space-y-4">
      {categoriesWithData.map(({ category, isFirst }) => (
        <AmenityCategory 
          key={category} 
          category={category} 
          items={amenities[category]} 
          isRestaurant={category === 'restaurants'}
          isFirstWithData={isFirst}
        />
      ))}
    </div>
  );
}
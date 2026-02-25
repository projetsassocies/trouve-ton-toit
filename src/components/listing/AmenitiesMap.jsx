import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Home, Bus, Train, School, ShoppingCart, Building } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix pour les icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icônes personnalisées pour les commodités
const createCustomIcon = (color) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const homeIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="background-color: #000; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 3px 12px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
      <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const categoryIcons = {
  transports: createCustomIcon('#3B82F6'),
  education: createCustomIcon('#10B981'),
  commerces: createCustomIcon('#F59E0B'),
  sante: createCustomIcon('#EF4444'),
  loisirs: createCustomIcon('#A855F7'),
  restaurants: createCustomIcon('#F97316'),
  parking: createCustomIcon('#64748B'),
};

function MapController({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  
  return null;
}

export default function AmenitiesMap({ latitude, longitude, amenities }) {
  if (!latitude || !longitude) {
    return (
      <div className="w-full h-[400px] bg-[#F5F5F5] rounded-xl flex items-center justify-center">
        <p className="text-[#999999]">Aucune localisation disponible</p>
      </div>
    );
  }

  const center = [latitude, longitude];

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border border-[#E5E5E5]">
      <MapContainer 
        center={center} 
        zoom={15} 
        className="w-full h-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController center={center} />

        {/* Marker pour le bien */}
        <Marker position={center} icon={homeIcon}>
          <Popup>
            <div className="text-center font-semibold">
              📍 Le bien
            </div>
          </Popup>
        </Marker>

        {/* Markers pour les transports */}
        {amenities?.transports?.map((item) => (
          <Marker 
            key={`transport-${item.id}`} 
            position={[item.lat, item.lon]}
            icon={categoryIcons.transports}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{item.name}</div>
                <div className="text-[#999999] text-xs">{item.type}</div>
                <div className="text-[#666666] text-xs mt-1">{item.distance}m • {item.walkingTime} min</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Markers pour l'éducation */}
        {amenities?.education?.map((item) => (
          <Marker 
            key={`education-${item.id}`} 
            position={[item.lat, item.lon]}
            icon={categoryIcons.education}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{item.name}</div>
                <div className="text-[#999999] text-xs">{item.type}</div>
                <div className="text-[#666666] text-xs mt-1">{item.distance}m • {item.walkingTime} min</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Markers pour les commerces */}
        {amenities?.commerces?.map((item) => (
          <Marker 
            key={`commerce-${item.id}`} 
            position={[item.lat, item.lon]}
            icon={categoryIcons.commerces}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{item.name}</div>
                <div className="text-[#999999] text-xs">{item.type}</div>
                <div className="text-[#666666] text-xs mt-1">{item.distance}m • {item.walkingTime} min</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Markers pour la santé */}
        {amenities?.sante?.map((item) => (
          <Marker 
            key={`sante-${item.id}`} 
            position={[item.lat, item.lon]}
            icon={categoryIcons.sante}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{item.name}</div>
                <div className="text-[#999999] text-xs">{item.type}</div>
                <div className="text-[#666666] text-xs mt-1">{item.distance}m • {item.walkingTime} min</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Markers pour les loisirs */}
        {amenities?.loisirs?.map((item) => (
          <Marker 
            key={`loisirs-${item.id}`} 
            position={[item.lat, item.lon]}
            icon={categoryIcons.loisirs}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{item.name}</div>
                <div className="text-[#999999] text-xs">{item.type}</div>
                <div className="text-[#666666] text-xs mt-1">{item.distance}m • {item.walkingTime} min</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Markers pour les restaurants */}
        {amenities?.restaurants?.top?.map((item) => (
          <Marker 
            key={`restaurant-${item.id}`} 
            position={[item.lat, item.lon]}
            icon={categoryIcons.restaurants}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{item.name}</div>
                <div className="text-[#999999] text-xs">{item.type}</div>
                <div className="text-[#666666] text-xs mt-1">{item.distance}m • {item.walkingTime} min</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Markers pour les parkings */}
        {amenities?.parking?.map((item) => (
          <Marker 
            key={`parking-${item.id}`} 
            position={[item.lat, item.lon]}
            icon={categoryIcons.parking}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{item.name}</div>
                <div className="text-[#999999] text-xs">{item.type}</div>
                <div className="text-[#666666] text-xs mt-1">{item.distance}m • {item.walkingTime} min</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
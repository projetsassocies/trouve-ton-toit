import React from 'react';
import { MapPin, Maximize, Phone, Mail, ExternalLink } from 'lucide-react';

export default function SocialPagePreview({ config, listings = [] }) {
  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  return (
    <div className="max-h-[600px] overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5]">
        <div className="px-4 py-8 text-center">
          {/* Avatar */}
          {config.profile_picture ? (
            <img 
              src={config.profile_picture} 
              alt="Profile" 
              className="w-20 h-20 rounded-full mx-auto mb-3 object-cover"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#E5E5E5] to-[#F5F5F5] mx-auto mb-3 flex items-center justify-center">
              <span className="text-2xl font-light text-[#999999]">
                {config.display_name?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
          )}
          
          <h1 className="text-lg font-semibold">
            {config.display_name || 'Votre nom'}
          </h1>
          
          {config.bio && (
            <p className="text-sm text-[#999999] mt-1 max-w-xs mx-auto">
              {config.bio}
            </p>
          )}

          {/* Contact buttons */}
          <div className="flex justify-center gap-2 mt-4">
            {config.phone && (
              <a 
                href={`tel:${config.phone}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-full text-xs font-medium"
              >
                <Phone className="w-3 h-3" />
                Appeler
              </a>
            )}
            {config.email && (
              <a 
                href={`mailto:${config.email}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F5] text-[#111111] rounded-full text-xs font-medium"
              >
                <Mail className="w-3 h-3" />
                Email
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Custom Links */}
      {config.custom_links?.length > 0 && (
        <div className="px-4 py-4 space-y-2">
          {config.custom_links.filter(l => l.title && l.url).map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-4 py-3 bg-[#F5F5F5] rounded-xl text-sm font-medium hover:bg-[#E5E5E5] transition-colors"
            >
              {link.title}
              <ExternalLink className="w-3.5 h-3.5 text-[#999999]" />
            </a>
          ))}
        </div>
      )}

      {/* Listings */}
      {listings.length > 0 && (
        <div className="px-4 py-4">
          <h2 className="text-sm font-semibold mb-3">Mes biens</h2>
          <div className="grid grid-cols-2 gap-2">
            {listings.slice(0, 4).map((listing) => (
              <div
                key={listing.id}
                className="bg-[#F5F5F5] rounded-xl overflow-hidden"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-[#E5E5E5] to-[#F5F5F5]">
                  {listing.images?.[0] ? (
                    <img 
                      src={listing.images[0]} 
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-sm font-light text-[#CCCCCC]">
                        {listing.property_type?.toUpperCase() || 'BIEN'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{listing.title}</p>
                  <p className="text-xs text-[#999999]">{listing.city}</p>
                  <p className="text-sm font-semibold mt-1">
                    {formatPrice(listing.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-4 text-center border-t border-[#E5E5E5]">
        <p className="text-xs text-[#CCCCCC]">
          Propulsé par <span className="font-medium">TrouveTonToit</span>
        </p>
      </div>
    </div>
  );
}
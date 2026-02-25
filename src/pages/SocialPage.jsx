import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { MapPin, Maximize, Phone, Mail, ExternalLink, ChevronRight, Briefcase, QrCode, Home, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import LeadCaptureForm from '@/components/social/LeadCaptureForm';

export default function SocialPage() {
  const [showLeadForm, setShowLeadForm] = useState(false);

  const { data: configs = [], isLoading: configLoading } = useQuery({
    queryKey: ['social-config-public'],
    queryFn: () => base44.entities.SocialPageConfig.list(),
  });

  const { data: allListings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ['all-listings-public'],
    queryFn: () => base44.entities.Listing.list('-created_date'),
  });

  const config = configs[0] || {};
  
  // Get featured listings or fall back to published listings
  const featuredListings = config.featured_listings?.length > 0
    ? allListings.filter(l => config.featured_listings.includes(l.id))
    : allListings.filter(l => l.status === 'publie').slice(0, 6);

  const visibleLinks = config.custom_links?.filter(l => l.visible !== false && l.title && l.url) || [];

  const primaryColor = config.primary_color || '#000000';
  const accentColor = config.accent_color || '#4ade80';
  const backgroundColor = config.background_color || '#f8f9fa';

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  if (configLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="text-center">
            <Skeleton className="w-28 h-28 rounded-full mx-auto mb-4" />
            <Skeleton className="h-6 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor }}>
      {/* Header */}
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        {/* Avatar */}
        {config.profile_picture ? (
          <img 
            src={config.profile_picture} 
            alt={config.display_name || 'Profile'} 
            className="w-32 h-32 rounded-full mx-auto mb-5 object-cover shadow-xl"
            style={{ boxShadow: `0 20px 40px ${primaryColor}20` }}
          />
        ) : (
          <div 
            className="w-32 h-32 rounded-full mx-auto mb-5 flex items-center justify-center shadow-xl"
            style={{ backgroundColor: accentColor, boxShadow: `0 20px 40px ${primaryColor}20` }}
          >
            <span className="text-5xl font-semibold" style={{ color: primaryColor }}>
              {config.display_name?.[0]?.toUpperCase() || 'A'}
            </span>
          </div>
        )}
        
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: primaryColor }}>
          {config.display_name || 'Agent Immobilier'}
        </h1>
        
        {config.profession && (
          <p className="text-sm mt-2 flex items-center justify-center gap-1.5" style={{ color: primaryColor, opacity: 0.7 }}>
            <Briefcase className="w-4 h-4" />
            {config.profession}
          </p>
        )}
        
        {config.zone && (
          <p className="text-sm mt-1 flex items-center justify-center gap-1.5" style={{ color: primaryColor, opacity: 0.6 }}>
            <MapPin className="w-4 h-4" />
            {config.zone}
          </p>
        )}
        
        {config.bio && (
          <p className="mt-4 max-w-md mx-auto" style={{ color: primaryColor, opacity: 0.7 }}>
            {config.bio}
          </p>
        )}

        {/* Lead Capture CTA */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowLeadForm(true)}
            className="mt-6 px-8 py-4 rounded-2xl text-base font-semibold text-white shadow-2xl transition-all hover:scale-105 hover:shadow-3xl flex items-center gap-3"
            style={{ 
              backgroundColor: primaryColor, 
              boxShadow: `0 20px 60px ${primaryColor}50`,
            }}
          >
            <MessageSquare className="w-5 h-5" />
            {config.cta_button_text || 'Prendre contact avec'} {config.display_name?.split(' ')[0] || 'moi'}
          </button>
        </div>
        <p className="text-xs mt-3" style={{ color: primaryColor, opacity: 0.5 }}>
          Trouvez le bien de vos rêves en quelques clics
        </p>
      </div>

      {/* Custom Links */}
      {visibleLinks.length > 0 && (
        <div className="max-w-lg mx-auto px-4 pb-8">
          <div className="space-y-3">
            {visibleLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-6 py-4 bg-white rounded-2xl text-sm font-medium shadow-sm hover:shadow-md transition-all group"
                style={{ color: primaryColor }}
              >
                {link.title}
                <ExternalLink className="w-4 h-4 opacity-30 group-hover:opacity-60 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Listings */}
      {featuredListings.length > 0 && (
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold" style={{ color: primaryColor }}>Mes biens</h2>
            <span className="text-sm" style={{ color: primaryColor, opacity: 0.5 }}>
              {featuredListings.length} bien{featuredListings.length > 1 ? 's' : ''}
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {featuredListings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all group"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                  {listing.images?.[0] ? (
                    <img 
                      src={listing.images[0]} 
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Home className="w-12 h-12" style={{ color: accentColor }} />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold truncate" style={{ color: primaryColor }}>
                    {listing.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-2 text-sm" style={{ color: primaryColor, opacity: 0.6 }}>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {listing.city}
                    </span>
                    {listing.surface && (
                      <span className="flex items-center gap-1">
                        <Maximize className="w-3.5 h-3.5" />
                        {listing.surface} m²
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: `1px solid ${accentColor}40` }}>
                    <p className="text-xl font-bold" style={{ color: primaryColor }}>
                      {formatPrice(listing.price)}
                    </p>
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" style={{ color: accentColor }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* QR Section */}
      {config.qr_label && (
        <div className="max-w-lg mx-auto px-4 py-8 text-center">
          <div 
            className="inline-block p-4 rounded-2xl mb-3"
            style={{ backgroundColor: config.qr_background || '#FFFFFF' }}
          >
            <QrCode className="w-24 h-24" style={{ color: config.qr_color || primaryColor }} />
          </div>
          <p className="text-sm" style={{ color: primaryColor, opacity: 0.6 }}>
            {config.qr_label}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-sm" style={{ color: primaryColor, opacity: 0.4 }}>
          Propulsé par <span className="font-semibold" style={{ color: primaryColor }}>TrouveTonToit</span>
        </p>
      </div>

      {/* Lead Capture Form Modal */}
      {showLeadForm && (
        <LeadCaptureForm 
          onClose={() => setShowLeadForm(false)} 
          agentConfig={config}
        />
      )}
    </div>
  );
}
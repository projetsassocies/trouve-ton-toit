import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, User, Home, MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function GlobalSearch({ leads = [], listings = [], compact = false }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredLeads = leads.filter(lead => {
    const searchStr = `${lead.first_name} ${lead.last_name} ${lead.city} ${lead.email}`.toLowerCase();
    return searchStr.includes(query.toLowerCase());
  }).slice(0, 4);

  const filteredListings = listings.filter(listing => {
    const searchStr = `${listing.title} ${listing.city} ${listing.address}`.toLowerCase();
    return searchStr.includes(query.toLowerCase());
  }).slice(0, 4);

  const hasResults = filteredLeads.length > 0 || filteredListings.length > 0;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  return (
    <div ref={containerRef} className={cn("relative", compact ? "w-full min-w-0 max-w-[280px]" : "w-full max-w-[800px] mx-auto")}>
      <div className={cn(
        "flex items-center bg-white border border-[#EBEBEB] rounded-xl transition-all",
        compact ? "h-10 px-4" : "h-14 px-5",
        isOpen && query && "rounded-b-none border-b-0"
      )}>
        <Search className={cn("text-[#9CA3AF] flex-shrink-0", compact ? "w-4 h-4 mr-2" : "w-5 h-5 mr-3")} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={compact ? "Rechercher..." : "Rechercher un lead, un bien, une adresse..."}
          className={cn("flex-1 bg-transparent border-none outline-none placeholder:text-[#9CA3AF]", compact ? "text-sm" : "text-[15px]")}
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X className="w-4 h-4 text-[#9CA3AF]" />
          </button>
        )}
      </div>

      {isOpen && query && (
        <div className="absolute top-full left-0 right-0 bg-white border border-t-0 border-[#EBEBEB] rounded-b-xl z-50 max-h-[400px] overflow-y-auto">
          {!hasResults ? (
            <div className="p-6 text-center text-[#9CA3AF] text-sm">
              Aucun résultat pour "{query}"
            </div>
          ) : (
            <div className="py-2">
              {filteredLeads.length > 0 && (
                <div className="px-3 py-2">
                  <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-1">Leads</p>
                  {filteredLeads.map(lead => (
                    <Link
                      key={lead.id}
                      to={createPageUrl(`LeadDetail?id=${lead.id}`)}
                      onClick={() => { setQuery(''); setIsOpen(false); }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F9FAFB] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#f9ffed] flex items-center justify-center">
                        <User className="w-4 h-4 text-[#095237]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{lead.first_name} {lead.last_name}</p>
                        <p className="text-xs text-[#9CA3AF] truncate">
                          {lead.city || 'Ville non renseignée'} {lead.budget_max ? `• ${formatPrice(lead.budget_max)}` : ''}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {filteredListings.length > 0 && (
                <div className="px-3 py-2 border-t border-[#EBEBEB]">
                  <p className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wide mb-1">Biens</p>
                  {filteredListings.map(listing => (
                    <Link
                      key={listing.id}
                      to={createPageUrl(`ListingDetail?id=${listing.id}`)}
                      onClick={() => { setQuery(''); setIsOpen(false); }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#F9FAFB] transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center overflow-hidden">
                        {listing.images?.[0] ? (
                          <img src={listing.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Home className="w-4 h-4 text-emerald-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{listing.title}</p>
                        <p className="text-xs text-[#9CA3AF] truncate">
                          {listing.city} • {formatPrice(listing.price)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
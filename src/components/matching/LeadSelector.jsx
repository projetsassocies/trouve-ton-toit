import React from 'react';
import { Search, MapPin, Euro, User, Flame, Thermometer, Snowflake } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { LEAD_TYPE_LABELS, formatPrice, getScoreColor } from '@/lib/matching-engine';

const CATEGORIE_CONFIG = {
  CHAUD: { icon: Flame, color: 'text-red-500', bg: 'bg-red-50' },
  TIEDE: { icon: Thermometer, color: 'text-amber-500', bg: 'bg-amber-50' },
  FROID: { icon: Snowflake, color: 'text-blue-500', bg: 'bg-blue-50' },
};

export default function LeadSelector({
  leads,
  isLoading,
  selectedLeadId,
  onSelect,
  filters,
  onFilterChange,
}) {
  const { search = '', leadType = 'all', status = 'all', categorie = 'all' } = filters;

  const filtered = leads.filter(lead => {
    if (leadType !== 'all' && lead.lead_type !== leadType) return false;
    if (status !== 'all' && lead.status !== status) return false;
    if (categorie !== 'all' && lead.categorie !== categorie) return false;
    if (search) {
      const q = search.toLowerCase();
      const fullName = `${lead.first_name || ''} ${lead.last_name || ''}`.toLowerCase();
      const city = (lead.city || '').toLowerCase();
      if (!fullName.includes(q) && !city.includes(q) && !(lead.email || '').toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-3 border-b border-[#E5E5E5] space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
          <Input
            placeholder="Rechercher un lead..."
            value={search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9 h-9 rounded-xl border-[#E5E5E5] text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <Select value={leadType} onValueChange={(v) => onFilterChange({ ...filters, leadType: v })}>
            <SelectTrigger className="h-7 rounded-lg border-[#E5E5E5] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Type</SelectItem>
              <SelectItem value="acheteur">Acheteur</SelectItem>
              <SelectItem value="vendeur">Vendeur</SelectItem>
              <SelectItem value="locataire">Locataire</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => onFilterChange({ ...filters, status: v })}>
            <SelectTrigger className="h-7 rounded-lg border-[#E5E5E5] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Statut</SelectItem>
              <SelectItem value="nouveau">Nouveau</SelectItem>
              <SelectItem value="contacte">Contacté</SelectItem>
              <SelectItem value="en_negociation">Négo</SelectItem>
              <SelectItem value="converti">Converti</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categorie} onValueChange={(v) => onFilterChange({ ...filters, categorie: v })}>
            <SelectTrigger className="h-7 rounded-lg border-[#E5E5E5] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Catégorie</SelectItem>
              <SelectItem value="CHAUD">Chaud</SelectItem>
              <SelectItem value="TIEDE">Tiède</SelectItem>
              <SelectItem value="FROID">Froid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Count */}
      <div className="px-3 py-2 text-xs text-[#999999] border-b border-[#F0F0F0]">
        {filtered.length} lead{filtered.length > 1 ? 's' : ''}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center">
            <User className="w-8 h-8 text-[#CCCCCC] mx-auto mb-2" />
            <p className="text-sm text-[#999999]">Aucun lead trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F0F0F0]">
            {filtered.map((lead) => {
              const catConfig = CATEGORIE_CONFIG[lead.categorie] || CATEGORIE_CONFIG.FROID;
              const CatIcon = catConfig.icon;
              return (
                <div
                  key={lead.id}
                  onClick={() => onSelect(lead)}
                  className={cn(
                    "px-3 py-2.5 cursor-pointer transition-colors",
                    selectedLeadId === lead.id
                      ? "bg-[#c5ff4e]/10 border-l-2 border-l-[#c5ff4e]"
                      : "hover:bg-[#FAFAFA] border-l-2 border-l-transparent"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0", catConfig.bg)}>
                      <CatIcon className={cn("w-3.5 h-3.5", catConfig.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">
                          {lead.first_name} {lead.last_name}
                        </p>
                        {lead.lead_type && (
                          <Badge className={cn("text-[9px] px-1 py-0 leading-tight", LEAD_TYPE_LABELS[lead.lead_type]?.color)}>
                            {LEAD_TYPE_LABELS[lead.lead_type]?.label?.charAt(0)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-[#999999] mt-0.5">
                        {lead.city && (
                          <span className="flex items-center gap-0.5 truncate">
                            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                            {lead.city}
                          </span>
                        )}
                        {lead.budget_max && (
                          <span className="flex items-center gap-0.5 flex-shrink-0">
                            <Euro className="w-2.5 h-2.5" />
                            {formatPrice(lead.budget_max)}
                          </span>
                        )}
                      </div>
                    </div>
                    {lead.match_score > 0 && (
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-md border flex-shrink-0", getScoreColor(lead.match_score))}>
                        {lead.match_score}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

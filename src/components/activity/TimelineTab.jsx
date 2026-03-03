import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, FileText, CheckCircle2, Calendar, Search, Filter, MessageSquare, Target, CheckCircle, XCircle } from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const typeConfig = {
  call: { icon: Phone, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  email: { icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  sms: { icon: MessageSquare, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  visite: { icon: Calendar, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
  matching_proposition: { icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  matching_accepte: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  matching_refuse: { icon: XCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  note: { icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  task: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  event: { icon: Calendar, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
};

const statusLabels = {
  todo: 'À faire',
  in_progress: 'En cours',
  completed: 'Terminée',
};

export default function TimelineTab() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['activities'],
    queryFn: () => base44.entities.Activity.list('-created_date'),
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: notes = [], isLoading: loadingNotes } = useQuery({
    queryKey: ['notes'],
    queryFn: () => base44.entities.Note.list('-updated_date'),
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list('-date'),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['listings'],
    queryFn: () => base44.entities.Listing.list(),
  });

  const isLoading = loadingActivities || loadingTasks || loadingNotes || loadingEvents;

  // Activités : call, email, sms, visite, matching (proposition/accepte/refuse)
  const activityTypes = ['call', 'email', 'sms', 'visite', 'matching_proposition', 'matching_accepte', 'matching_refuse'];
  const activityItems = activities
    .filter(a => activityTypes.includes(a.type))
    .map(a => ({ ...a, itemType: 'activity', type: a.type, sortDate: a.created_date }));

  const taskItems = tasks.map(t => ({
    ...t,
    itemType: 'task',
    type: 'task',
    sortDate: t.created_date,
    title: t.title,
    content: t.description,
    linked_to_type: t.linked_to_type,
    linked_to_id: t.linked_to_id,
  }));

  const noteItems = notes.map(n => ({
    ...n,
    itemType: 'note',
    type: 'note',
    sortDate: n.updated_date || n.created_date,
    title: n.title,
    content: n.content,
    linked_to_type: n.linked_to_type,
    linked_to_id: n.linked_to_id,
  }));

  const eventItems = events.map(e => ({
    ...e,
    itemType: 'event',
    type: 'event',
    sortDate: e.date || e.created_date,
    title: e.title,
    content: e.description,
    linked_to_type: e.linked_to_type,
    linked_to_id: e.linked_to_id,
  }));

  const allItems = [...activityItems, ...taskItems, ...noteItems, ...eventItems].sort(
    (a, b) => new Date(b.sortDate) - new Date(a.sortDate)
  );

  const getLinkedItem = (item) => {
    if (!item.linked_to_id) return null;
    if (item.linked_to_type === 'lead') {
      return leads.find(l => l.id === item.linked_to_id);
    }
    return listings.find(l => l.id === item.linked_to_id);
  };

  const getSearchableText = (item) => {
    const parts = [item.title, item.content, item.description].filter(Boolean);
    return parts.join(' ').toLowerCase();
  };

  const filteredItems = allItems.filter(item => {
    const matchSearch =
      search === '' || getSearchableText(item).includes(search.toLowerCase());
    const matchType =
      typeFilter === 'all' || item.type === typeFilter;
    return matchSearch && matchType;
  });

  const getDateLabel = (date) => {
    if (!date) return 'Date inconnue';
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Date invalide';
    if (isToday(d)) return "Aujourd'hui";
    if (isYesterday(d)) return 'Hier';
    if (isThisWeek(d)) return 'Cette semaine';
    return format(d, 'MMMM yyyy', { locale: fr });
  };

  const groupedItems = filteredItems.reduce((groups, item) => {
    const label = getDateLabel(item.sortDate);
    if (!groups[label]) groups[label] = [];
    groups[label].push(item);
    return groups;
  }, {});

  if (isLoading) {
    return <div className="text-center py-12 text-[#999999]">Chargement...</div>;
  }

  if (filteredItems.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-[#CCCCCC]" />
        </div>
        <h3 className="font-semibold mb-2">Aucune activité pour le moment</h3>
        <p className="text-sm text-[#999999]">
          Commencez par ajouter un appel, un email, une note, une tâche ou un événement
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 rounded-xl border-[#E5E5E5]"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48 rounded-xl border-[#E5E5E5]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="call">📞 Appels</SelectItem>
              <SelectItem value="email">📧 Emails</SelectItem>
              <SelectItem value="sms">💬 SMS</SelectItem>
              <SelectItem value="visite">🏠 Visites</SelectItem>
              <SelectItem value="matching_proposition">🎯 Biens proposés</SelectItem>
              <SelectItem value="matching_accepte">✅ Biens acceptés</SelectItem>
              <SelectItem value="matching_refuse">❌ Biens refusés</SelectItem>
              <SelectItem value="note">📝 Notes</SelectItem>
              <SelectItem value="task">✅ Tâches</SelectItem>
              <SelectItem value="event">📅 Événements</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Unified Timeline */}
      <div className="space-y-8">
        {Object.entries(groupedItems).map(([dateLabel, items]) => (
          <div key={dateLabel}>
            <h3 className="text-sm font-semibold text-[#666666] mb-4">{dateLabel}</h3>
            <div className="relative space-y-4 pl-8 before:absolute before:left-2 before:top-0 before:bottom-0 before:w-px before:bg-[#E5E5E5]">
              {items.map(item => {
                const config = typeConfig[item.type] || typeConfig.note;
                const Icon = config.icon;
                const linkedItem = getLinkedItem(item);
                const displayContent = item.content || item.description;

                return (
                  <div key={`${item.itemType}-${item.id}`} className="relative">
                    <div
                      className={cn(
                        'absolute -left-6 w-4 h-4 rounded-full border-2 border-white',
                        config.bg
                      )}
                    >
                      <div className={cn('w-full h-full rounded-full', config.bg)} />
                    </div>

                    <div className="bg-white rounded-xl border border-[#E5E5E5] p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center border',
                            config.bg,
                            config.border
                          )}
                        >
                          <Icon className={cn('w-5 h-5', config.color)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium">{item.title || 'Sans titre'}</h4>
                            <span className="text-xs text-[#999999]">
                              {item.sortDate &&
                                format(new Date(item.sortDate), 'HH:mm', { locale: fr })}
                            </span>
                            {item.itemType === 'task' && (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  'text-xs',
                                  item.status === 'completed' && 'bg-green-100 text-green-700',
                                  item.status === 'in_progress' && 'bg-blue-100 text-blue-700'
                                )}
                              >
                                {statusLabels[item.status] || item.status}
                              </Badge>
                            )}
                            {item.itemType === 'event' && item.date && (
                              <span className="text-xs text-[#666666]">
                                📅 {format(new Date(item.date), 'dd MMM HH:mm', { locale: fr })}
                              </span>
                            )}
                          </div>

                          {displayContent && (
                            <p className="text-sm text-[#666666] mb-2 line-clamp-3">
                              {displayContent}
                            </p>
                          )}

                          <div className="flex items-center gap-2 flex-wrap">
                            {linkedItem && (
                              <Link
                                to={createPageUrl(
                                  item.linked_to_type === 'lead' ? 'LeadDetail' : 'ListingDetail',
                                  `id=${item.linked_to_id}`
                                )}
                              >
                                <Badge variant="outline" className="hover:bg-[#F5F5F5]">
                                  {item.linked_to_type === 'lead' ? '👤' : '🏠'}{' '}
                                  {item.linked_to_type === 'lead'
                                    ? `${linkedItem.first_name} ${linkedItem.last_name}`
                                    : linkedItem.title}
                                </Badge>
                              </Link>
                            )}
                            {item.tags?.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Phone, 
  Mail, 
  FileText, 
  CheckSquare, 
  Calendar,
  ChevronRight,
  Activity,
  Home,
  Users
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';

const activityConfig = {
  call: { icon: Phone, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  email: { icon: Mail, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-200' },
  note: { icon: FileText, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' },
  task: { icon: CheckSquare, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200' },
  event: { icon: Calendar, color: 'text-pink-500', bg: 'bg-pink-50', border: 'border-pink-200' },
  visit: { icon: Home, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200' },
  meeting: { icon: Users, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-200' },
};

export default function RecentActivity({ user }) {
  const { data: allActivities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['recent-activities', user?.email],
    queryFn: () => base44.entities.Activity.filter({ created_by: user.email }, '-created_date', 20),
    enabled: !!user?.email,
  });

  const { data: allEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['recent-events', user?.email],
    queryFn: () => base44.entities.Event.filter({ created_by: user.email }, '-created_date', 10),
    enabled: !!user?.email,
  });

  const isLoading = loadingActivities || loadingEvents;

  const recentItems = [
    ...allActivities
      .filter(a => a.type === 'call' || a.type === 'email')
      .map(a => ({
        id: `act-${a.id}`,
        icon: a.type,
        title: a.title || a.description || 'Activité',
        subtitle: a.description || a.content || 'Pas de description',
        date: a.created_date,
      })),
    ...allEvents.map(e => ({
      id: `evt-${e.id}`,
      icon: e.type || 'event',
      title: e.title,
      subtitle: e.date ? format(new Date(e.date), "dd MMM yyyy 'à' HH:mm", { locale: fr }) : (e.description || 'Événement'),
      date: e.created_date,
    })),
  ]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 4);

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    if (!isValid(date)) return 'Date invalide';
    return format(date, 'd MMM', { locale: fr });
  };

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
      <div className="p-5 border-b border-[#E5E5E5] flex items-center justify-between">
        <h2 className="font-semibold">Activité récente</h2>
        <Link 
          to={createPageUrl('Activity')}
          className="text-sm text-[#999999] hover:text-black flex items-center gap-1 transition-colors"
        >
          Voir tout
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
      
      {isLoading ? (
        <div className="p-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : recentItems.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
            <Activity className="w-6 h-6 text-[#999999]" />
          </div>
          <p className="text-[#999999] text-sm">Aucune activité récente</p>
        </div>
      ) : (
        <div className="p-3 space-y-1">
          {recentItems.map((item) => {
            const config = activityConfig[item.icon] || activityConfig.event;
            const Icon = config.icon;
            
            return (
              <div
                key={item.id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#FAFAFA] transition-colors"
              >
                <div className={`w-10 h-10 rounded-lg ${config.bg} border ${config.border} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${config.color}`} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-[#999999] truncate">
                    {item.subtitle}
                  </p>
                </div>
                
                <div className="text-xs text-[#999999] flex-shrink-0">
                  {formatDate(item.date)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
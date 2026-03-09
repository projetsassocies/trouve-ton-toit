import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Home, Users, Sparkles, CheckCircle2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function NotificationPopover({ user }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.email],
    queryFn: () => base44.entities.Notification.filter({ created_by: user.email }, '-created_date', 20),
    enabled: !!user?.email,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { read: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification supprimée');
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const unreadNotifs = notifications.filter(n => !n.read);
      await Promise.all(unreadNotifs.map(n => base44.entities.Notification.update(n.id, { read: true })));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Tout marqué comme lu');
    },
  });

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    setOpen(false);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_lead_matches':
        return <Home className="w-4 h-4 text-blue-600" />;
      case 'new_listing_matches':
        return <Users className="w-4 h-4 text-purple-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="rounded-xl border-[#EBEBEB] shadow-none hover:bg-[#FAFAFA] relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(24rem,calc(100vw-2rem))] p-0 rounded-2xl border-[#EBEBEB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]" align="end">
        {/* Header */}
        <div className="p-4 border-b border-[#EBEBEB] flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="h-8 text-xs rounded-lg"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6 text-[#CCCCCC]" />
              </div>
              <p className="text-sm text-[#999999]">Aucune notification</p>
            </div>
          ) : (
            <div className="divide-y divide-[#E5E5E5]">
              {notifications.map((notification) => {
                const isUnread = !notification.read;
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "p-3 hover:bg-[#FAFAFA] transition-colors relative",
                      isUnread && "bg-blue-50/30"
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                        notification.type === 'new_lead_matches' && "bg-blue-100",
                        notification.type === 'new_listing_matches' && "bg-purple-100",
                        notification.type === 'info' && "bg-gray-100"
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={cn(
                            "text-sm mb-1 flex items-center gap-2",
                            isUnread && "font-semibold"
                          )}>
                            {notification.title}
                            {isUnread && (
                              <span className="inline-block w-1.5 h-1.5 bg-blue-600 rounded-full" />
                            )}
                          </h4>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotificationMutation.mutate(notification.id);
                            }}
                            className="rounded-lg h-6 w-6 text-rose-600 hover:text-rose-700 hover:bg-rose-50 flex-shrink-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-[#666666] mb-2">{notification.message}</p>
                        
                        {notification.match_count !== undefined && (
                          <Badge variant="secondary" className="text-xs mb-2">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {notification.match_count} correspondance{notification.match_count > 1 ? 's' : ''}
                          </Badge>
                        )}

                        {/* Action Links */}
                        {(notification.linked_lead_id || notification.linked_listing_id) && (
                          <div className="flex gap-2 mb-2">
                            {notification.linked_lead_id && (
                              <Link
                                to={createPageUrl(`LeadDetail?id=${notification.linked_lead_id}`)}
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <Button variant="outline" size="sm" className="rounded-lg h-7 text-xs">
                                  Voir le lead
                                </Button>
                              </Link>
                            )}
                            {notification.linked_listing_id && (
                              <Link
                                to={createPageUrl(`ListingDetail?id=${notification.linked_listing_id}`)}
                                onClick={() => handleNotificationClick(notification)}
                              >
                                <Button variant="outline" size="sm" className="rounded-lg h-7 text-xs">
                                  Voir le bien
                                </Button>
                              </Link>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-[#999999]">
                          {format(new Date(notification.created_date), "dd MMM 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
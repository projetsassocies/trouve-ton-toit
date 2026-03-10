import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X, Sparkles, Home, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export default function NotificationToast({ user }) {
  const [notifications, setNotifications] = useState([]);
  const [visibleNotifs, setVisibleNotifs] = useState([]);

  useEffect(() => {
    if (!user?.email) return;

    // Charger les notifications non lues
    const loadNotifications = async () => {
      try {
        const unreadNotifs = await base44.entities.Notification.filter(
          { created_by: user.email, read: false },
          '-created_date',
          10
        );
        setNotifications(unreadNotifs);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();

    // S'abonner aux nouvelles notifications en temps réel
    const unsubscribe = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data.created_by === user.email && !event.data.read) {
        setNotifications(prev => [event.data, ...prev]);
        // Afficher la notification
        setVisibleNotifs(prev => [...prev, event.data.id]);
        // Auto-masquer après 8 secondes
        setTimeout(() => {
          setVisibleNotifs(prev => prev.filter(id => id !== event.data.id));
        }, 8000);
      } else if (event.type === 'update' && event.data.read) {
        setNotifications(prev => prev.filter(n => n.id !== event.data.id));
        setVisibleNotifs(prev => prev.filter(id => id !== event.data.id));
      } else if (event.type === 'delete') {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
        setVisibleNotifs(prev => prev.filter(id => id !== event.id));
      }
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (notifId) => {
    try {
      await base44.entities.Notification.update(notifId, { read: true });
      setVisibleNotifs(prev => prev.filter(id => id !== notifId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotifLink = (notif) => {
    if (notif.linked_lead_id) {
      return createPageUrl(`LeadDetail?id=${notif.linked_lead_id}`);
    }
    if (notif.linked_listing_id) {
      return createPageUrl(`ListingDetail?id=${notif.linked_listing_id}`);
    }
    return createPageUrl('Matching');
  };

  const getNotifIcon = (type) => {
    if (type === 'new_lead_matches') return <Users className="w-5 h-5" />;
    if (type === 'new_listing_matches') return <Home className="w-5 h-5" />;
    return <Sparkles className="w-5 h-5" />;
  };

  const displayedNotifs = notifications.filter(n => visibleNotifs.includes(n.id));

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-md">
      <AnimatePresence>
        {displayedNotifs.map((notif) => (
          <motion.div
            key={notif.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Link
              to={getNotifLink(notif)}
              className="block bg-white rounded-2xl border border-[#E5E5E5] shadow-xl hover:shadow-2xl transition-all p-4 group"
            >
              <div className="flex gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                  notif.type === 'new_lead_matches' && "bg-blue-50 text-blue-600",
                  notif.type === 'new_listing_matches' && "bg-purple-50 text-purple-600"
                )}>
                  {getNotifIcon(notif.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="font-semibold text-sm leading-tight">
                      {notif.title}
                    </h4>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markAsRead(notif.id);
                      }}
                      className="flex-shrink-0 w-6 h-6 rounded-lg hover:bg-[#F5F5F5] flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4 text-[#999999]" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-[#666666] leading-relaxed line-clamp-2">
                    {notif.message}
                  </p>
                  
                  {notif.match_count !== undefined && (
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded-lg bg-primary/20 text-primary-foreground text-xs font-medium">
                      <Sparkles className="w-3 h-3 mr-1" />
                      {notif.match_count} correspondance{notif.match_count > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
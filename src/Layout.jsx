import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import ThemeToggle from '@/components/dashboard/ThemeToggle';
import GlobalSearch from '@/components/dashboard/GlobalSearch';
import NotificationPopover from '@/components/notifications/NotificationPopover';
import {
  LayoutDashboard,
  Users,
  Home,
  Palette,
  Settings,
  Menu,
  X,
  ExternalLink,
  LogOut,
  ChevronRight,
  Activity,
  BarChart3,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationToast from '@/components/notifications/NotificationToast';

const navItems = [
  { label: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { label: 'Leads', page: 'Leads', icon: Users },
  { label: 'Biens', page: 'Listings', icon: Home },
  { label: 'Analyse', page: 'Matching', icon: BarChart3 },
  { label: 'Activité', page: 'Activity', icon: Activity },
  { label: 'Social Page', page: 'SocialBuilder', icon: Palette },
  { label: 'Paramètres', page: 'Settings', icon: Settings },
];

function getGreetingMessage(firstName = '') {
  const hour = new Date().getHours();
  let greeting = '';
  const morningMotivations = ["Excellente journée à vous !", "Prêt(e) à conquérir de nouveaux mandats ?", "C'est parti pour une journée productive !"];
  const afternoonMotivations = ["Continuez sur cette lancée !", "Vous faites un travail formidable !", "Encore quelques visites et c'est dans la poche !"];
  const eveningMotivations = ["Belle journée accomplie !", "Bravo pour vos efforts aujourd'hui !", "Préparez demain en toute sérénité"];
  let motivations = morningMotivations;
  if (hour >= 5 && hour < 12) {
    greeting = `Bonjour, ${firstName || 'vous'}`;
    motivations = morningMotivations;
  } else if (hour >= 12 && hour < 18) {
    greeting = `Bon après-midi, ${firstName || 'vous'}`;
    motivations = afternoonMotivations;
  } else {
    greeting = `Bonsoir, ${firstName || 'vous'}`;
    motivations = eveningMotivations;
  }
  const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)];
  return { greeting, motivation: randomMotivation };
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads', user?.email],
    queryFn: () => api.entities.Lead.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['listings', user?.email],
    queryFn: () => api.entities.Listing.filter({ created_by: user.email }, '-created_date', 50),
    enabled: !!user?.email,
  });

  const [greetingMessage, setGreetingMessage] = useState(() =>
    getGreetingMessage(user?.full_name?.trim().split(' ')[0])
  );

  useEffect(() => {
    setGreetingMessage(getGreetingMessage(user?.full_name?.trim().split(' ')[0]));
    const interval = setInterval(() => {
      setGreetingMessage(getGreetingMessage(user?.full_name?.trim().split(' ')[0]));
    }, 60000);
    return () => clearInterval(interval);
  }, [user?.full_name]);

  const handleLogout = () => {
    logout();
  };

  if (currentPageName === 'SocialPage') {
    return <>{children}</>;
  }

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-60';
  const mainMargin = sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-60';

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {user && <NotificationToast user={user} />}

      <style>{`
        .sidebar-link {
          transition: all 0.2s ease;
        }
        .sidebar-link:hover {
          background: hsl(var(--muted));
        }
        .sidebar-link.active {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        .sidebar-link.active svg {
          color: hsl(var(--primary-foreground));
        }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-50 flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-semibold text-lg tracking-tight">TrouveTonToit</span>
        <div className="w-9" />
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full border-r border-border bg-card z-50 transition-all duration-300 ease-out',
          sidebarWidth,
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo + Collapse - h-[72px] pour aligner avec le header */}
          <div className="flex h-[72px] min-h-[72px] items-center border-b border-border justify-between px-4 gap-2 shrink-0">
            {!sidebarCollapsed && (
              <span className="font-semibold text-lg tracking-tight truncate flex-1 min-w-0">TrouveTonToit</span>
            )}
            <button
              onClick={() => {
                setSidebarCollapsed(!sidebarCollapsed);
                if (sidebarOpen) setSidebarOpen(false);
              }}
              className={cn(
                'p-2 hover:bg-muted rounded-lg transition-colors flex-shrink-0',
                sidebarCollapsed && 'w-full justify-center flex'
              )}
              title={sidebarCollapsed ? 'Agrandir' : 'Réduire'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 hover:bg-muted rounded-lg flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'sidebar-link flex items-center rounded-lg text-sm font-medium',
                    sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                    isActive ? 'active' : 'text-muted-foreground'
                  )}
                  title={sidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={cn('w-4 h-4 flex-shrink-0', isActive && 'text-primary-foreground')} />
                  {!sidebarCollapsed && item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-3 border-t border-border space-y-2">
            <Link
              to={createPageUrl('SocialPage')}
              target="_blank"
              className={cn(
                'flex items-center rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors',
                sidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
              )}
              title="Voir ma page"
            >
              <ExternalLink className={cn('w-4 h-4 flex-shrink-0', !sidebarCollapsed && 'text-muted-foreground')} />
              {!sidebarCollapsed && (
                <>
                  Voir ma page
                  <ChevronRight className="w-3 h-3 ml-auto" />
                </>
              )}
            </Link>
            {user && (
              sidebarCollapsed ? (
                <div className="flex justify-center">
                  <button
                    onClick={handleLogout}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                    title="Déconnexion"
                  >
                    <LogOut className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <div className="px-3 py-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  <button
                    onClick={handleLogout}
                    className="mt-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <LogOut className="w-3 h-3" />
                    Déconnexion
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn('min-h-screen pt-16 lg:pt-0', mainMargin)}>
        {/* Header - fixed, h-[72px] pour aligner la bordure avec la sidebar */}
        <header
          className={cn(
            'fixed z-40 right-0 h-[72px] min-h-[72px] flex items-center border-b border-border bg-card',
            'top-16 lg:top-0',
            sidebarCollapsed ? 'lg:left-16' : 'lg:left-60',
            'left-0'
          )}
        >
          <div className="flex flex-1 flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 px-4 lg:px-8 py-3">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-semibold truncate">{greetingMessage.greeting}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{greetingMessage.motivation}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <GlobalSearch leads={leads} listings={listings} compact />
              <ThemeToggle />
              <NotificationPopover user={user} />
            </div>
          </div>
        </header>

        {/* Page Content - pt responsive: mobile (header 64+72px) + gap 40px = 176px, desktop (72px) + gap 40px = 112px */}
        <div className="overflow-x-hidden p-4 pb-8 lg:p-8 lg:pb-8 max-w-[100vw] pt-[11rem] lg:pt-[7rem]">
          {children}
        </div>
      </main>
    </div>
  );
}

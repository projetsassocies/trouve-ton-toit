import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useAuth } from '@/lib/AuthContext';
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
  BarChart3
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

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  if (currentPageName === 'SocialPage') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {user && <NotificationToast user={user} />}

      <style>{`
        :root {
          --primary: #000000;
          --primary-foreground: #FFFFFF;
          --secondary: #F5F5F5;
          --border: #E5E5E5;
          --text: #111111;
          --text-muted: #666666;
        }
        
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }
        
        .sidebar-link {
          transition: all 0.2s ease;
        }
        
        .sidebar-link:hover {
          background: #F5F5F5;
        }
        
        .sidebar-link.active {
          background: #c5ff4e;
          color: #000000;
        }

        .sidebar-link.active svg {
          color: #000000;
        }
      `}</style>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E5E5E5] z-50 flex items-center justify-between px-4">
        <button 
          onClick={() => setSidebarOpen(true)}
          className="p-2 hover:bg-[#F5F5F5] rounded-lg transition-colors"
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
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-white border-r border-[#E5E5E5] z-50 transition-transform duration-300 ease-out",
        "lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-[#E5E5E5]">
            <span className="font-semibold text-lg tracking-tight">TrouveTonToit</span>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 hover:bg-[#F5F5F5] rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPageName === item.page;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium",
                    isActive ? "active" : "text-[#666666]"
                  )}
                >
                  <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-[#999999]")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div className="p-3 border-t border-[#E5E5E5] space-y-2">
            <Link
              to={createPageUrl('SocialPage')}
              target="_blank"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#666666] hover:bg-[#F5F5F5] transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-[#999999]" />
              Voir ma page
              <ChevronRight className="w-3 h-3 ml-auto text-[#CCCCCC]" />
            </Link>
            
            {user && (
              <div className="px-3 py-3 bg-[#F5F5F5] rounded-lg">
                <p className="text-sm font-medium text-[#111111] truncate">{user.full_name || user.email}</p>
                <p className="text-xs text-[#999999] truncate">{user.email}</p>
                <button
                  onClick={handleLogout}
                  className="mt-2 flex items-center gap-2 text-xs text-[#666666] hover:text-[#111111] transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                  Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

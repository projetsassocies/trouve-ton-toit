import { Home, Users, Building2, BarChart3, Activity, Globe, Settings, LogOut, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', icon: Home, active: true },
  { name: 'Leads', icon: Users, active: false },
  { name: 'Biens', icon: Building2, active: false },
  { name: 'Analyse', icon: BarChart3, active: false },
  { name: 'Activité', icon: Activity, active: false },
  { name: 'Social Page', icon: Globe, active: false },
  { name: 'Paramètres', icon: Settings, active: false },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className={`flex h-screen flex-col border-r bg-card transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-60'}`}>
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b justify-between">
        {!isCollapsed && <h1 className="text-xl font-semibold">TrouveTonToit</h1>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`h-8 w-8 ${isCollapsed ? 'mx-auto' : ''}`}
        >
          {isCollapsed ? (
            <PanelLeft className="h-5 w-5" />
          ) : (
            <PanelLeftClose className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => (
          <Button
            key={item.name}
            variant={item.active ? 'default' : 'ghost'}
            className={`w-full ${isCollapsed ? 'justify-center px-2' : 'justify-start'}`}
            title={isCollapsed ? item.name : undefined}
          >
            <item.icon className={`h-5 w-5 ${isCollapsed ? '' : 'mr-3'}`} />
            {!isCollapsed && item.name}
          </Button>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t p-4">
        {!isCollapsed ? (
          <>
            <div className="mb-3 flex items-center gap-3">
              <Avatar>
                <AvatarFallback>G</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Grace test</p>
                <p className="text-xs text-muted-foreground truncate">danye.services@gmail.com</p>
              </div>
            </div>
            <Button variant="ghost" className="w-full justify-start">
              <LogOut className="mr-3 h-4 w-4" />
              Déconnexion
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">G</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Déconnexion">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { 
  User, 
  Mail, 
  Lock, 
  Save, 
  Loader2,
  Shield,
  Bell,
  Palette,
  CreditCard,
  HelpCircle,
  ChevronRight,
  LogOut,
  Plug
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function Settings() {
  const { user, logout } = useAuth();
  const [activeSection, setActiveSection] = useState('profile');
  
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [notifications, setNotifications] = useState({
    email_new_lead: true,
    email_weekly_report: true,
    push_notifications: false,
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        full_name: user.full_name || '',
        email: user.email || '',
      }));
      if (user.notifications) {
        setNotifications(user.notifications);
      }
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe(data);
    },
    onSuccess: () => {
      toast.success('Paramètres enregistrés');
    },
  });

  const handleSave = () => {
    const updateData = {
      full_name: formData.full_name,
      notifications,
    };
    updateMutation.mutate(updateData);
  };

  const handleLogout = () => {
    logout();
  };

  const sections = [
    { id: 'profile', label: 'Profil', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'integrations', label: 'Intégrations', icon: Plug, isLink: true, href: 'Integration' },
    { id: 'appearance', label: 'Apparence', icon: Palette },
    { id: 'billing', label: 'Facturation', icon: CreditCard },
    { id: 'help', label: 'Aide', icon: HelpCircle },
  ];

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl lg:col-span-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
          <p className="text-[#999999] mt-1">Gérez votre compte et vos préférences</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="bg-black hover:bg-black/90 text-white rounded-xl"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Enregistrer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-3 h-fit">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              
              if (section.isLink) {
                return (
                  <Link
                    key={section.id}
                    to={createPageUrl(section.href)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-[#666666] hover:bg-[#F5F5F5]"
                  >
                    <Icon className="w-4 h-4 text-[#999999]" />
                    {section.label}
                    <ChevronRight className="w-3 h-3 ml-auto text-[#CCCCCC]" />
                  </Link>
                );
              }
              
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    activeSection === section.id
                      ? "bg-black text-white"
                      : "text-[#666666] hover:bg-[#F5F5F5]"
                  )}
                >
                  <Icon className={cn(
                    "w-4 h-4",
                    activeSection === section.id ? "text-white" : "text-[#999999]"
                  )} />
                  {section.label}
                </button>
              );
            })}
          </nav>
          
          <div className="border-t border-[#E5E5E5] mt-3 pt-3">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-6">
          {activeSection === 'profile' && (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
              <h2 className="font-semibold mb-6">Informations du profil</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-[#999999] mb-1.5 block">Nom complet</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="pl-10 rounded-xl"
                      placeholder="Votre nom"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-[#999999] mb-1.5 block">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
                    <Input
                      type="email"
                      value={formData.email}
                      disabled
                      className="pl-10 rounded-xl bg-[#F5F5F5]"
                    />
                  </div>
                  <p className="text-xs text-[#999999] mt-1.5">L'email ne peut pas être modifié</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
              <h2 className="font-semibold mb-6">Préférences de notification</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-[#E5E5E5]">
                  <div>
                    <p className="font-medium text-sm">Nouveaux leads</p>
                    <p className="text-xs text-[#999999] mt-0.5">Recevoir un email pour chaque nouveau lead</p>
                  </div>
                  <Switch
                    checked={notifications.email_new_lead}
                    onCheckedChange={(checked) => setNotifications({...notifications, email_new_lead: checked})}
                  />
                </div>
                <div className="flex items-center justify-between py-3 border-b border-[#E5E5E5]">
                  <div>
                    <p className="font-medium text-sm">Rapport hebdomadaire</p>
                    <p className="text-xs text-[#999999] mt-0.5">Résumé de votre activité chaque semaine</p>
                  </div>
                  <Switch
                    checked={notifications.email_weekly_report}
                    onCheckedChange={(checked) => setNotifications({...notifications, email_weekly_report: checked})}
                  />
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm">Notifications push</p>
                    <p className="text-xs text-[#999999] mt-0.5">Notifications sur votre appareil</p>
                  </div>
                  <Switch
                    checked={notifications.push_notifications}
                    onCheckedChange={(checked) => setNotifications({...notifications, push_notifications: checked})}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
              <h2 className="font-semibold mb-6">Sécurité du compte</h2>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm text-[#999999] mb-1.5 block">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
                    <Input
                      type="password"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                      className="pl-10 rounded-xl"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-[#999999] mb-1.5 block">Confirmer le mot de passe</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
                    <Input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                      className="pl-10 rounded-xl"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <p className="text-xs text-[#999999]">
                  Le mot de passe doit contenir au moins 8 caractères
                </p>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
              <h2 className="font-semibold mb-6">Apparence</h2>
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
                  <Palette className="w-6 h-6 text-[#CCCCCC]" />
                </div>
                <p className="text-sm text-[#999999]">Options de personnalisation bientôt disponibles</p>
              </div>
            </div>
          )}

          {activeSection === 'billing' && (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
              <h2 className="font-semibold mb-6">Facturation</h2>
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-3">
                  <CreditCard className="w-6 h-6 text-[#CCCCCC]" />
                </div>
                <p className="text-sm text-[#999999]">Gestion de facturation bientôt disponible</p>
              </div>
            </div>
          )}

          {activeSection === 'help' && (
            <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
              <h2 className="font-semibold mb-6">Centre d'aide</h2>
              <div className="space-y-3">
                {[
                  { title: 'Guide de démarrage', desc: 'Apprenez les bases de TrouveTonToit' },
                  { title: 'FAQ', desc: 'Questions fréquemment posées' },
                  { title: 'Contacter le support', desc: 'Nous sommes là pour vous aider' },
                ].map((item, index) => (
                  <button
                    key={index}
                    className="w-full flex items-center justify-between p-4 bg-[#F5F5F5] rounded-xl hover:bg-[#E5E5E5] transition-colors"
                  >
                    <div className="text-left">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-[#999999] mt-0.5">{item.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#CCCCCC]" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
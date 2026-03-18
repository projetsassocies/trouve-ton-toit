import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { api } from '@/api/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Mail, Copy, CheckCircle2, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { Skeleton } from '@/components/ui/skeleton';

export default function Integration() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [dedicatedEmail, setDedicatedEmail] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      setIsEnabled(user.email_lead_capture_enabled || false);
      const emailPrefix = user.email?.split('@')[0] || 'agent';
      setDedicatedEmail(`leads-${emailPrefix}@trouvetontoit.app`);
    }
  }, [user]);

  const handleToggle = async (checked) => {
    setIsEnabled(checked);
    try {
      await api.auth.updateMe({ email_lead_capture_enabled: checked });
      toast.success(`Intégration ${checked ? 'activée' : 'désactivée'}.`);
    } catch (e) {
      toast.error("Erreur lors de la sauvegarde.");
      setIsEnabled(!checked);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(dedicatedEmail);
    setCopied(true);
    toast.success("Adresse e-mail copiée !");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <div>
            <Skeleton className="h-7 w-64 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={createPageUrl('Settings')}>
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Intégrations
          </h1>
          <p className="text-[#999999] text-sm mt-0.5">
            Configurez vos outils d'automatisation.
          </p>
        </div>
      </div>

      {/* Capture de Leads par E-mail */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <Mail className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Capture de Leads par E-mail</h2>
                <p className="text-sm text-[#666666]">
                  L'IA analyse vos e-mails transférés et crée automatiquement des leads.
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={handleToggle}
                className="data-[state=checked]:bg-black"
              />
            </div>
          </div>
        </div>

        {isEnabled && (
          <div className="space-y-4 pt-4 border-t border-[#E5E5E5]">
            <div>
              <label className="text-sm text-[#999999] mb-1.5 block">
                Votre adresse e-mail dédiée
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={dedicatedEmail}
                  readOnly
                  className="rounded-xl bg-gray-50 border-[#E5E5E5] focus:border-black focus:ring-0"
                />
                <Button 
                  onClick={copyToClipboard}
                  variant="outline"
                  className="rounded-xl"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-[#999999] mt-2">
                Configurez un transfert automatique depuis votre boîte de réception vers cette adresse.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">Assistant WhatsApp</h2>
                <p className="text-sm text-[#666666]">
                  Gérez vos leads directement via WhatsApp.
                </p>
              </div>
              <a 
                href={'#'} 
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-green-600 hover:bg-green-700 text-white rounded-xl">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Connecter
                </Button>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Instructions détaillées */}
      <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-4">
        <h2 className="font-semibold text-lg">Comment ça marche ?</h2>
        <ol className="list-decimal list-inside text-sm text-[#666666] space-y-2">
          <li>
            Activez la "Capture de Leads par E-mail" ci-dessus.
          </li>
          <li>
            Copiez l'adresse e-mail dédiée fournie.
          </li>
          <li>
            Allez dans les paramètres de votre boîte de réception (Gmail, Outlook, etc.) et configurez une règle de transfert automatique vers cette adresse.
          </li>
          <li>
            Notre IA analysera chaque e-mail transféré, extraira les informations pertinentes (nom, contact, critères) et créera un nouveau lead dans votre CRM.
          </li>
          <li>
            Retrouvez tous vos leads capturés dans la section "Leads" de TrouveTonToit.
          </li>
        </ol>
      </div>
    </div>
  );
}
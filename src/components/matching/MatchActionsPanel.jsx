import React, { useState } from 'react';
import {
  Mail, MessageSquare, CalendarPlus, StickyNote,
  CheckCircle2, XCircle, Clock, ArrowRight,
  ChevronRight, Send, Loader2, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { MATCH_STATUSES, formatPrice } from '@/lib/matching-engine';
import MatchStatusBadge from './MatchStatusBadge';

export default function MatchActionsPanel({
  mode,
  selectedEntity,
  selectedMatch,
  matchRecord,
  onUpdateMatchStatus,
  onSendEmail,
  onSendSMS,
  onScheduleVisit,
  onAddNote,
  isUpdating,
}) {
  const [activeDialog, setActiveDialog] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [smsBody, setSmsBody] = useState('');

  const isLeadMode = mode === 'lead-to-listing';

  if (!selectedEntity || !selectedMatch) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Eye className="w-10 h-10 text-[#E5E5E5] mb-3" />
        <p className="text-sm text-[#999999]">
          Sélectionnez un résultat pour voir les actions disponibles
        </p>
      </div>
    );
  }

  const matchName = isLeadMode
    ? (selectedMatch.title || 'Ce bien')
    : `${selectedMatch.first_name} ${selectedMatch.last_name}`;

  const leadName = isLeadMode
    ? `${selectedEntity.first_name} ${selectedEntity.last_name}`
    : `${selectedMatch.first_name} ${selectedMatch.last_name}`;

  const listingTitle = isLeadMode
    ? (selectedMatch.title || 'Bien')
    : (selectedEntity.title || 'Bien');

  const listingPrice = isLeadMode ? selectedMatch.price : selectedEntity.price;
  const listingCity = isLeadMode ? selectedMatch.city : selectedEntity.city;

  const handlePropose = () => {
    const defaultSubject = `Proposition de bien : ${listingTitle}`;
    const defaultBody = `Bonjour ${leadName},\n\nJ'ai trouvé un bien qui pourrait vous intéresser :\n\n${listingTitle}\n${listingCity} - ${formatPrice(listingPrice)}\n\nSouhaitez-vous organiser une visite ?\n\nCordialement`;
    setEmailSubject(defaultSubject);
    setEmailBody(defaultBody);
    setActiveDialog('email');
  };

  const handleSMS = () => {
    const defaultSMS = `Bonjour ${leadName}, j'ai un bien qui pourrait vous plaire : ${listingTitle} à ${listingCity} (${formatPrice(listingPrice)}). Voulez-vous le visiter ?`;
    setSmsBody(defaultSMS);
    setActiveDialog('sms');
  };

  const handleScheduleVisit = () => {
    setVisitDate('');
    setVisitTime('');
    setActiveDialog('visit');
  };

  const handleAddNote = () => {
    setNoteText('');
    setActiveDialog('note');
  };

  const statusActions = [];
  if (matchRecord) {
    const s = matchRecord.status;
    if (s === 'nouveau') {
      statusActions.push({ status: 'propose', label: 'Marquer comme proposé', icon: Send });
    }
    if (s === 'propose') {
      statusActions.push({ status: 'visite_planifiee', label: 'Visite planifiée', icon: CalendarPlus });
      statusActions.push({ status: 'refuse', label: 'Refusé par le lead', icon: XCircle });
    }
    if (s === 'visite_planifiee') {
      statusActions.push({ status: 'visite_effectuee', label: 'Visite effectuée', icon: CheckCircle2 });
    }
    if (s === 'visite_effectuee') {
      statusActions.push({ status: 'accepte', label: 'Accepté', icon: CheckCircle2 });
      statusActions.push({ status: 'refuse', label: 'Refusé', icon: XCircle });
    }
  }

  const history = matchRecord?.history || [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-[#E5E5E5]">
        <h3 className="font-semibold text-sm">Actions</h3>
        <p className="text-xs text-[#999999] mt-0.5 truncate">{matchName}</p>
        {matchRecord && (
          <div className="mt-2">
            <MatchStatusBadge status={matchRecord.status} />
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="p-3 space-y-1.5 border-b border-[#E5E5E5]">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePropose}
          className="w-full justify-start h-8 rounded-xl border-[#E5E5E5] text-xs"
        >
          <Mail className="w-3.5 h-3.5 mr-2 text-blue-500" />
          Proposer par email
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSMS}
          className="w-full justify-start h-8 rounded-xl border-[#E5E5E5] text-xs"
        >
          <MessageSquare className="w-3.5 h-3.5 mr-2 text-green-500" />
          Envoyer un SMS
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleScheduleVisit}
          className="w-full justify-start h-8 rounded-xl border-[#E5E5E5] text-xs"
        >
          <CalendarPlus className="w-3.5 h-3.5 mr-2 text-purple-500" />
          Planifier une visite
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddNote}
          className="w-full justify-start h-8 rounded-xl border-[#E5E5E5] text-xs"
        >
          <StickyNote className="w-3.5 h-3.5 mr-2 text-amber-500" />
          Ajouter une note
        </Button>
      </div>

      {/* Status progression */}
      {statusActions.length > 0 && (
        <div className="p-3 border-b border-[#E5E5E5]">
          <p className="text-xs font-medium text-[#666666] mb-2">Progression du statut</p>
          <div className="space-y-1.5">
            {statusActions.map(({ status, label, icon: Icon }) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                disabled={isUpdating}
                onClick={() => onUpdateMatchStatus(status)}
                className={cn(
                  "w-full justify-start h-8 rounded-xl text-xs",
                  status === 'accepte' && "border-green-200 text-green-700 hover:bg-green-50",
                  status === 'refuse' && "border-red-200 text-red-700 hover:bg-red-50",
                )}
              >
                {isUpdating ? (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                  <Icon className="w-3.5 h-3.5 mr-2" />
                )}
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Match notes */}
      {matchRecord?.notes && (
        <div className="p-3 border-b border-[#E5E5E5]">
          <p className="text-xs font-medium text-[#666666] mb-1">Notes</p>
          <p className="text-xs text-[#999999] whitespace-pre-wrap">{matchRecord.notes}</p>
        </div>
      )}

      {/* History timeline */}
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-xs font-medium text-[#666666] mb-2">Historique</p>
        {history.length === 0 ? (
          <p className="text-xs text-[#CCCCCC]">Aucune action pour le moment</p>
        ) : (
          <div className="space-y-3">
            {history.map((entry, i) => {
              const statusConfig = MATCH_STATUSES[entry.status] || {};
              return (
                <div key={i} className="flex gap-2">
                  <div className="flex flex-col items-center">
                    <div className={cn("w-2 h-2 rounded-full mt-1.5", statusConfig.dot || 'bg-gray-300')} />
                    {i < history.length - 1 && <div className="w-px flex-1 bg-[#E5E5E5] mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-xs font-medium">{statusConfig.label || entry.status}</p>
                    <p className="text-[10px] text-[#999999]">
                      {new Date(entry.date).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                    {entry.note && <p className="text-[10px] text-[#666666] mt-0.5">{entry.note}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Email Dialog */}
      <Dialog open={activeDialog === 'email'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Proposer par email</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Objet"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="rounded-xl"
            />
            <Textarea
              placeholder="Corps du message..."
              value={emailBody}
              onChange={(e) => setEmailBody(e.target.value)}
              className="rounded-xl min-h-[160px] text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)} className="rounded-xl">
              Annuler
            </Button>
            <Button
              onClick={() => {
                onSendEmail({ subject: emailSubject, body: emailBody });
                setActiveDialog(null);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            >
              <Send className="w-4 h-4 mr-2" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SMS Dialog */}
      <Dialog open={activeDialog === 'sms'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer un SMS</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Message SMS..."
            value={smsBody}
            onChange={(e) => setSmsBody(e.target.value)}
            className="rounded-xl min-h-[100px] text-sm"
          />
          <p className="text-xs text-[#999999]">{smsBody.length}/160 caractères</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)} className="rounded-xl">
              Annuler
            </Button>
            <Button
              onClick={() => {
                onSendSMS({ body: smsBody });
                setActiveDialog(null);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            >
              <Send className="w-4 h-4 mr-2" />
              Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visit Dialog */}
      <Dialog open={activeDialog === 'visit'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Planifier une visite</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-[#666666] mb-1 block">Date</label>
              <Input
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#666666] mb-1 block">Heure</label>
              <Input
                type="time"
                value={visitTime}
                onChange={(e) => setVisitTime(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)} className="rounded-xl">
              Annuler
            </Button>
            <Button
              disabled={!visitDate || !visitTime}
              onClick={() => {
                onScheduleVisit({ date: visitDate, time: visitTime });
                setActiveDialog(null);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            >
              <CalendarPlus className="w-4 h-4 mr-2" />
              Planifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={activeDialog === 'note'} onOpenChange={(open) => !open && setActiveDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une note</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Note sur cette correspondance..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="rounded-xl min-h-[100px] text-sm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveDialog(null)} className="rounded-xl">
              Annuler
            </Button>
            <Button
              disabled={!noteText.trim()}
              onClick={() => {
                onAddNote(noteText);
                setActiveDialog(null);
              }}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            >
              <StickyNote className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

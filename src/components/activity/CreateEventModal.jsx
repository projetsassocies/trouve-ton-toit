import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function CreateEventModal({ open, onClose, event, prefilledLeadId }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('other');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [linkedToType, setLinkedToType] = useState(prefilledLeadId ? 'lead' : '');
  const [linkedToId, setLinkedToId] = useState(prefilledLeadId || '');
  const queryClient = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['listings'],
    queryFn: () => base44.entities.Listing.list(),
  });

  useEffect(() => {
    if (event) {
      setTitle(event.title || '');
      setType(event.type || 'other');
      const start = event.date ? new Date(event.date) : new Date();
      setStartDate(start.toISOString().split('T')[0]);
      setStartTime(start.toTimeString().slice(0, 5));
      const end = event.end_date ? new Date(event.end_date) : new Date(start.getTime() + 3600000);
      setEndDate(end.toISOString().split('T')[0]);
      setEndTime(end.toTimeString().slice(0, 5));
      setLocation(event.location || '');
      setDescription(event.description || '');
      setLinkedToType(event.linked_to_type || '');
      setLinkedToId(event.linked_to_id || '');
    } else {
      const now = new Date();
      setTitle('');
      setType('other');
      setStartDate(now.toISOString().split('T')[0]);
      setStartTime('09:00');
      setEndDate(now.toISOString().split('T')[0]);
      setEndTime('10:00');
      setLocation('');
      setDescription('');
      setLinkedToType(prefilledLeadId ? 'lead' : '');
      setLinkedToId(prefilledLeadId || '');
    }
  }, [event, open, prefilledLeadId]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const event = await base44.entities.Event.create(data);
      await base44.entities.Activity.create({
        type: 'event',
        title: `${data.type === 'call' ? 'Appel' : data.type === 'visit' ? 'Visite' : data.type === 'meeting' ? 'Réunion' : 'Événement'} programmé: ${data.title}`,
        description: data.description || null,
        linked_to_id: data.linked_to_id || null,
        linked_to_type: data.linked_to_type || null,
      });
      return event;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      queryClient.invalidateQueries(['activities']);
      queryClient.invalidateQueries(['recent-activities']);
      toast.success('Événement créé');
      handleClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Event.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['events']);
      toast.success('Événement modifié');
      handleClose();
    },
  });

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      title,
      type,
      date: new Date(`${startDate}T${startTime}`).toISOString(),
      end_date: new Date(`${endDate}T${endTime}`).toISOString(),
      location: location || undefined,
      description: description || undefined,
      linked_to_type: linkedToType || undefined,
      linked_to_id: linkedToId || undefined,
      status: 'pending',
    };

    if (event) {
      updateMutation.mutate({ id: event.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const linkedItems = linkedToType === 'lead' ? leads : linkedToType === 'listing' ? listings : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? 'Modifier l\'événement' : '📅 Créer un événement'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Titre *</label>
            <Input
              placeholder="Ex: Visite bien rue de la Paix"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Type</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visit">🏠 Visite</SelectItem>
                <SelectItem value="call">📞 Appel</SelectItem>
                <SelectItem value="meeting">🤝 Réunion</SelectItem>
                <SelectItem value="signing">📄 Signature</SelectItem>
                <SelectItem value="other">📅 Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Date début</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Heure début</label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Date fin</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Heure fin</label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Lieu</label>
            <Input
              placeholder="Ex: 123 rue de la Paix, Paris"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              placeholder="Détails de l'événement..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Lié à</label>
              <Select value={linkedToType} onValueChange={(val) => { setLinkedToType(val); setLinkedToId(''); }}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="listing">Bien</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {linkedToType && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {linkedToType === 'lead' ? 'Lead' : 'Bien'}
                </label>
                <Select value={linkedToId} onValueChange={setLinkedToId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {linkedItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {linkedToType === 'lead' 
                          ? `${item.first_name} ${item.last_name}`
                          : item.title
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl">
              Annuler
            </Button>
            <Button type="submit" className="rounded-xl bg-black hover:bg-black/90 text-white">
              {event ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
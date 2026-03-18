import React, { useState, useEffect } from 'react';
import { api } from '@/api/apiClient';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function CreateTaskModal({ open, onClose, task, prefilledLeadId }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState('');
  const [linkedToType, setLinkedToType] = useState(prefilledLeadId ? 'lead' : '');
  const [linkedToId, setLinkedToId] = useState(prefilledLeadId || '');
  const queryClient = useQueryClient();

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.entities.Lead.list(),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['listings'],
    queryFn: () => api.entities.Listing.list(),
  });

  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority(task.priority || 'normal');
      setDueDate(task.due_date ? task.due_date.split('T')[0] : '');
      setLinkedToType(task.linked_to_type || '');
      setLinkedToId(task.linked_to_id || '');
    } else {
      setTitle('');
      setDescription('');
      setPriority('normal');
      setDueDate('');
      setLinkedToType(prefilledLeadId ? 'lead' : '');
      setLinkedToId(prefilledLeadId || '');
    }
  }, [task, open, prefilledLeadId]);

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Tâche créée');
      handleClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      toast.success('Tâche modifiée');
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
      description,
      priority,
      status: 'todo', // Pour que la tâche apparaisse dans la section Tâches
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      linked_to_type: linkedToType || undefined,
      linked_to_id: linkedToId || undefined,
    };

    if (task) {
      updateMutation.mutate({ id: task.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const linkedItems = linkedToType === 'lead' ? leads : linkedToType === 'listing' ? listings : [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle>{task ? 'Modifier la tâche' : 'Créer une tâche'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Titre *</label>
            <Input
              placeholder="Ex: Rappeler M. Dupont"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              placeholder="Détails de la tâche..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Priorité</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                  <SelectItem value="high">🟡 Important</SelectItem>
                  <SelectItem value="normal">🟢 Normal</SelectItem>
                  <SelectItem value="low">⚪ Bas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Échéance</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
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
              {task ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
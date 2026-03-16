import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function CreateNoteModal({ open, onClose, note, prefilledLeadId }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [linkedToType, setLinkedToType] = useState(prefilledLeadId ? 'lead' : 'none');
  const [linkedToId, setLinkedToId] = useState(prefilledLeadId || '');
  const [tags, setTags] = useState('');
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
    if (note) {
      setTitle(note.title || '');
      setContent(note.content || '');
      setIsPinned(note.is_pinned || false);
      setLinkedToType(note.linked_to_type || 'none');
      setLinkedToId(note.linked_to_id || '');
      setTags(note.tags?.join(', ') || '');
    } else {
      setTitle('');
      setContent('');
      setIsPinned(false);
      setLinkedToType(prefilledLeadId ? 'lead' : 'none');
      setLinkedToId(prefilledLeadId || '');
      setTags('');
    }
  }, [note, open, prefilledLeadId]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create(data),
    onSuccess: async (newNote) => {
      queryClient.invalidateQueries(['notes']);
      
      await base44.entities.Activity.create({
        type: 'note',
        title: newNote.title,
        content: newNote.content,
        linked_to_type: newNote.linked_to_type,
        linked_to_id: newNote.linked_to_id,
        tags: newNote.tags,
      });
      queryClient.invalidateQueries(['activities']);
      
      if (newNote.linked_to_type === 'lead' && newNote.linked_to_id) {
        const lead = leads.find(l => l.id === newNote.linked_to_id);
        if (lead) {
          await base44.entities.Notification.create({
            type: 'info',
            title: `Nouvelle note ajoutée`,
            message: `Une note "${newNote.title}" a été ajoutée au lead ${lead.first_name} ${lead.last_name}`,
            linked_lead_id: newNote.linked_to_id,
          });
          queryClient.invalidateQueries(['notifications']);
        }
      }
      
      toast.success('Note créée');
      handleClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Note.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['notes']);
      toast.success('Note modifiée');
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
      content,
      is_pinned: isPinned,
      linked_to_type: (linkedToType && linkedToType !== 'none') ? linkedToType : undefined,
      linked_to_id: (linkedToType && linkedToType !== 'none' && linkedToId) ? linkedToId : undefined,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
    };

    if (note) {
      updateMutation.mutate({ id: note.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const linkedItems = linkedToType === 'lead' ? leads : linkedToType === 'listing' ? listings : [];
  const effectiveLinkedToType = linkedToType && linkedToType !== 'none' ? linkedToType : '';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="rounded-2xl max-w-2xl">
        <DialogHeader>
          <DialogTitle>{note ? 'Modifier la note' : 'Créer une note'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Titre *</label>
            <Input
              placeholder="Ex: Notes de visite"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Contenu *</label>
            <Textarea
              placeholder="Votre note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={8}
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Tags</label>
            <Input
              placeholder="Ex: important, urgent, à relire (séparés par des virgules)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
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
                  <SelectItem value="none">Non lié</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="listing">Bien</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {effectiveLinkedToType && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {effectiveLinkedToType === 'lead' ? 'Lead' : 'Bien'}
                </label>
                <Select value={linkedToId} onValueChange={setLinkedToId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {linkedItems.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {linkedToType === 'lead' 
                          ? `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.email
                          : item.title
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox 
              id="pinned" 
              checked={isPinned} 
              onCheckedChange={setIsPinned}
            />
            <label htmlFor="pinned" className="text-sm font-medium cursor-pointer">
              📌 Épingler cette note
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl">
              Annuler
            </Button>
            <Button type="submit" className="rounded-xl bg-black hover:bg-black/90 text-white">
              {note ? 'Modifier' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
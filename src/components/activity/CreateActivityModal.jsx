import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function CreateActivityModal({ open, onClose, type, prefilledLeadId }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Activity.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['activities']);
      toast.success('Activité créée');
      handleClose();
    },
  });

  const handleClose = () => {
    setTitle('');
    setContent('');
    setLinkedToType(prefilledLeadId ? 'lead' : '');
    setLinkedToId(prefilledLeadId || '');
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate({
      type,
      title,
      content,
      linked_to_type: linkedToType || undefined,
      linked_to_id: linkedToId || undefined,
    });
  };

  const linkedItems = linkedToType === 'lead' ? leads : linkedToType === 'listing' ? listings : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {type === 'call' ? '📞 Ajouter un appel' : '📧 Ajouter un email'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Titre *</label>
            <Input
              placeholder="Ex: Appel avec M. Dupont"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              placeholder="Notes sur cet échange..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
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
              Créer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Pin, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import CreateNoteModal from './CreateNoteModal';

export default function NotesTab() {
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editNote, setEditNote] = useState(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes'],
    queryFn: () => base44.entities.Note.list('-updated_date'),
  });

  const { data: leads = [] } = useQuery({
    queryKey: ['leads'],
    queryFn: () => base44.entities.Lead.list(),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['listings'],
    queryFn: () => base44.entities.Listing.list(),
  });

  const getLinkedItem = (note) => {
    if (!note.linked_to_id) return null;
    if (note.linked_to_type === 'lead') {
      return leads.find(l => l.id === note.linked_to_id);
    }
    return listings.find(l => l.id === note.linked_to_id);
  };

  const filteredNotes = notes.filter(n => 
    search === '' || 
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content?.toLowerCase().includes(search.toLowerCase())
  );

  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const regularNotes = filteredNotes.filter(n => !n.is_pinned);

  if (isLoading) {
    return <div className="text-center py-12 text-[#999999]">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search & Create */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999]" />
          <Input
            placeholder="Rechercher dans les notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl border-[#E5E5E5]"
          />
        </div>
        <Button onClick={() => setCreateModalOpen(true)} className="rounded-xl">
          Nouvelle note
        </Button>
      </div>

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Pin className="w-4 h-4 text-amber-600" />
            <h3 className="font-semibold text-sm">Notes épinglées</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map(note => {
              const linkedItem = getLinkedItem(note);
              return (
                <NoteCard
                  key={note.id}
                  note={note}
                  linkedItem={linkedItem}
                  onClick={() => { setEditNote(note); setCreateModalOpen(true); }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Regular Notes */}
      {regularNotes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {regularNotes.map(note => {
            const linkedItem = getLinkedItem(note);
            return (
              <NoteCard
                key={note.id}
                note={note}
                linkedItem={linkedItem}
                onClick={() => { setEditNote(note); setCreateModalOpen(true); }}
              />
            );
          })}
        </div>
      ) : (
        !pinnedNotes.length && (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-[#F5F5F5] flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-[#CCCCCC]" />
            </div>
            <h3 className="font-semibold mb-2">Aucune note</h3>
            <p className="text-sm text-[#999999]">Créez votre première note</p>
          </div>
        )
      )}

      <CreateNoteModal
        open={createModalOpen}
        onClose={() => { setCreateModalOpen(false); setEditNote(null); }}
        note={editNote}
      />
    </div>
  );
}

function NoteCard({ note, linkedItem, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-[#E5E5E5] p-4 hover:shadow-md transition-shadow cursor-pointer group"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium line-clamp-1 group-hover:text-blue-600 transition-colors">
            {note.title}
          </h4>
          {note.is_pinned && (
            <Pin className="w-4 h-4 text-amber-600 flex-shrink-0" />
          )}
        </div>
        
        <p className="text-sm text-[#666666] line-clamp-3">
          {note.content}
        </p>
        
        <div className="space-y-2">
          <div className="text-xs text-[#999999]">
            {note.updated_date && !isNaN(new Date(note.updated_date).getTime()) 
              ? format(new Date(note.updated_date), 'dd MMM yyyy', { locale: fr })
              : 'Date inconnue'
            }
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {linkedItem && (
              <Badge variant="outline" className="text-xs">
                {note.linked_to_type === 'lead' ? '👤' : '🏠'} {
                  note.linked_to_type === 'lead'
                    ? `${linkedItem.first_name} ${linkedItem.last_name}`
                    : linkedItem.title
                }
              </Badge>
            )}
            {note.tags?.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
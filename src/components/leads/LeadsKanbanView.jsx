import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Mail, Phone, Home, MapPin, Cloud, Activity, Zap, Snowflake, Sun, Flame } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import { LEAD_TYPE_VIEWS, KANBAN_COLUMNS } from '@/lib/scoring-constants';

const CATEGORY_ICONS = { Cloud, Activity, Zap, Snowflake, Sun, Flame };

export default function LeadsKanbanView({ leads, leadTypeView = LEAD_TYPE_VIEWS.TOUS, onUpdateLead }) {
  const columns = KANBAN_COLUMNS[leadTypeView] || KANBAN_COLUMNS[LEAD_TYPE_VIEWS.TOUS];
  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const leadId = result.draggableId;
    const colId = result.destination.droppableId;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const colConfig = columns.find((c) => c.id === colId);
    let newCategorie = colId;
    if (leadTypeView === LEAD_TYPE_VIEWS.TOUS && lead.lead_type === 'locataire' && colConfig?.equivLocataire) {
      newCategorie = colConfig.equivLocataire;
    } else if (leadTypeView === LEAD_TYPE_VIEWS.LOCATAIRE) {
      newCategorie = colId; // EN_VEILLE, ACTIF, URGENT
    } else {
      newCategorie = colId; // FROID, TIEDE, CHAUD
    }
    if (lead.categorie !== newCategorie) {
      onUpdateLead(leadId, { categorie: newCategorie });
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      maximumFractionDigits: 0 
    }).format(price);
  };

  const getLeadsByCategory = (colConfig) => {
    const ids = [colConfig.id];
    if (colConfig.equivLocataire) ids.push(colConfig.equivLocataire);
    return leads.filter((lead) => ids.includes(lead.categorie));
  };

  // Leads sans catégorie
  const uncategorizedLeads = leads.filter(lead => !lead.categorie);

  return (
    <div className="space-y-4">
      {/* Uncategorized Leads Warning */}
      {uncategorizedLeads.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm text-amber-800">
            <strong>{uncategorizedLeads.length} lead{uncategorizedLeads.length > 1 ? 's' : ''}</strong> sans catégorie. 
            Utilisez l'agent email pour qualifier automatiquement vos leads.
          </p>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {columns.map((category) => {
            const categoryLeads = getLeadsByCategory(category);
            
            return (
              <div key={category.id} className="flex flex-col">
                {/* Column Header - Notion Style */}
                <div className="bg-white border border-[#E5E5E5] rounded-t-xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${category.headerClass || ''}`}>
                      {category.iconName && CATEGORY_ICONS[category.iconName]
                        ? (() => { const IconComp = CATEGORY_ICONS[category.iconName]; return <IconComp className="w-4 h-4" />; })()
                        : null}
                      {category.label}
                    </span>
                    <span className="text-sm font-medium text-[#999999]">
                      {categoryLeads.length}
                    </span>
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={category.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 bg-[#FAFAFA] border border-[#E5E5E5] border-t-0 rounded-b-xl p-3 space-y-3 min-h-[500px] transition-colors ${
                        snapshot.isDraggingOver ? 'bg-[#F5F5F5]' : ''
                      }`}
                    >
                      {categoryLeads.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-[#CCCCCC] text-sm">
                          Aucun lead {category.label.toLowerCase()}
                        </div>
                      ) : (
                        categoryLeads.map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <Link
                                  to={createPageUrl(`LeadDetail?id=${lead.id}`)}
                                  className={`block bg-white border border-[#E5E5E5] rounded-xl p-4 hover:shadow-md transition-all ${
                                    snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                                  }`}
                                  onClick={(e) => {
                                    if (snapshot.isDragging) {
                                      e.preventDefault();
                                    }
                                  }}
                                >
                                  {/* Lead Header */}
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-medium text-sm flex-shrink-0 text-secondary">
                                      {lead.first_name?.[0]}{lead.last_name?.[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-semibold text-sm truncate">
                                        {lead.first_name} {lead.last_name}
                                      </p>
                                      {lead.score !== undefined && lead.score !== null && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <span className="text-xs text-[#666666]">Score:</span>
                                          <span className="text-xs font-medium text-[#111111]">⭐ {lead.score}/100</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Lead Info */}
                                  <div className="space-y-2 text-xs text-[#666666]">
                                    {lead.email && (
                                      <div className="flex items-center gap-2 truncate">
                                        <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="truncate">{lead.email}</span>
                                      </div>
                                    )}
                                    {lead.phone && (
                                      <div className="flex items-center gap-2">
                                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{lead.phone}</span>
                                      </div>
                                    )}
                                    {lead.city && (
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span>{lead.city}</span>
                                      </div>
                                    )}
                                    {lead.property_type && (
                                      <div className="flex items-center gap-2">
                                        <Home className="w-3.5 h-3.5 flex-shrink-0" />
                                        <span className="capitalize">{lead.property_type}</span>
                                      </div>
                                    )}
                                    {lead.budget_max && (
                                      <div className="flex items-center gap-2 font-medium text-[#111111]">
                                        <span>Budget:</span>
                                        <span>{formatPrice(lead.budget_max)}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Status Badge */}
                                  <div className="mt-3 pt-3 border-t border-[#F5F5F5]">
                                    <StatusBadge status={lead.status} />
                                  </div>
                                </Link>
                              </div>
                            )}
                          </Draggable>
                        ))
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
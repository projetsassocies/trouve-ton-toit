/**
 * Seed données démo CRM — tâches fictives, RDV, pour remplir le Dashboard
 * Appelle l'API avec created_by = userEmail pour respecter le RLS
 */
import { api } from '@/api/apiClient';

function addDays(d, n) {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function setTime(d, h, m = 0) {
  const out = new Date(d);
  out.setHours(h, m, 0, 0);
  return out;
}

export async function seedDemoData(userEmail) {
  if (!userEmail) throw new Error('userEmail requis pour le seed');

  const createdBy = userEmail;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Récupérer leads et listings existants pour lier certaines données
  let leads = [];
  let listings = [];
  try {
    leads = await api.entities.Lead.filter({ created_by: userEmail }, '-created_date', 20);
    listings = await api.entities.Listing.filter({ created_by: userEmail }, '-created_date', 10);
  } catch (e) {
    // Ignorer si vide ou erreur
  }

  const firstLead = leads[0];
  const secondLead = leads[1];
  const firstListing = listings[0];

  // 2. Tâches fictives
  const taskTemplates = [
    { title: 'Rappeler M. Dubois pour suivi visite', description: 'Visite effectuée il y a 3 jours', priority: 'urgent', daysOffset: 0 },
    { title: 'Envoyer estimation à Mme Lambert', description: 'Demande reçue via formulaire', priority: 'urgent', daysOffset: 0 },
    { title: 'Préparer mandat de vente - Appt Cours Victor Hugo', description: 'Signature prévue demain', priority: 'high', daysOffset: 1 },
    { title: 'Relancer dossier financement - Famille Martin', description: 'Banque demande pièce complémentaire', priority: 'high', daysOffset: 1 },
    { title: 'Mettre à jour annonce Bienvenue pour photos', description: 'Nouvelles photos reçues du vendeur', priority: 'normal', daysOffset: 2 },
    { title: 'Planifier visite de groupe - Résidence Les Terrasses', description: '3 acheteurs potentiels intéressés', priority: 'normal', daysOffset: 3 },
    { title: 'Vérifier dossier garantie - Location T2 Mériadeck', description: 'Dossier en cours de validation', priority: 'normal', daysOffset: 4 },
    { title: 'Contacter notaire pour dossier Dupont', description: 'Compromis signé - date d\'enregistrement ?', priority: 'low', daysOffset: 5 },
    { title: 'Relancer proposition matching - Sophie L.', description: 'Score 78 - proposition envoyée il y a 48h', priority: 'urgent', daysOffset: 0 },
    { title: 'Organiser visite commune - couple Bernard', description: 'Disponibles ce week-end', priority: 'high', daysOffset: 2 },
  ];

  const tasksCreated = [];
  for (const t of taskTemplates) {
    const dueDate = setTime(addDays(today, t.daysOffset), 18, 0);
    const linked = t.daysOffset <= 1 && firstLead ? { linked_to_id: firstLead.id, linked_to_type: 'lead' }
      : t.daysOffset <= 2 && secondLead ? { linked_to_id: secondLead.id, linked_to_type: 'lead' }
      : {};
    try {
      const task = await api.entities.Task.create({
        title: t.title,
        description: t.description,
        status: 'todo',
        priority: t.priority,
        due_date: dueDate.toISOString(),
        created_by: createdBy,
        ...linked,
      });
      tasksCreated.push(task);
    } catch (err) {
      console.warn('Seed task failed:', t.title, err);
    }
  }

  // 3. Événements / RDV fictifs
  const eventTemplates = [
    { title: 'Visite - Appt T3 centre-ville', type: 'visit', days: 0, startH: 9, endH: 10, location: '12 rue Sainte-Catherine, Bordeaux' },
    { title: 'Appel découverte - Pierre Martin', type: 'call', days: 0, startH: 11, endH: 11, location: null },
    { title: 'Signature mandat - Mme Durand', type: 'signing', days: 0, startH: 14, endH: 15, location: 'Cabinet notaire, 8 place Gambetta' },
    { title: 'Visite - Villa Mérignac', type: 'visit', days: 1, startH: 10, endH: 11, location: '45 avenue de Verdun, Mérignac' },
    { title: 'Réunion équipe - Point hebdo', type: 'meeting', days: 1, startH: 16, endH: 17, location: 'Bureau' },
    { title: 'Visite - Studio Talence', type: 'visit', days: 2, startH: 9, endH: 10, location: '3 rue Roustaing, Talence' },
    { title: 'Appel suivi - Famille Bernard', type: 'call', days: 2, startH: 15, endH: 15, location: null },
    { title: 'Visite groupe - Résidence neuve', type: 'visit', days: 3, startH: 14, endH: 16, location: 'ZAC Bastide, Bordeaux' },
  ];

  const eventsCreated = [];
  for (const e of eventTemplates) {
    const start = setTime(addDays(today, e.days), e.startH);
    const end = setTime(addDays(today, e.days), e.endH);
    const eventType = ['visit', 'call', 'meeting', 'other'].includes(e.type) ? e.type : 'meeting';
    const linked = (e.days <= 1 && firstLead) ? { linked_to_id: firstLead.id, linked_to_type: 'lead' }
      : (e.days <= 2 && secondLead) ? { linked_to_id: secondLead.id, linked_to_type: 'lead' }
      : (firstListing && e.type === 'visit') ? { linked_to_id: firstListing.id, linked_to_type: 'listing' }
      : {};
    try {
      const ev = await api.entities.Event.create({
        title: e.title,
        type: eventType,
        date: start.toISOString(),
        end_date: end.toISOString(),
        location: e.location || undefined,
        status: 'planned',
        description: e.location ? `RDV prévu à ${e.location}` : undefined,
        created_by: createdBy,
        ...linked,
      });
      eventsCreated.push(ev);
    } catch (err) {
      console.warn('Seed event failed:', e.title, err);
    }
  }

  return {
    tasks: tasksCreated.length,
    events: eventsCreated.length,
    leadsUsed: leads.length,
    listingsUsed: listings.length,
  };
}

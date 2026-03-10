import { Calendar, Clock, MapPin, Phone, Video, CheckCircle2, ChevronRight, History, CalendarClock, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { useState, useMemo } from 'react';

const appointments = [
  // Aujourd'hui - 10 Mars 2026 (ordre chronologique)
  {
    date: 'today',
    displayDate: '10 Mars',
    time: '07:30',
    duration: '20 min',
    type: 'call',
    title: 'Appel matinal - Client urgent',
    description: 'Suivi dossier financement',
    priority: 'high'
  },
  {
    date: 'today',
    displayDate: '10 Mars',
    time: '09:00',
    duration: '30 min',
    type: 'video',
    title: 'Appel visio - Marie Leclerc',
    description: 'Présentation appartement 3 pièces - Lyon 6ème',
    priority: 'high'
  },
  {
    date: 'today',
    displayDate: '10 Mars',
    time: '10:00',
    duration: '1h30',
    type: 'visit',
    title: 'Visite groupe - Nouveau programme',
    description: 'Résidence neuve - 4 clients potentiels',
    location: 'Lyon 7ème',
    priority: 'high'
  },
  {
    date: 'today',
    displayDate: '10 Mars',
    time: '14:00',
    duration: '45 min',
    type: 'video',
    title: 'Visio expertise',
    description: 'Estimation villa avec jardin',
    priority: 'medium'
  },
  {
    date: 'today',
    displayDate: '10 Mars',
    time: '16:30',
    duration: '1h',
    type: 'call',
    title: 'Négociation prix',
    description: 'Penthouse centre-ville - Offre concurrent',
    priority: 'high'
  },
  // Demain - 11 Mars (ordre chronologique)
  {
    date: 'upcoming',
    displayDate: '11 Mars',
    time: '09:30',
    duration: '2h',
    type: 'visit',
    title: 'Journée portes ouvertes',
    description: 'Maison familiale 150m² - Marketing événementiel',
    location: 'Villeurbanne',
    priority: 'high'
  },
  {
    date: 'upcoming',
    displayDate: '11 Mars',
    time: '11:00',
    duration: '1h',
    type: 'visit',
    title: 'Visite sur place',
    description: '45 rue de la République - Avec M. et Mme Dupont',
    location: 'Lyon 2ème',
    priority: 'high'
  },
  {
    date: 'upcoming',
    displayDate: '11 Mars',
    time: '15:00',
    duration: '30 min',
    type: 'call',
    title: 'Suivi notaire',
    description: 'Vente appartement - Signatures prévues',
    priority: 'medium'
  },
  // Après-demain - 12 Mars (ordre chronologique)
  {
    date: 'upcoming',
    displayDate: '12 Mars',
    time: '14:30',
    duration: '45 min',
    type: 'call',
    title: 'Négociation offre',
    description: 'Maison 120m² - Suivi offre Sophie Martin',
    priority: 'medium'
  },
  {
    date: 'upcoming',
    displayDate: '12 Mars',
    time: '16:00',
    duration: '30 min',
    type: 'visit',
    title: 'Visite bien',
    description: 'Appartement T2 - Nouveau mandat',
    location: 'Lyon 3ème',
    priority: 'medium'
  },
  {
    date: 'upcoming',
    displayDate: '12 Mars',
    time: '18:00',
    duration: '1h',
    type: 'visit',
    title: 'Visite de fin de journée',
    description: 'Villa avec piscine - Clients VIP',
    location: 'Lyon 5ème',
    priority: 'high'
  },
  {
    date: 'upcoming',
    displayDate: '12 Mars',
    time: '20:00',
    duration: '30 min',
    type: 'video',
    title: 'Visio de clôture',
    description: 'Signature électronique mandat',
    priority: 'medium'
  }
];

const tasks = [
  { id: '1', text: 'Préparer dossier pour notaire - Vente Rousseau', urgent: true },
  { id: '2', text: 'Publier nouveau bien sur SeLoger', urgent: false },
  { id: '3', text: 'Relancer 3 leads froids de la semaine dernière', urgent: false }
];

export function DailySchedule() {
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'past' | 'today' | 'upcoming'>('today');

  const handleTaskCompletion = (taskId: string) => {
    setCompletedTasks((prev) => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  // Fonction pour convertir l'heure string en minutes depuis minuit
  const timeToMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Heure actuelle en minutes (pour test, on peut simuler différentes heures)
  // Pour production: const now = new Date().getHours() * 60 + new Date().getMinutes();
  const getCurrentTime = () => '9:30'; // Simuler 9h30 pour le test

  // Filtrer les rendez-vous selon la vue active
  const filteredAppointments = useMemo(() => {
    const now = timeToMinutes(getCurrentTime());
    
    if (activeView === 'past') {
      // Vue Passé : tous les RDV passés d'aujourd'hui
      return appointments.filter(apt => {
        const aptTime = timeToMinutes(apt.time);
        return apt.date === 'today' && aptTime < now;
      }).reverse(); // Les plus récents en premier
    } else if (activeView === 'upcoming') {
      // Vue À venir : tous les RDV futurs (date = upcoming)
      return appointments.filter(apt => apt.date === 'upcoming');
    } else {
      // Vue Aujourd'hui : TOUS les RDV du jour avec limite sur les passés
      const pastAppointments = appointments.filter(apt => {
        const aptTime = timeToMinutes(apt.time);
        return apt.date === 'today' && aptTime < now;
      }).slice(-2); // Garder les 2 derniers RDV passés
      
      const currentAndUpcoming = appointments.filter(apt => {
        const aptTime = timeToMinutes(apt.time);
        return apt.date === 'today' && aptTime >= now; // TOUS les RDV restants de la journée
      });
      
      return [...pastAppointments, ...currentAndUpcoming];
    }
  }, [activeView]);

  // Calculer le nombre de RDV restants dans la journée
  const remainingTodayCount = useMemo(() => {
    const now = timeToMinutes(getCurrentTime());
    return appointments.filter(apt => {
      const aptTime = timeToMinutes(apt.time);
      return apt.date === 'today' && aptTime >= now;
    }).length;
  }, []);

  // Calculer le total de RDV à venir
  const upcomingTotalCount = useMemo(() => {
    return appointments.filter(apt => apt.date === 'upcoming').length;
  }, []);

  // Déterminer si un rendez-vous doit être highlighted (vert fluo)
  const isHighlighted = (timeStr: string) => {
    const now = timeToMinutes(getCurrentTime());
    const aptTime = timeToMinutes(timeStr);
    // Highlighted si c'est maintenant ou dans les 2-3h à venir
    return activeView === 'today' && aptTime >= now && aptTime <= now + 180;
  };

  // Déterminer si c'est le RDV juste après le highlighted (effet de queue)
  const isNextInQueue = (index: number) => {
    if (activeView !== 'today') return false;
    
    // Trouver l'index du RDV highlighted
    const highlightedIndex = filteredAppointments.findIndex(apt => isHighlighted(apt.time));
    
    // Le RDV en queue est celui juste après le highlighted
    return highlightedIndex !== -1 && index === highlightedIndex + 1;
  };

  // Déterminer si un rendez-vous est passé (transparent)
  const isPast = (timeStr: string) => {
    if (activeView !== 'today') return false;
    const now = timeToMinutes(getCurrentTime());
    const aptTime = timeToMinutes(timeStr);
    return aptTime < now;
  };

  // Déterminer si un rendez-vous doit être grisé (seulement les très futurs)
  const isGreyedOut = (timeStr: string, index: number) => {
    if (activeView !== 'today') return false;
    if (isNextInQueue(index)) return false; // Le RDV en queue n'est pas grisé
    if (isPast(timeStr)) return false; // Les RDV passés ne sont pas grisés
    
    const now = timeToMinutes(getCurrentTime());
    const aptTime = timeToMinutes(timeStr);
    // Grisé SEULEMENT si très futur (plus de 3h dans le futur)
    return aptTime > now + 180;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {/* Navigation avec animation collapse/expand */}
            <button
              type="button"
              onClick={() => setActiveView('past')}
              className={`flex items-center gap-2 transition-all px-3 py-1.5 rounded-md cursor-pointer ${
                activeView === 'past'
                  ? 'text-foreground bg-muted/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <History className="h-5 w-5 text-accent dark:text-white flex-shrink-0" />
              {activeView === 'past' && (
                <span className="font-semibold animate-in fade-in slide-in-from-left-2 duration-200 whitespace-nowrap">
                  Passé
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveView('today')}
              className={`flex items-center gap-2 transition-all px-3 py-1.5 rounded-md cursor-pointer ${
                activeView === 'today'
                  ? 'text-foreground bg-muted/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Calendar className="h-5 w-5 text-accent dark:text-white flex-shrink-0" />
              {activeView === 'today' && (
                <span className="font-semibold animate-in fade-in zoom-in-95 duration-200 whitespace-nowrap">
                  Aujourd'hui
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveView('upcoming')}
              className={`flex items-center gap-2 transition-all px-3 py-1.5 rounded-md cursor-pointer ${
                activeView === 'upcoming'
                  ? 'text-foreground bg-muted/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <CalendarClock className="h-5 w-5 text-accent dark:text-white flex-shrink-0" />
              {activeView === 'upcoming' && (
                <span className="font-semibold animate-in fade-in slide-in-from-right-2 duration-200 whitespace-nowrap">
                  À venir
                </span>
              )}
            </button>
          </div>
          {activeView === 'today' && (
            <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
              {remainingTodayCount} restant{remainingTodayCount > 1 ? 's' : ''}
            </Badge>
          )}
          {activeView === 'upcoming' && (
            <Badge variant="outline" className="text-muted-foreground">
              {upcomingTotalCount} rendez-vous
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Appointments Timeline */}
        <div className="mb-6 space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {activeView === 'past' && 'Aucun rendez-vous passé'}
              {activeView === 'today' && 'Aucun rendez-vous prévu'}
              {activeView === 'upcoming' && 'Aucun rendez-vous à venir'}
            </div>
          ) : (
            filteredAppointments.map((apt, index) => {
              const highlighted = isHighlighted(apt.time);
              const nextInQueue = isNextInQueue(index);
              const past = isPast(apt.time);
              const greyedOut = isGreyedOut(apt.time, index);
              return (
                <div
                  key={index}
                  className={`group flex gap-4 rounded-lg border p-4 transition-all cursor-pointer ${
                    highlighted
                      ? 'border-primary/50 bg-primary/5 hover:bg-primary/10 hover:border-primary/70'
                      : past || nextInQueue
                      ? 'opacity-60 hover:opacity-75'
                      : greyedOut
                      ? 'bg-muted/30 opacity-70 hover:opacity-80'
                      : 'hover:bg-muted/50 hover:border-border'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-semibold">{apt.time}</span>
                    <span className="text-xs text-muted-foreground">
                      {activeView === 'today' ? apt.duration : apt.displayDate}
                    </span>
                  </div>
                  
                  <Separator orientation="vertical" className="h-auto" />
                  
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      {apt.type === 'video' && <Video className="h-4 w-4 text-accent dark:text-white" />}
                      {apt.type === 'call' && <Phone className="h-4 w-4 text-accent dark:text-white" />}
                      {apt.type === 'visit' && <MapPin className="h-4 w-4 text-accent dark:text-white" />}
                      
                      <h4 className="font-medium">{apt.title}</h4>
                      
                      {activeView === 'past' && (
                        <CheckCircle2 className="h-4 w-4 text-accent dark:text-white" />
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground">{apt.description}</p>
                    
                    {apt.location && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {apt.location}
                      </div>
                    )}
                  </div>
                  
                  {activeView !== 'past' && (
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-all opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5" />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Priority Tasks - Only show in Today view */}
        {activeView === 'today' && (
          <>
            <Separator className="my-4" />
            <div>
              <h4 className="mb-3 font-medium">Ma to-do</h4>
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isCompleted = completedTasks.includes(task.id);
                  return (
                    <div key={task.id} className="flex items-center gap-3">
                      <Checkbox
                        id={task.id}
                        checked={isCompleted}
                        onCheckedChange={() => handleTaskCompletion(task.id)}
                      />
                      <label
                        htmlFor={task.id}
                        className={`flex-1 text-sm cursor-pointer transition-all ${
                          isCompleted
                            ? 'line-through text-muted-foreground'
                            : task.urgent
                            ? 'font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {task.text}
                      </label>
                      {task.urgent && !isCompleted && (
                        <Badge variant="destructive" className="h-5 text-xs">Urgent</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
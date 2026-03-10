import { useState } from 'react';
import { Target, ChevronLeft, ChevronRight, Check, TrendingUp, UserPlus, Phone, AlertCircle, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

const recommendations = [
  {
    id: 1,
    priority: 'high',
    type: 'lead',
    icon: Phone,
    title: 'Relancer Claire Dumont immédiatement',
    description: 'Claire n\'a pas répondu depuis 48h après avoir montré un fort intérêt (score 70/100). Son profil budget 420k€ correspond parfaitement à votre nouveau mandat rue Caudéran.',
    action: 'Appeler maintenant',
    insight: 'Taux de conversion +45% quand vous relancez sous 48h',
    reasoning: 'Lead chaud risquant de refroidir - Opportunité de closing élevée'
  },
  {
    id: 2,
    priority: 'high',
    type: 'opportunity',
    icon: TrendingUp,
    title: 'Opportunité de cross-selling avec Sophie Martin',
    description: 'Sophie Martin a une visite planifiée aujourd\'hui. Analyse de son profil : revenus élevés, cherche T4. Vous avez 2 autres biens premium dans sa zone qui correspondent.',
    action: 'Préparer les dossiers',
    insight: '3 clients sur 5 visitent un 2ème bien quand vous proposez',
    reasoning: 'Maximiser la valeur de chaque rendez-vous'
  },
  {
    id: 3,
    priority: 'medium',
    type: 'conversion',
    icon: UserPlus,
    title: 'Qualifier les 3 leads froids de cette semaine',
    description: 'Jean Rousseau, Paul Petit et Anne Legrand n\'ont pas encore été recontactés. Leur budget cumulé représente 1.2M€ de potentiel.',
    action: 'Planifier les appels',
    insight: 'Les leads froids qualifiés donnent 30% de mandats en différé',
    reasoning: 'Pipeline à long terme - Investissement futur'
  },
  {
    id: 4,
    priority: 'medium',
    type: 'task',
    icon: AlertCircle,
    title: 'Finaliser le dossier notaire pour la vente Rousseau',
    description: 'La signature est prévue dans 5 jours. Il manque encore 2 documents : le diagnostic énergétique mis à jour et l\'attestation de surface.',
    action: 'Contacter le diagnostiqueur',
    insight: 'Risque de report de signature si documents incomplets',
    reasoning: 'Sécuriser la transaction en cours'
  },
  {
    id: 5,
    priority: 'low',
    type: 'marketing',
    icon: Calendar,
    title: 'Publier le nouveau mandat T3 sur les portails',
    description: 'Votre nouveau mandat T3 Lyon 6ème (obtenu hier) n\'est pas encore en ligne. Photos professionnelles reçues ce matin.',
    action: 'Publier maintenant',
    insight: '80% des vues arrivent dans les 48h suivant la publication',
    reasoning: 'Optimiser la visibilité du bien'
  }
];

const priorityConfig = {
  high: {
    label: 'Urgent',
    color: 'bg-red-100 text-red-700 border-red-200',
    dotColor: 'bg-red-500'
  },
  medium: {
    label: 'Important',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
    dotColor: 'bg-orange-500'
  },
  low: {
    label: 'À faire',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500'
  }
};

export function AIRecommendations() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<number[]>([]);

  const currentRecommendation = recommendations[currentIndex];
  const remaining = recommendations.filter(r => !completedIds.includes(r.id)).length;

  const handleNext = () => {
    if (currentIndex < recommendations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleComplete = () => {
    setCompletedIds([...completedIds, currentRecommendation.id]);
    // Auto-advance to next uncompleted recommendation
    const nextIndex = recommendations.findIndex((r, idx) => idx > currentIndex && !completedIds.includes(r.id));
    if (nextIndex !== -1) {
      setCurrentIndex(nextIndex);
    } else if (currentIndex < recommendations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const isCompleted = completedIds.includes(currentRecommendation.id);
  const Icon = currentRecommendation.icon;
  const priorityStyle = priorityConfig[currentRecommendation.priority];

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-accent dark:text-white" />
            <h3 className="font-semibold">Actions prioritaires</h3>
            <Badge className="ml-2 bg-primary text-primary-foreground hover:bg-primary/90">
              {remaining} à traiter
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {recommendations.length}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={handleNext}
                disabled={currentIndex === recommendations.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main Recommendation Card with Stack Effect */}
        <div className="relative">
          {/* Stack Effect - Background Cards */}
          <div className="absolute -bottom-1 -right-1 h-full w-full rounded-lg border bg-muted/30 -z-10" />
          <div className="absolute -bottom-2 -right-2 h-full w-full rounded-lg border bg-muted/20 -z-20" />
          
          {/* Main Card */}
          <Card className={`relative transition-all duration-300 ${isCompleted ? 'opacity-50' : ''}`}>
            <CardContent className="p-6">
              {/* Header with Priority and Icon */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-accent/10 dark:bg-white/10">
                    <Icon className="h-6 w-6 text-accent dark:text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${priorityStyle.color}`}
                      >
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${priorityStyle.dotColor} mr-1.5`}></span>
                        {priorityStyle.label}
                      </Badge>
                      {isCompleted && (
                        <Badge variant="secondary" className="text-xs">
                          <Check className="h-3 w-3 mr-1" />
                          Traité
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-lg font-semibold mb-2">{currentRecommendation.title}</h4>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-foreground mb-4 leading-relaxed">
                {currentRecommendation.description}
              </p>

              {/* Reasoning */}
              <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium">Pourquoi maintenant :</span>
                <span>{currentRecommendation.reasoning}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <Button 
                  className="flex-1 bg-accent hover:bg-primary text-white hover:text-primary-foreground transition-colors"
                  onClick={handleComplete}
                  disabled={isCompleted}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {isCompleted ? 'Traité' : 'Marquer comme traité'}
                </Button>
                <Button variant="outline">
                  {currentRecommendation.action}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {recommendations.map((rec, idx) => (
            <button
              key={rec.id}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex 
                  ? 'w-8 bg-accent' 
                  : completedIds.includes(rec.id)
                  ? 'w-2 bg-accent/50'
                  : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
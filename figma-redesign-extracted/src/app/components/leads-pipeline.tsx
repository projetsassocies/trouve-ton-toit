import { Users, Flame, Snowflake, ArrowRight, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

const pipelineStages = [
  {
    name: 'Nouveaux',
    count: 5,
    leads: [
      { name: 'Thomas Bernard', budget: '350k', type: 'Achat T3' },
      { name: 'Claire Dubois', budget: '280k', type: 'Achat T2' }
    ]
  },
  {
    name: 'Contactés',
    count: 3,
    leads: [
      { name: 'Sophie Martin', budget: '280k', type: 'Achat Maison', temperature: 'hot' },
      { name: 'Jean Dupont', budget: '500k', type: 'Achat T4' }
    ]
  },
  {
    name: 'Qualifiés',
    count: 4,
    leads: [
      { name: 'Marie Leclerc', budget: '320k', type: 'T3 Lyon', temperature: 'hot' },
      { name: 'Paul Rousseau', budget: '450k', type: 'Maison', temperature: 'warm' }
    ]
  },
  {
    name: 'Visite planifiée',
    count: 2,
    leads: [
      { name: 'M. et Mme Dupont', budget: '400k', type: 'T4 avec jardin' }
    ]
  }
];

export function LeadsPipeline() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent dark:text-white" />
            <h3 className="font-semibold">Pipeline des Leads</h3>
          </div>
          <Button variant="outline" size="sm">
            Voir tous les leads
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Pipeline Stages */}
        <div className="grid grid-cols-4 gap-4">
          {pipelineStages.map((stage, index) => (
            <div key={stage.name}>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-medium">{stage.name}</h4>
                <Badge variant="secondary">
                  {stage.count}
                </Badge>
              </div>
              
              <div className="space-y-2">
                {stage.leads.map((lead, idx) => (
                  <div
                    key={idx}
                    className="group relative rounded-lg border bg-card p-3 hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="mb-1 flex items-start justify-between">
                      <h5 className="text-sm font-medium group-hover:text-white transition-colors">{lead.name}</h5>
                      <div className="flex items-center gap-1">
                        {lead.temperature === 'hot' && (
                          <Flame className="h-4 w-4 text-destructive group-hover:text-white transition-colors" />
                        )}
                        {lead.temperature === 'warm' && (
                          <Snowflake className="h-4 w-4 text-accent group-hover:text-white transition-colors" />
                        )}
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground group-hover:text-white/80 transition-colors mb-1">{lead.type}</p>
                    <p className="text-xs font-medium group-hover:text-white transition-colors">Budget: {lead.budget}</p>
                  </div>
                ))}
                
                {stage.leads.length < stage.count && (
                  <div className="text-center">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      +{stage.count - stage.leads.length} autre{stage.count - stage.leads.length > 1 ? 's' : ''}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <Separator className="my-6" />
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-semibold">4</span>
            </div>
            <p className="text-sm text-muted-foreground">Leads chauds</p>
          </div>
          <div className="text-center">
            <div className="mb-1">
              <span className="text-2xl font-semibold">78%</span>
            </div>
            <p className="text-sm text-muted-foreground">Taux de conversion</p>
            <p className="text-xs text-accent">+12% vs mois dernier</p>
          </div>
          <div className="text-center">
            <div className="mb-1">
              <span className="text-2xl font-semibold">2.3j</span>
            </div>
            <p className="text-sm text-muted-foreground">Temps moy. de réponse</p>
            <p className="text-xs text-destructive">À améliorer</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
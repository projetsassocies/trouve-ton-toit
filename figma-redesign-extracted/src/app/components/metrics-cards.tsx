import { Calendar, TrendingUp, FileCheck, PenLine, UserPlus } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { useState, useMemo } from 'react';

// Données par période
const metricsData = {
  today: [
    {
      name: 'Nouveau lead',
      value: '3',
      change: '+2',
      changeType: 'increase',
      icon: UserPlus,
    },
    {
      name: 'Visites planifiées',
      value: '5',
      change: '+2',
      changeType: 'increase',
      icon: Calendar,
    },
    {
      name: 'Taux de conversion',
      value: '75%',
      change: '+5%',
      changeType: 'increase',
      icon: TrendingUp,
    },
    {
      name: 'Prêt pour mandats',
      value: '1',
      change: '+1',
      changeType: 'increase',
      icon: FileCheck,
    },
    {
      name: 'Signatures',
      value: '1',
      change: '+1',
      changeType: 'increase',
      icon: PenLine,
    }
  ],
  week: [
    {
      name: 'Nouveau lead',
      value: '15',
      change: '+3',
      changeType: 'increase',
      icon: UserPlus,
    },
    {
      name: 'Visites planifiées',
      value: '23',
      change: '+8',
      changeType: 'increase',
      icon: Calendar,
    },
    {
      name: 'Taux de conversion',
      value: '78%',
      change: '+12%',
      changeType: 'increase',
      icon: TrendingUp,
    },
    {
      name: 'Prêt pour mandats',
      value: '4',
      change: '+1',
      changeType: 'increase',
      icon: FileCheck,
    },
    {
      name: 'Signatures',
      value: '2',
      change: '+1',
      changeType: 'increase',
      icon: PenLine,
    }
  ],
  month: [
    {
      name: 'Nouveau lead',
      value: '62',
      change: '+18',
      changeType: 'increase',
      icon: UserPlus,
    },
    {
      name: 'Visites planifiées',
      value: '89',
      change: '+24',
      changeType: 'increase',
      icon: Calendar,
    },
    {
      name: 'Taux de conversion',
      value: '82%',
      change: '+7%',
      changeType: 'increase',
      icon: TrendingUp,
    },
    {
      name: 'Prêt pour mandats',
      value: '18',
      change: '+5',
      changeType: 'increase',
      icon: FileCheck,
    },
    {
      name: 'Signatures',
      value: '11',
      change: '+4',
      changeType: 'increase',
      icon: PenLine,
    }
  ]
};

type Period = 'today' | 'week' | 'month';

export function MetricsCards() {
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');

  const periods: { value: Period; label: string }[] = [
    { value: 'today', label: "Aujourd'hui" },
    { value: 'week', label: 'Cette semaine' },
    { value: 'month', label: 'Ce mois' },
  ];

  const metrics = useMemo(() => metricsData[selectedPeriod], [selectedPeriod]);

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center justify-end gap-1">
        {periods.map((period) => (
          <button
            key={period.value}
            onClick={() => setSelectedPeriod(period.value)}
            className={`relative px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedPeriod === period.value
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className={selectedPeriod === period.value ? 'border-b-2 border-accent pb-1' : ''}>
              {period.label}
            </span>
          </button>
        ))}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-5 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.name} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 dark:bg-white/10">
                  <metric.icon className="h-5 w-5 text-accent dark:text-white" />
                </div>
                <Badge variant="secondary" className="text-xs">
                  {metric.change}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{metric.name}</p>
                <p className="text-2xl font-semibold">{metric.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
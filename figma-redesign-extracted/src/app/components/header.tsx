import { Search, Bell, Sun, Moon } from 'lucide-react';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useTheme } from '../contexts/theme-context';
import { useState, useEffect } from 'react';

// Fonction pour obtenir le message de salutation et motivation selon l'heure
function getGreetingMessage(name: string = 'Grace') {
  const hour = new Date().getHours();
  let greeting = '';
  
  const morningMotivations = [
    "Excellente journée à vous !",
    "Prêt(e) à conquérir de nouveaux mandats ?",
    "C'est parti pour une journée productive !",
    "Le succès commence maintenant !"
  ];
  
  const afternoonMotivations = [
    "Continuez sur cette lancée !",
    "Vous faites un travail formidable !",
    "Encore quelques visites et c'est dans la poche !",
    "Votre prochain mandat vous attend !"
  ];
  
  const eveningMotivations = [
    "Belle journée accomplie !",
    "Bravo pour vos efforts aujourd'hui !",
    "Préparez demain en toute sérénité",
    "Une journée de plus vers vos objectifs !"
  ];
  
  let motivations = morningMotivations;
  
  if (hour >= 5 && hour < 12) {
    greeting = `Bonjour, ${name}`;
    motivations = morningMotivations;
  } else if (hour >= 12 && hour < 18) {
    greeting = `Bon après-midi, ${name}`;
    motivations = afternoonMotivations;
  } else if (hour >= 18 && hour < 22) {
    greeting = `Bonsoir, ${name}`;
    motivations = eveningMotivations;
  } else {
    greeting = `Bonsoir, ${name}`;
    motivations = eveningMotivations;
  }
  
  // Sélectionner une phrase aléatoire
  const randomMotivation = motivations[Math.floor(Math.random() * motivations.length)];
  
  return { greeting, motivation: randomMotivation };
}

export function Header() {
  const { theme, toggleTheme } = useTheme();
  const [greetingMessage, setGreetingMessage] = useState(getGreetingMessage());

  // Mise à jour du message de salutation toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingMessage(getGreetingMessage());
    }, 60000); // Vérifie toutes les minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border-b bg-card">
      <div className="flex h-16 items-center justify-between px-8">
        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold">{greetingMessage.greeting}</h1>
          <p className="text-sm text-muted-foreground">{greetingMessage.motivation}</p>
        </div>

        {/* Search & Notifications */}
        <div className="flex items-center gap-4">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher un lead, un bien, une adresse..."
              className="pl-10"
            />
          </div>
          
          <Button 
            variant="outline" 
            size="icon"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Passer en mode sombre' : 'Passer en mode clair'}
          >
            {theme === 'light' ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>
          
          <div className="relative">
            <Button variant="outline" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Badge variant="destructive" className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
              3
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
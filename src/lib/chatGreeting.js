/**
 * Returns a time- and context-aware greeting for the chat.
 * @param {{ full_name?: string } | null} user - Current user from auth
 * @returns {string} Greeting text
 */
export function getChatGreeting(user) {
  const firstName = user?.full_name?.trim().split(' ')[0] || '';
  const name = firstName || 'vous';
  const h = new Date().getHours();

  const greetings = [];
  if (h >= 6 && h < 12) {
    greetings.push(`Bonjour ${name}, comment puis-je vous aider aujourd'hui ?`);
    greetings.push(`Bonjour ${name}, prêt à démarrer la journée ?`);
    greetings.push(`Bonjour ${name}, quoi de neuf ?`);
  } else if (h >= 12 && h < 14) {
    greetings.push(`Bonne pause ${name}, comment puis-je vous aider ?`);
    greetings.push(`Bon appétit ${name}, je suis là si besoin.`);
  } else if (h >= 14 && h < 18) {
    greetings.push(`Bonne après-midi ${name}, comment puis-je vous aider aujourd'hui ?`);
    greetings.push(`Bonne après-midi ${name}, que puis-je faire pour vous ?`);
  } else if (h >= 18 && h < 22) {
    greetings.push(`Bonsoir ${name}, comment puis-je vous aider ?`);
    greetings.push(`Bonsoir ${name}, une dernière chose avant la fin de journée ?`);
  } else {
    greetings.push(`Bonsoir ${name}, comment puis-je vous aider ?`);
    greetings.push(`Bonne soirée ${name}, je suis là si vous avez besoin.`);
  }

  return greetings[Math.floor(Math.random() * greetings.length)];
}

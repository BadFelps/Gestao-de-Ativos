import { useAccess } from '@/lib/accessContext.jsx';

export default function WelcomeGreeting({ panel }) {
  const { getSession } = useAccess();
  const session = getSession(panel);
  const userName = session?.operatorName || 'Usuário';

  const messages = {
    admin: `E aí ${userName}, Mestre da Organização! Preparado para mais um dia salvando o patrimônio do Grupo MS?`,
    logistics: `E aí, ${userName}! O sistema já está no modo turbo só porque viu você entrando.`,
    driver: `E aí, ${userName}! O sistema já está no modo turbo só porque viu você entrando.`,
    warehouse: `E aí, ${userName}! O sistema já está no modo turbo só porque viu você entrando.`,
    commercial: `E aí, ${userName}! O sistema já está no modo turbo só porque viu você entrando.`,
  };

  return (
    <div className="mb-6 p-4 bg-card rounded-xl border">
      <p className="text-base font-medium text-foreground">{messages[panel]}</p>
    </div>
  );
}
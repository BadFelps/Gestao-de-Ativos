import { motion } from 'framer-motion';

const funnelSteps = [
  { key: 'Aguardando', label: 'Aguardando', color: 'bg-yellow-500' },
  { key: 'Atribuído', label: 'Atribuído', color: 'bg-blue-500' },
  { key: 'Concluído', label: 'Concluído', color: 'bg-green-500' },
  { key: 'Conferido', label: 'Conferido', color: 'bg-teal-500' },
];

export default function FunnelView({ orders }) {
  const active = orders.filter(o => o.status !== 'Excluído');
  const counts = {};
  funnelSteps.forEach(s => { counts[s.key] = 0; });
  active.forEach(o => {
    if (counts[o.status] !== undefined) counts[o.status]++;
    else if (o.status === 'Concluído com Ocorrência') counts['Concluído']++;
    else if (o.status === 'Fechado') counts['Conferido']++;
  });
  const max = Math.max(...Object.values(counts), 1);

  return (
    <div className="bg-card rounded-2xl border p-6">
      <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-4">Funil de Operações</h3>
      <div className="space-y-3">
        {funnelSteps.map((step, i) => (
          <motion.div
            key={step.key}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <span className="text-xs font-medium text-muted-foreground w-24 text-right shrink-0">{step.label}</span>
            <div className="flex-1 bg-muted rounded-full h-8 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(counts[step.key] / max) * 100}%` }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className={`${step.color} h-full rounded-full flex items-center justify-end pr-3 min-w-fit`}
              >
                <span className="text-white text-xs font-bold">{counts[step.key]}</span>
              </motion.div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
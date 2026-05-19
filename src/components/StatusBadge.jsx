import { Badge } from '@/components/ui/badge';

const statusConfig = {
  'Aguardando': { color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  'Atribuído': { color: 'bg-blue-100 text-blue-800 border-blue-200' },
  'Em Rota': { color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  'No Cliente': { color: 'bg-purple-100 text-purple-800 border-purple-200' },
  'Concluído': { color: 'bg-green-100 text-green-800 border-green-200' },
  'Concluído com Ocorrência': { color: 'bg-orange-100 text-orange-800 border-orange-200' },
  'Conferido': { color: 'bg-teal-100 text-teal-800 border-teal-200' },
  'Fechado': { color: 'bg-gray-100 text-gray-800 border-gray-200' },
};

const priorityConfig = {
  'Baixa': 'bg-slate-100 text-slate-700 border-slate-200',
  'Normal': 'bg-blue-100 text-blue-700 border-blue-200',
  'Média': 'bg-blue-100 text-blue-700 border-blue-200', // retrocompatibilidade
  'Alta': 'bg-orange-100 text-orange-700 border-orange-200',
  'Urgente': 'bg-red-100 text-red-700 border-red-200',
};

export function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig['Aguardando'];
  return <Badge variant="outline" className={`${config.color} font-medium text-xs`}>{status}</Badge>;
}

export function PriorityBadge({ priority }) {
  // Exibe "Normal" para "Média" (retrocompatibilidade)
  const display = priority === 'Média' ? 'Normal' : priority;
  const cls = priorityConfig[priority] || priorityConfig['Normal'];
  return <Badge variant="outline" className={`${cls} font-medium text-xs`}>{display}</Badge>;
}

export function PartialBadge() {
  return <Badge variant="outline" className="bg-violet-100 text-violet-800 border-violet-200 font-medium text-xs">⚠ Recolha Parcial</Badge>;
}

export function ActionBadge({ action }) {
  const cls = action === 'Entrega'
    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : 'bg-amber-100 text-amber-800 border-amber-200';
  return <Badge variant="outline" className={`${cls} font-medium text-xs`}>{action}</Badge>;
}
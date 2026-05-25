import { useState, useMemo } from 'react';
import KanbanAssignCard from './KanbanAssignCard';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

const OCCURRENCE_COLORS = {
  'Não deu tempo':      { bg: 'bg-red-50 border-red-200',    dot: 'bg-red-500',    text: 'text-red-700' },
  'Ativo não encontrado': { bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500', text: 'text-orange-700' },
  'Porta Fechada':       { bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500', text: 'text-yellow-700' },
  'Cliente Recusou':     { bg: 'bg-purple-50 border-purple-200', dot: 'bg-purple-500', text: 'text-purple-700' },
  'Endereço Incorreto':  { bg: 'bg-blue-50 border-blue-200',   dot: 'bg-blue-500',   text: 'text-blue-700' },
  'Sem Acesso':          { bg: 'bg-gray-50 border-gray-200',   dot: 'bg-gray-500',   text: 'text-gray-700' },
  'Responsável ausente': { bg: 'bg-pink-50 border-pink-200',   dot: 'bg-pink-500',   text: 'text-pink-700' },
};

// OS "Não deu tempo" ficam no status Aguardando com occurrence_reason definido
// As demais são "Concluído com Ocorrência"
const TRACKED_REASONS = ['Não deu tempo', 'Ativo não encontrado', 'Porta Fechada', 'Cliente Recusou', 'Endereço Incorreto', 'Sem Acesso', 'Responsável ausente', 'Outro'];

export default function LogisticsOccurrencesTab({ orders, onUpdated }) {
  const [selectedReason, setSelectedReason] = useState('');

  // "Não deu tempo" são OS Aguardando com esse motivo (precisam ser re-atribuídas)
  const naoDeuTempo = orders.filter(o =>
    o.status === 'Aguardando' && o.occurrence_reason === 'Não deu tempo'
  );

  // Outras ocorrências finalizadas com "Concluído com Ocorrência" (só as razões tracked)
  const otherOccurrences = orders.filter(o =>
    o.status === 'Concluído com Ocorrência' &&
    TRACKED_REASONS.includes(o.occurrence_reason) &&
    o.occurrence_reason !== 'Não deu tempo'
  );

  const allOccurrences = [...naoDeuTempo, ...otherOccurrences];

  const reasons = useMemo(() => {
    return [...new Set(allOccurrences.map(o => o.occurrence_reason).filter(Boolean))].sort();
  }, [allOccurrences]);

  const filtered = selectedReason
    ? allOccurrences.filter(o => o.occurrence_reason === selectedReason)
    : allOccurrences;

  if (allOccurrences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground py-20">
        <CheckCircle2 className="w-12 h-12 text-green-400" />
        <p className="text-lg font-semibold text-green-600">Tudo certo!</p>
        <p className="text-sm">Nenhuma ocorrência registrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filtros por motivo */}
      {reasons.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <AlertTriangle className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Motivo:</span>
          <button
            onClick={() => setSelectedReason('')}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              !selectedReason ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            Todos ({allOccurrences.length})
          </button>
          {reasons.map(r => {
            const style = OCCURRENCE_COLORS[r] || { text: 'text-gray-700' };
            return (
              <button
                key={r}
                onClick={() => setSelectedReason(selectedReason === r ? '' : r)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  selectedReason === r
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/50'
                }`}
              >
                {r} ({allOccurrences.filter(o => o.occurrence_reason === r).length})
              </button>
            );
          })}
        </div>
      )}

      {/* "Não deu tempo" — pode re-atribuir via KanbanAssignCard */}
      {naoDeuTempo.length > 0 && (!selectedReason || selectedReason === 'Não deu tempo') && (
        <div>
          <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            Não deu tempo — Aguardando nova atribuição
            <span className="bg-red-100 text-red-700 text-xs font-bold rounded-full px-2 py-0.5 border border-red-200">
              {naoDeuTempo.length}
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {naoDeuTempo.map(o => (
              <KanbanAssignCard key={o.id} order={o} onUpdated={onUpdated} />
            ))}
          </div>
        </div>
      )}

      {/* Demais ocorrências concluídas */}
      {otherOccurrences.length > 0 && selectedReason !== 'Não deu tempo' && (
        <div>
          <h3 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            Outras ocorrências registradas
            <span className="bg-orange-100 text-orange-700 text-xs font-bold rounded-full px-2 py-0.5 border border-orange-200">
              {(selectedReason ? otherOccurrences.filter(o => o.occurrence_reason === selectedReason) : otherOccurrences).length}
            </span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(selectedReason ? otherOccurrences.filter(o => o.occurrence_reason === selectedReason) : otherOccurrences).map(o => {
              const style = OCCURRENCE_COLORS[o.occurrence_reason] || { bg: 'bg-gray-50 border-gray-200', dot: 'bg-gray-400', text: 'text-gray-700' };
              return (
                <div key={o.id} className={`rounded-xl border p-4 space-y-2 ${style.bg}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                    <span className={`text-xs font-bold ${style.text}`}>{o.occurrence_reason}</span>
                  </div>
                  <p className="font-semibold text-sm text-foreground">{o.client_name}</p>
                  {o.setor && <p className="text-xs text-muted-foreground">🗂 Setor {o.setor}</p>}
                  {o.assigned_driver && <p className="text-xs text-muted-foreground">🚛 {o.assigned_driver}</p>}
                  {o.route_date && <p className="text-xs text-muted-foreground">📅 {o.route_date}</p>}
                  {o.occurrence_details && (
                    <p className={`text-xs rounded-lg px-2 py-1 border ${style.bg}`}>{o.occurrence_details}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
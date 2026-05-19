import { useState, useMemo } from 'react';
import CommercialCard from '@/components/commercial/CommercialCard';
import { CheckCircle2, MapPin } from 'lucide-react';

export default function OccurrencesTab({ orders, onUpdated, search }) {
  const [selectedSetor, setSelectedSetor] = useState('');

  const setores = useMemo(() => {
    const s = [...new Set(orders.map(o => o.setor).filter(Boolean))].sort();
    return s;
  }, [orders]);

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.os_number?.toLowerCase().includes(search.toLowerCase());
    const matchSetor = !selectedSetor || o.setor === selectedSetor;
    return matchSearch && matchSetor;
  });

  if (filtered.length === 0 && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-3 text-muted-foreground py-20">
        <CheckCircle2 className="w-12 h-12 text-green-400" />
        <p className="text-lg font-semibold text-green-600">Tudo certo por aqui!</p>
        <p className="text-sm">Nenhuma ocorrência pendente.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {/* Filtro por setor */}
      {setores.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Setor:</span>
          <button
            onClick={() => setSelectedSetor('')}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              !selectedSetor
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:border-primary/50'
            }`}
          >
            Todos
          </button>
          {setores.map(s => (
            <button
              key={s}
              onClick={() => setSelectedSetor(selectedSetor === s ? '' : s)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                selectedSetor === s
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-muted-foreground border-border hover:border-primary/50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
          Ocorrências de Campo
          <span className="ml-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full px-2 py-0.5 border border-orange-300">
            {filtered.length} pendente{filtered.length > 1 ? 's' : ''}
          </span>
        </h2>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground py-12">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
            <p className="text-sm">Nenhuma ocorrência para este setor.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(o => (
              <CommercialCard key={o.id} order={o} onUpdated={onUpdated} defaultExpanded />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
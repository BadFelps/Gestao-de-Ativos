import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, RefreshCw, Filter, ArrowDownToLine, ArrowUpFromLine, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import LoanDetailModal from './LoanDetailModal';

// Status labels legíveis
const STATUS_LABELS = {
  pendente_aprovacao_comercial: 'Aguardando Aprovação Comercial',
  aprovado_comercial: 'Aprovado pelo Comercial',
  negado_comercial: 'Negado pelo Comercial',
  pendente_aprovacao_analista: 'Aguardando Aprovação Analista',
  aprovado_analista: 'Aprovado — Aguardando Separação',
  negado_analista: 'Negado pelo Analista',
  pendente: 'Aprovado — Aguardando Entrega',
  entregue: 'Entregue',
  recolhido: 'Recolhido',
  cancelado: 'Cancelado',
};

// Cor da borda lateral + fundo do card por status
const CARD_STYLE = {
  pendente_aprovacao_comercial: { border: 'border-l-amber-400',  bg: 'bg-amber-50',   dot: 'bg-amber-400' },
  aprovado_comercial:           { border: 'border-l-blue-400',   bg: 'bg-blue-50',    dot: 'bg-blue-400' },
  negado_comercial:             { border: 'border-l-gray-300',   bg: 'bg-gray-50',    dot: 'bg-gray-400' },
  pendente_aprovacao_analista:  { border: 'border-l-amber-400',  bg: 'bg-amber-50',   dot: 'bg-amber-400' },
  aprovado_analista:            { border: 'border-l-emerald-400',bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
  negado_analista:              { border: 'border-l-gray-300',   bg: 'bg-gray-50',    dot: 'bg-gray-400' },
  pendente:                     { border: 'border-l-orange-400', bg: 'bg-orange-50',  dot: 'bg-orange-400' },
  entregue:                     { border: 'border-l-green-500',  bg: 'bg-green-50',   dot: 'bg-green-500' },
  recolhido:                    { border: 'border-l-sky-500',    bg: 'bg-sky-50',     dot: 'bg-sky-500' },
  cancelado:                    { border: 'border-l-gray-300',   bg: 'bg-gray-50',    dot: 'bg-gray-400' },
};

// cores inline usadas nos badges da lista
const STATUS_BADGE_STYLE = {
  pendente_aprovacao_comercial: { bg: '#FFE8D0', color: '#7A2200', border: '#FF4500' },
  aprovado_comercial:           { bg: '#DBEAFE', color: '#1E40AF', border: '#93C5FD' },
  negado_comercial:             { bg: '#FFE4E4', color: '#7F0000', border: '#FF0000' },
  pendente_aprovacao_analista:  { bg: '#F3E8FF', color: '#5B0F91', border: '#A020F0' },
  aprovado_analista:            { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  negado_analista:              { bg: '#FFE4E4', color: '#7F0000', border: '#FF0000' },
  pendente:                     { bg: '#E6FFF8', color: '#1A5C47', border: '#7FFFD4' },
  entregue:                     { bg: '#CCFFE0', color: '#005A1A', border: '#00FF00' },
  recolhido:                    { bg: '#E0F2FE', color: '#0C4A6E', border: '#38BDF8' },
  cancelado:                    { bg: '#F3F4F6', color: '#6B7280', border: '#9CA3AF' },
};

export default function LoanRequestsList({ session }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [selected, setSelected] = useState(null);

  const { data: requests = [], isFetching, refetch } = useQuery({
    queryKey: ['loan-requests', session.revenda],
    queryFn: () => base44.entities.LoanRequest.filter({ revenda: session.revenda }, '-created_date', 200),
    staleTime: 30000,
  });

  let filtered = requests;
  if (session.role === 'vendedor') {
    filtered = filtered.filter(r => r.created_by_setor === session.setor || r.created_by_name === session.operatorName);
  }
  if (session.role === 'logistica' && filterCity) {
    filtered = filtered.filter(r => (r.cidade || '').toLowerCase().includes(filterCity.toLowerCase()));
  }
  if (filterStatus) {
    filtered = filtered.filter(r => r.status === filterStatus);
  }
  if (filterDate) {
    filtered = filtered.filter(r => r.loan_date === filterDate);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(r =>
      (r.pdv_code || '').toLowerCase().includes(s) ||
      (r.razao_social || '').toLowerCase().includes(s) ||
      (r.fantasia || '').toLowerCase().includes(s) ||
      (r.cidade || '').toLowerCase().includes(s) ||
      (r.request_number || '').toLowerCase().includes(s)
    );
  }

  const cities = session.role === 'logistica'
    ? [...new Set(requests.map(r => r.cidade).filter(Boolean))].sort()
    : [];

  const selectClass = "px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400";

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar PDV, cliente, cidade..." className="pl-9" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectClass}>
          <option value="">Todos os status</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {session.role === 'logistica' && (
          <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className={selectClass}>
            <option value="">Todas as cidades</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {/* Filtro por data de entrega */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 whitespace-nowrap">Data entrega:</span>
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-xs text-gray-400 hover:text-gray-600 px-1">✕</button>
          )}
        </div>
        <button onClick={() => refetch()} className={`p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 ${isFetching ? 'opacity-50' : ''}`}>
          <RefreshCw className={`w-4 h-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} solicitação(ões)</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma solicitação encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(req => {
            const style = CARD_STYLE[req.status] || { border: 'border-l-gray-300', bg: 'bg-white', dot: 'bg-gray-400' };
            const isRecolha = req.request_type === 'Recolha';

            return (
              <button key={req.id} onClick={() => setSelected(req)}
                className={`w-full ${style.bg} rounded-xl border border-gray-200 border-l-4 ${style.border} p-4 text-left hover:shadow-md transition-all`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">

                    {/* Tipo (Empréstimo/Recolha) + Status */}
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {/* Ícone e label do tipo */}
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${isRecolha ? 'bg-sky-100 text-sky-700' : 'bg-orange-100 text-orange-700'}`}>
                        {isRecolha
                          ? <><ArrowUpFromLine className="w-3 h-3" /> Recolha</>
                          : <><ArrowDownToLine className="w-3 h-3" /> Empréstimo {req.request_type !== 'Fixo' ? `· ${req.request_type}` : ''}</>
                        }
                      </span>
                      {/* Status legível */}
                      {(() => {
                        const bs = STATUS_BADGE_STYLE[req.status] || { bg: '#F3F4F6', color: '#6B7280', border: '#9CA3AF' };
                        return (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border"
                            style={{ backgroundColor: bs.bg, color: bs.color, borderColor: bs.border }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: bs.border }} />
                            {STATUS_LABELS[req.status] || req.status}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Cliente */}
                    <p className="font-bold text-gray-900 text-sm truncate">{req.pdv_code} — {req.fantasia || req.razao_social}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(() => {
                        let mat = `${req.asset_type || ''}${req.asset_brand ? ' · ' + req.asset_brand : ''} × ${req.quantity || 1}`;
                        if (req.extra_items) {
                          try {
                            const extras = JSON.parse(req.extra_items);
                            mat = extras.map(it => `${it.asset_type}${it.asset_brand ? ' · ' + it.asset_brand : ''} × ${it.quantity || 1}`).join(' | ');
                          } catch {}
                        }
                        return mat;
                      })()}
                      {req.cidade ? ` · ${req.cidade}` : ''}
                    </p>

                    {/* Datas */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {req.loan_date && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          📅 <span className="font-medium">{isRecolha ? 'Recolha:' : 'Entrega:'}</span> {req.loan_date}
                        </span>
                      )}
                      {req.return_date && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          ↩ <span className="font-medium">Retorno:</span> {req.return_date}
                        </span>
                      )}
                    </div>

                    {/* Número */}
                    <p className="text-[11px] font-mono text-gray-300 mt-1">{req.request_number}</p>
                  </div>

                  {/* Separação */}
                  {req.separation_status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 flex items-center gap-1 ${req.separation_status === 'concluida' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      <Package className="w-3 h-3" />
                      {req.separation_status === 'concluida' ? 'Sep. OK' : 'Separando'}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <LoanDetailModal
          request={selected}
          session={session}
          onClose={() => setSelected(null)}
          onUpdated={() => { setSelected(null); queryClient.invalidateQueries({ queryKey: ['loan-requests'] }); }}
        />
      )}
    </div>
  );
}
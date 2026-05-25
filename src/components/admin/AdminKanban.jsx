import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PriorityBadge, PartialBadge } from '@/components/StatusBadge';
import AssetsList from '@/components/AssetsList';
import DeleteOrderModal from './DeleteOrderModal';
import OSHistoryModal from './OSHistoryModal';
import { Button } from '@/components/ui/button';
import { History, Lock, User, MapPin, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLUMNS = [
  { key: 'Aguardando',               label: 'Aguardando',    color: 'bg-yellow-400', headerBg: 'bg-yellow-50 border-yellow-200',   textColor: 'text-yellow-800' },
  { key: 'Atribuído',                label: 'Atribuído',     color: 'bg-blue-400',   headerBg: 'bg-blue-50 border-blue-200',       textColor: 'text-blue-800'   },
  { key: 'Concluído',                label: 'Concluído',     color: 'bg-green-400',  headerBg: 'bg-green-50 border-green-200',     textColor: 'text-green-800'  },
  { key: 'Concluído com Ocorrência', label: 'Com Ocorrência',color: 'bg-orange-400', headerBg: 'bg-orange-50 border-orange-200',   textColor: 'text-orange-800' },
  { key: 'Conferido',                label: 'Conferido',     color: 'bg-teal-400',   headerBg: 'bg-teal-50 border-teal-200',       textColor: 'text-teal-800'   },
];
// Fechado fica fora do kanban (aba separada)

function AdminCard({ order, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleFecharOS = async (e) => {
    e.stopPropagation();
    if (!confirm('Confirmar fechamento da OS?')) return;
    await base44.entities.ServiceOrder.update(order.id, { status: 'Fechado' });
    toast.success('OS fechada!');
    onSaved?.();
  };

  // Info "Recolhido" — usa dados do armazém se conferido, senão motorista
  const getRecolhidoInfo = () => {
    if (order.warehouse_checklist?.length > 0) {
      const items = order.warehouse_checklist.map(c => {
        const isMesa = c.qty_mesas !== undefined;
        const qty = isMesa
          ? `${c.qty_mesas || 0} mesas / ${c.qty_cadeiras || 0} cadeiras`
          : `${c.quantity} un.`;
        // model do checklist do armazém; fallback para brand do asset da OS
        const brand = c.model
          || (order.assets || []).find(a => a.asset_type === c.asset_type)?.asset_brand
          || order.asset_brand
          || '';
        const model = brand ? ` (${brand})` : '';
        const patrimonio = c.serial_number ? ` [PAT: ${c.serial_number}]` : '';
        return `${c.asset_type}: ${qty}${model}${patrimonio}`;
      });
      return { source: 'armazém', items, checker: order.warehouse_checked_by };
    }
    if (order.driver_collected_assets?.length > 0) {
      const items = order.driver_collected_assets.map(d => `${d.asset_type}: ${d.qty_collected} un.`);
      return { source: 'motorista', items, checker: null };
    }
    return null;
  };

  const recolhidoInfo = getRecolhidoInfo();
  const hasPatrimonioDivergence = order.warehouse_patrimonio_divergence;

  const isOccurrence = order.status === 'Concluído com Ocorrência';
  const hasTratativa = isOccurrence && !!order.commercial_comment;
  const hasCancelamento = !!order.cancelamento_solicitado;

  return (
    <div className={`rounded-xl border overflow-hidden transition-shadow hover:shadow-lg ${
      hasTratativa ? 'bg-green-50 border-green-300' :
      hasCancelamento ? 'bg-red-50 border-red-300' :
      isOccurrence ? 'bg-orange-50 border-orange-300' : 'bg-white border-border'
    }`}>
      {hasCancelamento && (
        <div className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> CANCELAMENTO SOLICITADO PELO COMERCIAL
        </div>
      )}
      {!hasCancelamento && isOccurrence && (
        <div className={`${hasTratativa ? 'bg-green-600' : 'bg-orange-500'} text-white text-xs font-bold px-3 py-1.5 flex items-center gap-2`}>
          <AlertTriangle className="w-3.5 h-3.5" /> {hasTratativa ? 'OCORRÊNCIA — TRATATIVA SINALIZADA' : 'OCORRÊNCIA'}
        </div>
      )}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1 mb-1">
              <PriorityBadge priority={order.priority} />
              {order.has_pending_assets && <PartialBadge />}
            </div>
            <p className="font-bold text-sm leading-snug text-foreground">{order.client_name}</p>
            {order.client_code && <p className="text-xs text-muted-foreground">PDV: {order.client_code}</p>}
            {order.asset_cev && <p className="text-xs text-muted-foreground">CEV: {order.asset_cev}</p>}
            {!order.asset_cev && order.assets?.some(a => a.asset_cev) && (
              <p className="text-xs text-muted-foreground">CEV: {order.assets.filter(a => a.asset_cev).map(a => a.asset_cev).join(', ')}</p>
            )}
            {/* Status da tratativa comercial */}
            {order.status === 'Concluído com Ocorrência' && (
              order.commercial_comment ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-green-100 text-green-700 border border-green-300 rounded-full px-2 py-0.5 mt-1">
                  ✓ Tratativa sinalizada
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300 rounded-full px-2 py-0.5 mt-1">
                  ⏳ Aguardando Tratativa Comercial
                </span>
              )
            )}
            {order.cancelamento_solicitado && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-red-100 text-red-700 border border-red-300 rounded-full px-2 py-0.5 mt-1">
                🚫 Cancelamento Solicitado
              </span>
            )}
            <div className="mt-1"><AssetsList order={order} /></div>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded-lg hover:bg-muted transition-colors shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>

        {order.assigned_driver && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <User className="w-3 h-3" /> {order.assigned_driver}
          </p>
        )}

        {order.route_date && (
          <p className="text-xs text-muted-foreground">
            📅 {format(new Date(order.route_date), "dd/MM/yyyy", { locale: ptBR })}
          </p>
        )}

        {/* Recolhido info */}
        {recolhidoInfo && (
          <div className={`text-xs rounded-lg px-2.5 py-1.5 space-y-0.5 ${recolhidoInfo.source === 'armazém' ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-muted/50 text-muted-foreground'}`}>
            <span className="font-semibold block">Recolhido{recolhidoInfo.source === 'armazém' ? ' (armazém)' : ' (motorista)'}:</span>
            {recolhidoInfo.items.map((item, i) => <span key={i} className="block">{item}</span>)}
            {recolhidoInfo.checker && <span className="block text-xs mt-0.5 text-teal-700">Conferente: {recolhidoInfo.checker}</span>}
          </div>
        )}

        {hasPatrimonioDivergence && (
          <div className="text-xs bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5 text-red-700 flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="font-semibold">⚠️ Patrimônio divergente no armazém</span>
          </div>
        )}

        {order.warehouse_divergence && (
          <div className="text-xs bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5 text-orange-700">
            ⚠️ Divergência: {order.warehouse_divergence_details}
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1">
          {order.status === 'Conferido' && (
            <Button size="sm" className="gap-1 bg-green-700 hover:bg-green-800 text-xs h-7 flex-1" onClick={handleFecharOS}>
              <Lock className="w-3 h-3" /> Fechar OS
            </Button>
          )}
          <Button size="icon" variant="ghost" className="w-7 h-7 ml-auto text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="Histórico da OS" onClick={e => { e.stopPropagation(); setShowHistory(true); }}>
            <History className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive hover:text-destructive hover:bg-red-50" onClick={e => { e.stopPropagation(); setDeleting(true); }}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {expanded && (
          <div className="border-t pt-2 space-y-2 text-xs">
            {order.client_address && (
              <p className="text-muted-foreground flex items-start gap-1"><MapPin className="w-3 h-3 shrink-0 mt-0.5" />{order.client_address}</p>
            )}
            {order.client_phone && <p className="text-muted-foreground">📞 {order.client_phone}</p>}
            {order.route_date && <p className="text-muted-foreground">🗓 Rota: <strong>{format(new Date(order.route_date), 'dd/MM/yyyy', { locale: ptBR })}</strong></p>}
            {order.driver_notes && <p className="bg-muted/40 rounded p-2">{order.driver_notes}</p>}
            {order.occurrence_reason && (
              <p className="text-orange-700 bg-orange-50 border border-orange-200 rounded p-2 flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                <span><strong>{order.occurrence_reason}</strong>{order.occurrence_details && `: ${order.occurrence_details}`}</span>
              </p>
            )}
            {order.status === 'Conferido' && (
              <div className="bg-green-50 border border-green-200 rounded p-2 flex items-center justify-between gap-2">
                <p className="text-green-800 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Pronto para fechar</p>
                <Button size="sm" className="gap-1 bg-green-700 hover:bg-green-800 h-6 text-xs" onClick={handleFecharOS}>
                  <Lock className="w-3 h-3" /> Fechar
                </Button>
              </div>
            )}
            {order.photo_urls?.length > 0 && (
              <div className="flex gap-1.5 flex-wrap pt-1">
                {order.photo_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className="w-12 h-12 rounded object-cover border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {showHistory && <OSHistoryModal order={order} onClose={() => setShowHistory(false)} />}
      {deleting && <DeleteOrderModal order={order} onClose={() => setDeleting(false)} onDeleted={onSaved} />}
    </div>
  );
}

export default function AdminKanban({ orders, onSaved }) {
  // Exclude deleted orders from kanban
  const activeOrders = orders.filter(o => o.status !== 'Excluído');
  return (
    <div className="flex overflow-x-auto gap-3 h-full" style={{ minHeight: 0 }}>
      {COLUMNS.map(col => {
        const colOrders = activeOrders.filter(o => o.status === col.key);
        const isEmpty = colOrders.length === 0;
        return (
          <div
            key={col.key}
            className="flex flex-col rounded-2xl border shadow-sm overflow-hidden transition-all duration-300"
            style={isEmpty
              ? { flexShrink: 0, width: '52px', minWidth: '52px' }
              : { flex: '1 1 0', minWidth: '220px', maxWidth: '320px' }
            }
          >
            {isEmpty ? (
              <div className={`flex flex-col items-center justify-start py-4 h-full gap-3 ${col.headerBg}`}>
                <div className={`w-2.5 h-2.5 rounded-full ${col.color} shrink-0`} />
                <span
                  className={`font-bold text-xs ${col.textColor} whitespace-nowrap`}
                  style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                >
                  {col.label}
                </span>
                <span className={`text-xs font-bold w-6 h-6 rounded-full bg-white/80 border flex items-center justify-center ${col.textColor}`}>0</span>
              </div>
            ) : (
              <>
                <div className={`flex items-center gap-2.5 px-4 py-3 border-b ${col.headerBg}`}>
                  <div className={`w-3 h-3 rounded-full ${col.color} shrink-0`} />
                  <span className={`font-bold text-sm ${col.textColor} flex-1`}>{col.label}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 border ${col.textColor}`}>{colOrders.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/20">
                  {colOrders.map(o => <AdminCard key={o.id} order={o} onSaved={onSaved} />)}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
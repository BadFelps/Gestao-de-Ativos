import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAccess } from '@/lib/accessContext.jsx';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Loader2, ChevronDown, ChevronUp, MessageSquare, Calendar, Package, XCircle, CheckCircle2 } from 'lucide-react';
import { StatusBadge, PartialBadge } from '@/components/StatusBadge';
import AssetsList from '@/components/AssetsList';
import { toast } from 'sonner';
import RetryAuthModal from './RetryAuthModal';

export default function OccurrencesList({ orders, onUpdated }) {
  const [expanded, setExpanded] = useState({});
  const [modalOrder, setModalOrder] = useState(null);

  const occurrenceOrders = orders.filter(o =>
    o.status === 'Concluído com Ocorrência' ||
    o.has_pending_assets === true ||
    o.cancelamento_solicitado === true
  );

  if (occurrenceOrders.length === 0) return null;

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  return (
    <>
      <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <span className="font-bold text-orange-800">Ocorrências Pendentes ({occurrenceOrders.length})</span>
          <span className="text-xs text-orange-600 ml-auto">Autorize retentativas abaixo</span>
        </div>

        {occurrenceOrders.map(o => {
          const isPendingRescue = o.status === 'Fechado' && o.has_pending_assets;
          const isCancelRequested = !!o.cancelamento_solicitado;
          return (
            <div key={o.id} className={`bg-white rounded-xl border overflow-hidden ${isCancelRequested ? 'border-red-300' : isPendingRescue ? 'border-slate-300' : 'border-orange-200'}`}>
              <div className="p-3 flex items-start justify-between gap-2 flex-wrap">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {o.retry_count > 0 && (
                      <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full border border-orange-200">
                        {o.retry_count}ª tentativa
                      </span>
                    )}
                    {o.has_pending_assets && o.retry_selected_assets?.length > 0 && (
                      <PartialBadge />
                    )}
                    {isPendingRescue && (
                      <span className="bg-slate-100 text-slate-700 text-xs font-bold px-2 py-0.5 rounded-full border border-slate-300">
                        Fechado c/ Pendência
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-sm mt-0.5">{o.client_name}</p>
                  {o.occurrence_reason && (
                    <p className="text-xs text-orange-700 mt-0.5">
                      ⚠️ {o.occurrence_reason}{o.occurrence_details && `: ${o.occurrence_details}`}
                    </p>
                  )}
                  {o.retry_suggested_date && !isPendingRescue && (
                    <p className="text-xs text-blue-700 mt-0.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Data sugerida pelo comercial: <strong>{o.retry_suggested_date}</strong>
                    </p>
                  )}
                  {isPendingRescue && o.pending_assets_list?.length > 0 && (
                    <div className="mt-1 text-xs text-slate-700 flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      {o.pending_assets_list.length} ativo(s) pendente(s): {o.pending_assets_list.map(a => a.asset_type).join(', ')}
                    </div>
                  )}
                  {o.commercial_comment && (
                    <div className="mt-1.5 text-xs bg-blue-50 border border-blue-100 rounded-lg p-2 text-blue-800 flex items-start gap-1.5">
                      <MessageSquare className="w-3 h-3 shrink-0 mt-0.5 text-blue-500" />
                      <span><strong>{o.commercial_comment_by}:</strong> {o.commercial_comment}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <Button size="sm" onClick={() => toggle(o.id)} variant="ghost" className="h-7 w-7 p-0">
                    {expanded[o.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  {isCancelRequested ? (
                    <ConfirmCancelButton order={o} onUpdated={onUpdated} />
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setModalOrder(o)}
                      className={`h-8 text-xs gap-1 ${isPendingRescue ? 'bg-slate-600 hover:bg-slate-700' : 'bg-orange-500 hover:bg-orange-600'} text-white`}
                    >
                      <RefreshCw className="w-3 h-3" />
                      {isPendingRescue ? 'Resgatar Pendentes' : 'Autorizar Retentativa'}
                    </Button>
                  )}
                </div>
              </div>
              {expanded[o.id] && (
                <div className="border-t bg-muted/20 px-3 py-2 space-y-1.5">
                  <AssetsList order={o} />
                  {o.assigned_driver && <p className="text-xs text-muted-foreground">🚛 {o.assigned_driver} {o.assigned_vehicle && `• ${o.assigned_vehicle}`}</p>}
                  {o.driver_notes && <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">📝 {o.driver_notes}</p>}
                  {o.photo_urls?.length > 0 && (
                    <div className="flex gap-2 flex-wrap pt-1">
                      {o.photo_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer">
                          <img src={url} alt="" className="w-12 h-12 rounded-lg object-cover border hover:opacity-80" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {modalOrder && (
        <RetryAuthModal
          order={modalOrder}
          open={!!modalOrder}
          onClose={() => setModalOrder(null)}
          onUpdated={onUpdated}
        />
      )}
    </>
  );
}

function ConfirmCancelButton({ order, onUpdated }) {
  const [loading, setLoading] = useState(false);
  const { getSession } = useAccess();
  const session = getSession('admin');

  const handleConfirm = async () => {
    if (!confirm('Confirmar cancelamento desta recolha? A OS será excluída.')) return;
    setLoading(true);
    await base44.entities.ServiceOrder.update(order.id, {
      status: 'Excluído',
      deleted_at: new Date().toISOString(),
      deleted_by: session?.operatorName || 'Admin',
      deletion_reason: 'Cancelamento solicitado pelo Comercial e confirmado pelo Administrativo.',
    });
    toast.success('Recolha cancelada e excluída!');
    setLoading(false);
    onUpdated?.();
  };

  const handleRejeitar = async () => {
    setLoading(true);
    await base44.entities.ServiceOrder.update(order.id, {
      cancelamento_solicitado: false,
      cancelamento_solicitado_por: null,
      commercial_comment: order.commercial_comment + ' [Cancelamento rejeitado pelo Administrativo]',
    });
    toast.success('Solicitação de cancelamento rejeitada.');
    setLoading(false);
    onUpdated?.();
  };

  return (
    <div className="flex gap-1">
      <Button size="sm" onClick={handleRejeitar} disabled={loading} variant="outline" className="h-8 text-xs gap-1 border-slate-400 text-slate-700">
        <XCircle className="w-3 h-3" /> Rejeitar
      </Button>
      <Button size="sm" onClick={handleConfirm} disabled={loading} className="h-8 text-xs gap-1 bg-red-600 hover:bg-red-700 text-white">
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
        Confirmar Cancelamento
      </Button>
    </div>
  );
}
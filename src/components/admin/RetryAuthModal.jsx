import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAccess } from '@/lib/accessContext.jsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { RefreshCw, Loader2, Calendar, Package, AlertTriangle, MessageSquare } from 'lucide-react';

export default function RetryAuthModal({ order, open, onClose, onUpdated }) {
  const { getSession } = useAccess();
  const session = getSession('admin');

  const allAssets = order?.assets?.length > 0
    ? order.assets
    : (order?.asset_type ? [{ asset_type: order.asset_type, asset_brand: order.asset_brand, asset_serial: order.asset_serial, quantity: order.quantity, asset_description: order.asset_description }] : []);

  const [selectedIdxs, setSelectedIdxs] = useState(allAssets.map((_, i) => i));
  const [retryDate, setRetryDate] = useState(order?.retry_suggested_date || order?.route_date || '');
  const [loading, setLoading] = useState(false);

  if (!order) return null;

  const toggleAsset = (i) => {
    setSelectedIdxs(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);
  };

  const handleAuthorize = async (finishPending = false) => {
    if (!finishPending && !retryDate) { toast.error('Informe a data da retentativa'); return; }
    if (!finishPending && selectedIdxs.length === 0) { toast.error('Selecione pelo menos um ativo'); return; }

    setLoading(true);
    const selected = allAssets.filter((_, i) => selectedIdxs.includes(i));
    const pending = allAssets.filter((_, i) => !selectedIdxs.includes(i));
    const newRetryCount = (order.retry_count || 0) + 1;
    const firstAsset = selected[0] || {};

    if (finishPending) {
      // Close with pending assets
      await base44.entities.ServiceOrder.update(order.id, {
        status: 'Fechado',
        has_pending_assets: true,
        pending_assets_list: allAssets,
      });
      await base44.entities.ActivityLog.create({
        action: 'Fechou com Pendência',
        panel: 'admin',
        operator_name: session?.operatorName || 'Admin',
        access_code: session?.code || '',
        os_number: order.os_number,
        details: `${allAssets.length} ativo(s) pendentes: ${allAssets.map(a => a.asset_type).join(', ')}`,
      });
      toast.success('OS fechada com pendência registrada');
    } else {
      // Snapshot da tentativa atual antes de resetar
      const snapshotAttempt = {
        attempt_number: order.retry_count || 0,
        authorized_by: session?.operatorName || 'Admin',
        authorized_date: new Date().toISOString(),
        occurrence_reason: order.occurrence_reason || '',
        occurrence_details: order.occurrence_details || '',
        driver: order.assigned_driver || '',
        route_date: order.route_date || '',
        commercial_comment: order.commercial_comment || '',
        commercial_comment_by: order.commercial_comment_by || '',
      };
      const existingHistory = order.retry_history || [];

      await base44.entities.ServiceOrder.update(order.id, {
        status: 'Aguardando',
        retry_count: newRetryCount,
        retry_authorized_by: session?.operatorName || 'Admin',
        retry_confirmed_date: retryDate,
        retry_selected_assets: selected,
        retry_history: [...existingHistory, snapshotAttempt],
        assets: selected,
        asset_type: firstAsset.asset_type || order.asset_type,
        asset_brand: firstAsset.asset_brand || order.asset_brand,
        asset_serial: firstAsset.asset_serial || order.asset_serial,
        quantity: firstAsset.quantity || order.quantity,
        has_pending_assets: pending.length > 0,
        pending_assets_list: pending.length > 0 ? pending : [],
        assigned_driver: '',
        assigned_vehicle: '',
        route_date: '',
        // Limpa campos da tentativa anterior para não contaminar o histórico novo
        occurrence_reason: '',
        occurrence_details: '',
        commercial_comment: '',
        commercial_comment_by: '',
        commercial_comment_date: '',
        driver_checkin_time: '',
        driver_checkout_time: '',
        driver_notes: '',
        driver_collected_assets: [],
        driver_status: 'Pendente',
        cancelamento_solicitado: false,
      });
      await base44.entities.ActivityLog.create({
        action: 'Autorizou Retentativa',
        panel: 'admin',
        operator_name: session?.operatorName || 'Admin',
        access_code: session?.code || '',
        os_number: order.os_number,
        details: `Tentativa #${newRetryCount} — ${selected.length} ativo(s) — Data: ${retryDate}${pending.length > 0 ? ` — ${pending.length} ativo(s) pendente(s)` : ''}`,
      });
      toast.success(`Retentativa #${newRetryCount} autorizada!${pending.length > 0 ? ` ${pending.length} ativo(s) ficaram pendentes.` : ''}`);
    }

    setLoading(false);
    onClose();
    onUpdated?.();
  };

  const handleRescuePending = async () => {
    const pending = order.pending_assets_list || [];
    if (pending.length === 0) return;
    setLoading(true);
    const firstAsset = pending[0];
    const newRetryCount = (order.retry_count || 0) + 1;
    await base44.entities.ServiceOrder.update(order.id, {
      status: 'Aguardando',
      retry_count: newRetryCount,
      retry_authorized_by: session?.operatorName || 'Admin',
      retry_confirmed_date: retryDate || '',
      assets: pending,
      asset_type: firstAsset.asset_type,
      asset_brand: firstAsset.asset_brand,
      asset_serial: firstAsset.asset_serial,
      quantity: firstAsset.quantity,
      has_pending_assets: false,
      pending_assets_list: [],
      assigned_driver: '',
      assigned_vehicle: '',
      route_date: '',
    });
    await base44.entities.ActivityLog.create({
      action: 'Resgatou Pendências',
      panel: 'admin',
      operator_name: session?.operatorName || 'Admin',
      access_code: session?.code || '',
      os_number: order.os_number,
      details: `${pending.length} ativo(s) resgatados para retentativa #${newRetryCount}`,
    });
    toast.success('Ativos pendentes resgatados para retentativa!');
    setLoading(false);
    onClose();
    onUpdated?.();
  };

  const isPendingRescue = order.has_pending_assets === true && order.pending_assets_list?.length > 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <RefreshCw className="w-4 h-4 text-orange-500" />
            {isPendingRescue ? 'Resgatar Ativos Pendentes' : 'Autorizar Retentativa'} — {order.os_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Occurrence info */}
          {order.occurrence_reason && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-orange-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {order.occurrence_reason}
              </p>
              {order.occurrence_details && <p className="text-xs text-orange-700 mt-0.5">{order.occurrence_details}</p>}
            </div>
          )}

          {/* Commercial comment */}
          {order.commercial_comment && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-0.5">
                <MessageSquare className="w-3 h-3" /> Comercial ({order.commercial_comment_by}):
              </p>
              <p className="text-sm text-blue-800">{order.commercial_comment}</p>
            </div>
          )}

          {!isPendingRescue && (
            <div className="space-y-1.5">
              <label className="text-sm font-semibold flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-primary" /> Data da Retentativa
              </label>
              {order.retry_suggested_date && (
                <p className="text-xs text-muted-foreground">
                  📅 Sugerida pelo comercial: <strong>{order.retry_suggested_date}</strong>
                </p>
              )}
              <Input type="date" value={retryDate} onChange={e => setRetryDate(e.target.value)} className="h-9" />
            </div>
          )}

          {/* Asset selection */}
          <div className="space-y-2">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <Package className="w-4 h-4 text-primary" />
              {isPendingRescue ? 'Ativos Pendentes a Resgatar' : 'Selecione os ativos para retentativa'}
            </p>
            <div className="space-y-2">
              {(isPendingRescue ? (order.pending_assets_list || []) : allAssets).map((a, i) => (
                <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                  isPendingRescue || selectedIdxs.includes(i)
                    ? 'bg-green-50 border-green-200'
                    : 'bg-muted/30 border-muted'
                }`}>
                  {!isPendingRescue && (
                    <Checkbox
                      checked={selectedIdxs.includes(i)}
                      onCheckedChange={() => toggleAsset(i)}
                      id={`asset-${i}`}
                    />
                  )}
                  <label htmlFor={`asset-${i}`} className="text-sm cursor-pointer flex-1 flex flex-wrap gap-x-2 items-center">
                    <span className="font-semibold">{a.asset_type}</span>
                    {a.asset_brand && <span className="text-muted-foreground text-xs">{a.asset_brand}</span>}
                    {a.asset_serial && <span className="font-mono text-xs text-muted-foreground">CEV: {a.asset_serial}</span>}
                    {a.quantity > 1 && <span className="text-xs text-muted-foreground">Qtd: {a.quantity}</span>}
                  </label>
                  {!isPendingRescue && !selectedIdxs.includes(i) && (
                    <span className="text-xs text-orange-600 font-semibold shrink-0">Pendente</span>
                  )}
                </div>
              ))}
            </div>
            {!isPendingRescue && selectedIdxs.length < allAssets.length && allAssets.length > 0 && (
              <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
                ⚠️ {allAssets.length - selectedIdxs.length} ativo(s) não selecionado(s) ficarão pendentes na OS
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 flex-col sm:flex-row">
          {isPendingRescue ? (
            <Button onClick={handleRescuePending} disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Resgatar e Enviar para Logística
            </Button>
          ) : (
            <>
              {selectedIdxs.length < allAssets.length && (
                <Button
                  variant="outline"
                  onClick={() => handleAuthorize(true)}
                  disabled={loading}
                  className="border-orange-300 text-orange-700 hover:bg-orange-50 text-xs"
                >
                  Fechar OS com Pendência
                </Button>
              )}
              <Button
                onClick={() => handleAuthorize(false)}
                disabled={loading || selectedIdxs.length === 0}
                className="bg-orange-500 hover:bg-orange-600 text-white gap-1.5 flex-1"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Autorizar ({selectedIdxs.length} ativo{selectedIdxs.length !== 1 ? 's' : ''})
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
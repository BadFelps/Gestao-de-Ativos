import { useState } from 'react';
import { AlertTriangle, Package, CheckCircle2, ClipboardCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import WarehouseResolutionModal from '@/components/admin/WarehouseResolutionModal';

export default function WarehouseAlertBanner({ orders, onUpdated, showActions = false, collapsible = false }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [open, setOpen] = useState(!collapsible);

  const alerts = orders.filter(
    o => (o.warehouse_asset_condition && o.warehouse_asset_condition !== 'Bom') || o.warehouse_divergence
  );

  if (alerts.length === 0 || collapsible) return null;

  const pendingAlerts = alerts.filter(o => !o.warehouse_resolution);
  const resolvedAlerts = alerts.filter(o => o.warehouse_resolution);

  const conditionColor = {
    'Danificado': 'bg-orange-50 border-orange-300 text-orange-800',
    'Sucata': 'bg-red-50 border-red-300 text-red-800',
  };

  const conditionBadge = {
    'Danificado': 'bg-orange-100 text-orange-700 border-orange-300',
    'Sucata': 'bg-red-100 text-red-700 border-red-300',
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-red-300 bg-red-50 overflow-hidden mb-4">
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-red-100 transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-red-800 text-sm">
              ⚠️ {alerts.length} OS com Divergência no Armazém
              {pendingAlerts.length > 0 && ` — ${pendingAlerts.length} aguardando tratativa`}
            </p>
            <p className="text-xs text-red-600">Ativo(s) recebidos em condição diferente de "Bom".</p>
          </div>
          {open ? <ChevronUp className="w-4 h-4 text-red-600 shrink-0" /> : <ChevronDown className="w-4 h-4 text-red-600 shrink-0" />}
        </button>

        {open && (
        <div className="border-t border-red-200 px-4 pb-4 pt-3 space-y-2">
          {alerts.map(o => {
            const cls = conditionColor[o.warehouse_asset_condition] || 'bg-yellow-50 border-yellow-300 text-yellow-800';
            const badge = conditionBadge[o.warehouse_asset_condition] || 'bg-yellow-100 text-yellow-700 border-yellow-300';
            const resolved = !!o.warehouse_resolution;

            return (
              <div key={o.id} className={`rounded-xl border p-3 space-y-1 ${resolved ? 'bg-green-50 border-green-300 text-green-800 opacity-75' : cls}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold">{o.os_number}</span>
                  <span className="font-semibold text-sm">{o.client_name}</span>
                  {!resolved && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${badge}`}>
                      <Package className="inline w-3 h-3 mr-1" />
                      {o.warehouse_asset_condition}
                    </span>
                  )}
                  {o.warehouse_divergence && !resolved && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-red-100 text-red-700 border-red-300">
                      Divergência
                    </span>
                  )}
                  {resolved && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-green-100 text-green-700 border-green-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Tratativa Registrada
                    </span>
                  )}
                  {showActions && !resolved && (
                    <Button size="sm" className="ml-auto h-6 text-xs gap-1 bg-red-700 hover:bg-red-800"
                      onClick={() => setSelectedOrder(o)}>
                      <ClipboardCheck className="w-3 h-3" /> Registrar Tratativa
                    </Button>
                  )}
                </div>
                {!resolved && o.warehouse_notes && (
                  <p className="text-xs bg-white/60 rounded-lg px-3 py-1.5">
                    📝 <strong>Armazém:</strong> {o.warehouse_notes}
                  </p>
                )}
                {!resolved && o.warehouse_divergence_details && (
                  <p className="text-xs text-red-700">⚠️ {o.warehouse_divergence_details}</p>
                )}
                {resolved && (
                  <p className="text-xs bg-white/60 rounded-lg px-3 py-1.5">
                    ✅ <strong>{o.warehouse_resolution_by}</strong> — {o.warehouse_resolution}
                    {o.warehouse_resolution_date && (
                      <span className="ml-2 opacity-60">{new Date(o.warehouse_resolution_date).toLocaleDateString('pt-BR')}</span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        )}
      </motion.div>

      {selectedOrder && (
        <WarehouseResolutionModal
          order={selectedOrder}
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onSaved={() => { setSelectedOrder(null); onUpdated?.(); }}
        />
      )}
    </>
  );
}
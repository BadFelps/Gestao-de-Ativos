import { useState } from 'react';
import { StatusBadge, PriorityBadge, ActionBadge, PartialBadge } from '@/components/StatusBadge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, User, ChevronDown, ChevronUp, MapPin, Phone, Pencil, Lock, CheckCircle2 } from 'lucide-react';
import AssetsList from '@/components/AssetsList';
import { Button } from '@/components/ui/button';
import EditOrderModal from './EditOrderModal';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

function getRecolhidoInfo(order) {
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
  return null;
}

function OrderRow({ order, onSaved }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const recolhidoInfo = getRecolhidoInfo(order);

  const handleFecharOS = async (e) => {
    e.stopPropagation();
    if (!confirm('Confirmar fechamento da OS?')) return;
    await base44.entities.ServiceOrder.update(order.id, { status: 'Fechado' });
    toast.success('OS fechada com sucesso!');
    onSaved?.();
  };

  return (
    <>
      <tr
        key={order.id}
        className="border-b last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 font-mono text-xs font-bold">{order.os_number}</td>
        <td className="px-4 py-3">
          <div className="font-medium">{order.client_name}</div>
          {order.client_code && <div className="text-xs text-muted-foreground">{order.client_code}</div>}
        </td>
        <td className="px-4 py-3"><ActionBadge action={order.action_type} /></td>
        <td className="px-4 py-3">
          <AssetsList order={order} />
        </td>
        <td className="px-4 py-3"><PriorityBadge priority={order.priority} /></td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1">
            <StatusBadge status={order.status} />
            {order.has_pending_assets && <PartialBadge />}
          </div>
        </td>
        <td className="px-4 py-3">
          {order.assigned_driver ? (
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm">{order.assigned_driver}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-xs">—</span>
          )}
        </td>
        <td className="px-4 py-3 text-xs text-muted-foreground">
          {order.created_date ? format(new Date(order.created_date), "dd/MM/yy HH:mm", { locale: ptBR }) : '—'}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {order.status === 'Conferido' && (
              <Button size="sm" className="gap-1 bg-green-700 hover:bg-green-800 text-xs h-7" onClick={handleFecharOS}>
                <Lock className="w-3 h-3" /> Fechar OS
              </Button>
            )}
            <Button size="icon" variant="ghost" className="w-7 h-7" onClick={e => { e.stopPropagation(); setEditing(true); }}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </td>
      </tr>
      {editing && <EditOrderModal order={order} open={editing} onClose={() => setEditing(false)} onSaved={onSaved} />}
      {expanded && (
        <tr className="bg-muted/20 border-b">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {order.client_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Endereço</div>
                    <div>{order.client_address}</div>
                  </div>
                </div>
              )}
              {order.client_phone && (
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Telefone</div>
                    <div>{order.client_phone}</div>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <div className="w-full"><AssetsList order={order} /></div>
              </div>
              {order.assigned_vehicle && (
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Veículo</div>
                  <div>{order.assigned_vehicle}</div>
                </div>
              )}
              {order.route_date && (
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Data da Rota</div>
                  <div>{format(new Date(order.route_date), "dd/MM/yyyy", { locale: ptBR })}</div>
                </div>
              )}
              {order.region && (
                <div>
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Região</div>
                  <div>{order.region}</div>
                </div>
              )}
              {order.driver_notes && (
                <div className="sm:col-span-2">
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Obs. Motorista</div>
                  <div>{order.driver_notes}</div>
                </div>
              )}
              {order.occurrence_reason && (
                <div className="sm:col-span-2">
                  <div className="text-xs text-orange-600 font-medium uppercase tracking-wide">⚠️ Ocorrência</div>
                  <div className="text-orange-700">{order.occurrence_reason}{order.occurrence_details && `: ${order.occurrence_details}`}</div>
                </div>
              )}
              {recolhidoInfo && (
                <div className="sm:col-span-3">
                  <div className="text-xs text-teal-700 font-semibold uppercase tracking-wide mb-1">✓ Recolhido (armazém)</div>
                  <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-xs text-teal-800 space-y-0.5">
                    {recolhidoInfo.items.map((item, i) => (
                      <p key={i}>{item}</p>
                    ))}
                    {recolhidoInfo.checker && (
                      <p className="text-teal-600 mt-1">Conferente: {recolhidoInfo.checker}</p>
                    )}
                  </div>
                </div>
              )}
              {order.warehouse_divergence && (
                <div className="sm:col-span-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
                  ⚠️ Divergência: {order.warehouse_divergence_details}
                </div>
              )}
              {order.status === 'Conferido' && (
                <div className="sm:col-span-3 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Conferência concluída — pronto para fechar
                  </p>
                  <Button size="sm" className="gap-1.5 bg-green-700 hover:bg-green-800 shrink-0" onClick={handleFecharOS}>
                    <Lock className="w-3.5 h-3.5" /> Fechar OS
                  </Button>
                </div>
              )}
              {order.photo_urls?.length > 0 && (
                <div className="sm:col-span-3">
                  <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Fotos</div>
                  <div className="flex gap-2 flex-wrap">
                    {order.photo_urls.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt={`Foto ${i + 1}`} className="w-16 h-16 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function OrdersTable({ orders, onSaved }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="bg-card rounded-2xl border p-12 text-center">
        <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhuma OS encontrada</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">OS</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Cliente</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Ação</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Ativo</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Prioridade</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Motorista</th>
              <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Data</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => <OrderRow key={order.id} order={order} onSaved={onSaved} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
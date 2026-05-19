import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Lock, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

function ClosedCard({ order, onSaved }) {
  const [expanded, setExpanded] = useState(false);

  const handleReopen = async () => {
    if (!confirm('Reabrir esta OS?')) return;
    await base44.entities.ServiceOrder.update(order.id, { status: 'Conferido' });
    toast.success('OS reaberta para Conferido.');
    onSaved?.();
  };

  return (
    <div className="bg-white border rounded-xl overflow-hidden">
      <div
        className="p-3 flex items-center justify-between gap-2 cursor-pointer hover:bg-muted/20"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground">{order.client_name}</p>
          <p className="text-xs text-muted-foreground">
            {order.assigned_driver && `🚛 ${order.assigned_driver}`}
            {order.route_date && ` · 📅 ${format(new Date(order.route_date), 'dd/MM/yyyy', { locale: ptBR })}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs bg-gray-100 text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
            <Lock className="w-3 h-3" /> Fechada
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t px-3 py-2 text-xs text-muted-foreground space-y-1 bg-muted/10">
          {order.client_address && <p>📍 {order.client_address}</p>}
          {order.warehouse_checklist?.length > 0 && (
            <div className="bg-teal-50 border border-teal-200 rounded px-2 py-1.5 text-teal-800">
              <p className="font-semibold mb-0.5">Conferido pelo armazém:</p>
              {order.warehouse_checklist.map((c, i) => (
                <p key={i}>{c.asset_type}: {c.quantity} un.{c.model ? ` · ${c.model}` : ''}{c.condition ? ` · ${c.condition}` : ''}</p>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-1">
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleReopen}>Reabrir</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClosedOrders({ orders, onSaved }) {
  const [search, setSearch] = useState('');
  const closed = orders.filter(o => o.status === 'Fechado');
  const filtered = closed.filter(o =>
    !search ||
    o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.os_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.assigned_driver?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">OS Fechadas</h3>
        <span className="text-sm text-muted-foreground">{closed.length} OS</span>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar..." className="pl-10 h-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      {filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 text-sm">
          <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          {closed.length === 0 ? 'Nenhuma OS fechada ainda' : 'Nenhum resultado'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(o => <ClosedCard key={o.id} order={o} onSaved={onSaved} />)}
        </div>
      )}
    </div>
  );
}
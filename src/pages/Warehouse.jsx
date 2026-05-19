import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAccess } from '@/lib/accessContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PanelAccessGate from '@/components/PanelAccessGate';
import PanelTop from '@/components/PanelTop';
import WarehouseConferencia from '@/components/warehouse/WarehouseConferencia';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, ClipboardCheck, CheckCircle2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Warehouse() {
  return (
    <PanelAccessGate panel="warehouse">
      <WarehouseContent />
    </PanelAccessGate>
  );
}

function WarehouseContent() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const queryClient = useQueryClient();
  const { getSession } = useAccess();
  const session = getSession('warehouse');
  const revenda = session?.revenda || null;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['warehouse-orders', revenda],
    queryFn: () => revenda
      ? base44.entities.ServiceOrder.filter({ revenda }, '-updated_date', 300)
      : base44.entities.ServiceOrder.list('-updated_date', 300),
    refetchInterval: 30000,
  });

  // OS atribuídas/em rota (motorista ainda não concluiu)
  const inRouteOrders = orders.filter(o =>
    (o.status === 'Atribuído' || o.status === 'Em Rota' || o.status === 'No Cliente') &&
    o.status !== 'Excluído'
  );

  // OS prontas para conferir: Concluído ou Concluído com Ocorrência, não conferidas ainda
  // Excluímos OS com ocorrência onde o motorista não registrou materiais recolhidos (não tem o que conferir)
  const pendingOrders = orders.filter(o => {
    if (o.status !== 'Concluído' && o.status !== 'Concluído com Ocorrência') return false;
    if (o.status === 'Conferido' || o.status === 'Fechado' || o.status === 'Excluído') return false;
    // Se foi "Concluído com Ocorrência" e não tem materiais recolhidos, não sobe para armazém
    if (o.status === 'Concluído com Ocorrência') {
      const hasCollected = o.driver_collected_assets && o.driver_collected_assets.length > 0;
      if (!hasCollected) return false;
    }
    return true;
  });

  // OS já conferidas
  const doneOrders = orders.filter(o => o.status === 'Conferido' || o.status === 'Fechado');

  const sourceList = activeTab === 'inroute' ? inRouteOrders : activeTab === 'pending' ? pendingOrders : doneOrders;
  const filtered = sourceList.filter(o =>
    !search ||
    o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.os_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.assigned_driver?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <PanelTop panel="warehouse" title="Armazém" />

      {/* Tabs */}
      <div className="border-b bg-card px-3 sm:px-6 pt-3 pb-0 shrink-0">
        <div className="flex gap-1">
          <TabBtn value="pending" active={activeTab} setActive={setActiveTab} count={pendingOrders.length}>
            <ClipboardCheck className="w-4 h-4" /> Aguardando Conferência
          </TabBtn>
          <TabBtn value="inroute" active={activeTab} setActive={setActiveTab} count={inRouteOrders.length}>
            <Truck className="w-4 h-4" /> Em Rota
          </TabBtn>
          <TabBtn value="done" active={activeTab} setActive={setActiveTab} count={doneOrders.length}>
            <CheckCircle2 className="w-4 h-4" /> Conferidas
          </TabBtn>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2 border-b bg-card shrink-0 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por cliente, OS ou motorista..." className="pl-10 h-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => queryClient.invalidateQueries({ queryKey: ['warehouse-orders', revenda] })}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <ClipboardCheck className="w-10 h-10 opacity-30" />
            <p className="text-sm">
              {activeTab === 'inroute' ? 'Nenhuma OS em rota no momento' : activeTab === 'pending' ? 'Nenhuma OS aguardando conferência' : 'Nenhuma OS conferida ainda'}
            </p>
          </div>
        ) : activeTab === 'inroute' ? (
          <div className="max-w-2xl mx-auto space-y-3">
            {filtered.map(order => (
              <WarehouseConferencia
                key={order.id}
                order={order}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['warehouse-orders', revenda] })}
                readOnly={false}
              />
            ))}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-3">
            {filtered.map(order => (
              <WarehouseConferencia
                key={order.id}
                order={order}
                onSaved={() => queryClient.invalidateQueries({ queryKey: ['warehouse-orders', revenda] })}
                readOnly={activeTab === 'done'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ value, active, setActive, count, children }) {
  const isActive = active === value;
  return (
    <button
      onClick={() => setActive(value)}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 -mb-px ${
        isActive ? 'border-primary text-primary bg-background' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      }`}
    >
      {children}
      <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
        {count}
      </span>
    </button>
  );
}
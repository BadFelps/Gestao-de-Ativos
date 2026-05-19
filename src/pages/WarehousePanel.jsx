import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RefreshCw, Search, PackageCheck, Clock, Truck, Calendar, LogOut, Package } from 'lucide-react';
import WarehouseLogin from '@/components/warehouse/WarehouseLogin';
import ConferenciaCard from '@/components/warehouse/ConferenciaCard';

function formatDate(dateStr) {
  if (!dateStr) return 'Sem data';
  try {
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  } catch { return dateStr; }
}

function groupByDriver(orders) {
  const groups = {};
  orders.forEach(o => {
    const driver = o.assigned_driver || 'Motorista não informado';
    const date = o.route_date || o.assigned_date || '';
    const key = `${date}||${driver}`;
    if (!groups[key]) groups[key] = { driver, date, orders: [] };
    groups[key].orders.push(o);
  });
  return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
}

export default function WarehousePanel() {
  const [session, setSession] = useState(() => {
    try {
      const s = sessionStorage.getItem('warehouse_session');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });

  const handleLogin = (operatorName) => {
    const s = { operatorName };
    sessionStorage.setItem('warehouse_session', JSON.stringify(s));
    setSession(s);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('warehouse_session');
    setSession(null);
  };

  if (!session) return <WarehouseLogin onLogin={handleLogin} />;

  return <WarehouseContent session={session} onLogout={handleLogout} />;
}

function WarehouseContent({ session, onLogout }) {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['warehouse-orders-v2'],
    queryFn: () => base44.entities.ServiceOrder.list('-route_date', 300),
    refetchInterval: 15000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['warehouse-orders-v2'] });

  // OS prontas para conferência (motorista finalizou)
  const pendentes = orders.filter(o =>
    ['Concluído', 'Concluído com Ocorrência'].includes(o.status) &&
    !['Conferido', 'Fechado', 'Excluído'].includes(o.status)
  );

  // OS já conferidas
  const conferidas = orders.filter(o => o.status === 'Conferido');

  const filtered = (list) => list.filter(o =>
    !search ||
    o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.os_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.assigned_driver?.toLowerCase().includes(search.toLowerCase())
  );

  const groupedPendentes = groupByDriver(filtered(pendentes));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🏭 Conferência — Armazém</h1>
          <p className="text-sm text-muted-foreground">Conferente: {session.operatorName}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onLogout} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
          <LogOut className="w-4 h-4" /> Sair
        </Button>
      </div>

      <div className="w-full max-w-2xl mx-auto px-3 py-4 space-y-4">
        {/* Busca + Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar OS, cliente ou motorista..."
              className="pl-10"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" onClick={refresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card rounded-xl border p-4 text-center">
            <Clock className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
            <div className="text-2xl font-bold">{pendentes.length}</div>
            <div className="text-xs text-muted-foreground">Aguardando Conferência</div>
          </div>
          <div className="bg-card rounded-xl border p-4 text-center">
            <PackageCheck className="w-5 h-5 mx-auto text-green-500 mb-1" />
            <div className="text-2xl font-bold">{conferidas.length}</div>
            <div className="text-xs text-muted-foreground">Conferidas Hoje</div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pendentes">
          <TabsList className="w-full">
            <TabsTrigger value="pendentes" className="flex-1 gap-2">
              <Clock className="w-4 h-4" /> Pendentes ({pendentes.length})
            </TabsTrigger>
            <TabsTrigger value="conferidas" className="flex-1 gap-2">
              <PackageCheck className="w-4 h-4" /> Conferidas ({conferidas.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="space-y-5 mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : groupedPendentes.length === 0 ? (
              <div className="bg-card rounded-2xl border p-12 text-center text-muted-foreground">
                <Package className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>Nenhuma OS aguardando conferência</p>
              </div>
            ) : (
              groupedPendentes.map(group => (
                <div key={`${group.date}||${group.driver}`} className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {group.date && (
                      <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5">
                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-sm font-bold text-purple-800">{formatDate(group.date)}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 flex-1">
                      <Truck className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-sm font-semibold text-slate-700">{group.driver}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{group.orders.length} OS</span>
                    </div>
                  </div>
                  <div className="space-y-3 pl-2 border-l-2 border-purple-200">
                    {group.orders.map(o => (
                      <ConferenciaCard key={o.id} order={o} operatorName={session.operatorName} onUpdated={refresh} />
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="conferidas" className="space-y-3 mt-4">
            {filtered(conferidas).length === 0 ? (
              <div className="bg-card rounded-2xl border p-12 text-center text-muted-foreground">
                <PackageCheck className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>Nenhuma OS conferida ainda</p>
              </div>
            ) : (
              filtered(conferidas).map(o => <ConferidaCard key={o.id} order={o} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function ConferidaCard({ order }) {
  const hasDivergence = order.warehouse_divergence;

  return (
    <div className={`bg-card rounded-xl border p-4 space-y-3 ${hasDivergence ? 'border-orange-300' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="font-mono text-xs font-bold text-primary">{order.os_number}</span>
          <h4 className="font-semibold text-sm">{order.client_name}</h4>
          {order.assigned_driver && (
            <p className="text-xs text-muted-foreground">🚛 {order.assigned_driver}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
            <PackageCheck className="w-3 h-3" /> Conferido
          </span>
          <p className="text-xs text-muted-foreground mt-1">{order.warehouse_checked_by}</p>
          {order.warehouse_check_date && (
            <p className="text-xs text-muted-foreground">
              {new Date(order.warehouse_check_date).toLocaleDateString('pt-BR')}
            </p>
          )}
        </div>
      </div>

      {/* Resumo conferência */}
      {order.warehouse_checklist?.length > 0 && (
        <div className="space-y-1">
          {order.warehouse_checklist.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded-lg px-3 py-1.5">
              <span className="font-medium">{item.asset_type}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">
                  {item.qty_mesas != null
                    ? `${item.qty_mesas || 0} mesas / ${item.qty_cadeiras || 0} cadeiras`
                    : `${item.quantity} un.`}
                </span>
                <span className={`font-semibold ${
                  item.condition === 'Bom' ? 'text-green-600'
                  : item.condition === 'Danificado' ? 'text-orange-600'
                  : 'text-red-600'
                }`}>{item.condition}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasDivergence && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-orange-800">⚠️ Divergência registrada</p>
          {order.warehouse_divergence_details && (
            <p className="text-xs text-orange-700 mt-0.5">{order.warehouse_divergence_details}</p>
          )}
        </div>
      )}
    </div>
  );
}
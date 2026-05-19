import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PanelAccessGate from '@/components/PanelAccessGate';
import PanelTop from '@/components/PanelTop';
import CommercialCard from '@/components/commercial/CommercialCard';
import OccurrencesTab from '@/components/commercial/OccurrencesTab';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle, RefreshCw, Kanban, AlertCircle, BookOpen, BarChart2 } from 'lucide-react';
import { useAccess } from '@/lib/accessContext';
import PanelManual from '@/components/PanelManual';
import CommercialDashboard from '@/components/commercial/CommercialDashboard';


// Colunas do Kanban — Aguardando, Atribuído, Conferido, Fechadas
const COLUMNS = [
  { key: 'Aguardando',  label: 'Aguardando', color: 'bg-yellow-400', headerBg: 'bg-yellow-50 border-yellow-200', textColor: 'text-yellow-800' },
  { key: 'Atribuído',   label: 'Atribuído',  color: 'bg-blue-400',   headerBg: 'bg-blue-50 border-blue-200',     textColor: 'text-blue-800'   },
  { key: 'Conferido',   label: 'Conferido',  color: 'bg-teal-400',   headerBg: 'bg-teal-50 border-teal-200',     textColor: 'text-teal-800'   },
  { key: 'Fechado',     label: 'Fechadas',   color: 'bg-slate-400',  headerBg: 'bg-slate-50 border-slate-200',   textColor: 'text-slate-700'  },
];

// Para "Atribuído" os cards mostram tag de Em Rota / No Cliente internamente
const IN_TRANSIT_STATUSES = ['Em Rota', 'No Cliente'];

export default function Commercial() {
  return (
    <PanelAccessGate panel="commercial">
      <CommercialContent />
    </PanelAccessGate>
  );
}

function CommercialContent() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('kanban'); // 'kanban' | 'occurrences' | 'dashboard' | 'manual'
  const queryClient = useQueryClient();

  const { getSession } = useAccess();
  const session = getSession('commercial');
  const revenda = session?.revenda || null;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['commercial-orders', revenda],
    queryFn: () => revenda
      ? base44.entities.ServiceOrder.filter({ revenda }, '-created_date', 200)
      : base44.entities.ServiceOrder.list('-created_date', 200),
    refetchInterval: 20000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['commercial-orders'] });

  const occurrenceOrders = orders.filter(o => o.status === 'Concluído com Ocorrência');
  const occurrenceCount = occurrenceOrders.length;

  const filteredOrders = orders.filter(o =>
    !search ||
    o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.os_number?.toLowerCase().includes(search.toLowerCase())
  );

  // Para o kanban, "Atribuído" agrupa também Em Rota e No Cliente
  const getColOrders = (key) => {
    if (key === 'Atribuído') {
      return filteredOrders.filter(o => o.status === 'Atribuído' || IN_TRANSIT_STATUSES.includes(o.status));
    }
    return filteredOrders.filter(o => o.status === key);
  };

  const warehouseAlertCount = orders.filter(o =>
    (o.warehouse_divergence || (o.warehouse_asset_condition && o.warehouse_asset_condition !== 'Bom')) && !o.warehouse_resolution
  ).length;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <PanelTop panel="commercial" title="Acompanhamento Comercial" />

      {/* Toolbar */}
      <div className="border-b bg-card px-4 py-2.5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar OS ou cliente..." className="pl-10 h-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </Button>

          {/* Abas */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 ml-auto">
            <button
              onClick={() => setActiveTab('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'kanban' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Kanban className="w-4 h-4" /> Kanban
            </button>
            <button
              onClick={() => setActiveTab('occurrences')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all relative ${activeTab === 'occurrences' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <AlertCircle className="w-4 h-4" /> Ocorrências
              {(occurrenceCount + warehouseAlertCount) > 0 && (
                <span className="ml-1 bg-orange-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {occurrenceCount + warehouseAlertCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'dashboard' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <BarChart2 className="w-4 h-4" /> Dashboard
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'manual' ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <BookOpen className="w-4 h-4" /> Manual
            </button>
          </div>
        </div>



      {isLoading ? (
        <div className="flex justify-center items-center flex-1 py-20">
          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ABA KANBAN */}
          {activeTab === 'kanban' && (
            <div className="flex flex-1 overflow-x-auto px-4 py-4 gap-3" style={{ minHeight: 0 }}>
                {COLUMNS.map(col => {
                  const colOrders = getColOrders(col.key);
                  const isEmpty = colOrders.length === 0;
                  return (
                    <div
                      key={col.key}
                      className="flex flex-col rounded-2xl border shadow-sm overflow-hidden transition-all duration-300"
                      style={isEmpty
                        ? { flexShrink: 0, width: '52px', minWidth: '52px' }
                        : { flex: '1 1 0', minWidth: '220px', maxWidth: '340px' }
                      }
                    >
                      {/* Header — rotacionado quando vazio */}
                      {isEmpty ? (
                        <div className={`flex flex-col items-center justify-start py-4 px-0 h-full gap-3 ${col.headerBg}`}>
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
                            {colOrders.map(o => (
                              <CommercialCard key={o.id} order={o} onUpdated={refresh} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          {/* ABA OCORRÊNCIAS */}
          {activeTab === 'occurrences' && (
            <OccurrencesTab orders={occurrenceOrders} onUpdated={refresh} search={search} />
          )}

          {/* ABA DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="max-w-5xl mx-auto">
                <CommercialDashboard orders={orders} />
              </div>
            </div>
          )}

          {/* ABA MANUAL */}
          {activeTab === 'manual' && (
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="max-w-3xl mx-auto">
                <PanelManual panel="commercial" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
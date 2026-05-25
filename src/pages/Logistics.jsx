import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAccess } from '@/lib/accessContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PanelAccessGate from '@/components/PanelAccessGate';
import PanelTop from '@/components/PanelTop';
import FunnelView from '@/components/logistics/FunnelView';
import KanbanAssignCard from '@/components/logistics/KanbanAssignCard';
import { StatusBadge, ActionBadge, PriorityBadge } from '@/components/StatusBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, ClipboardList, BarChart3, ChevronDown, ChevronUp, MapPin, Phone, Package, User, FileText, BookOpen, AlertCircle } from 'lucide-react';
import PanelManual from '@/components/PanelManual';
import RouteSummary from '@/components/logistics/RouteSummary';
import WarehouseAlertBanner from '@/components/WarehouseAlertBanner';
import LogisticsOccurrencesTab from '@/components/logistics/LogisticsOccurrencesTab';
import LogisticsDashboard from '@/components/logistics/LogisticsDashboard';
import { Button } from '@/components/ui/button';

function OrderRow({ o }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      <div className="p-3 flex items-center justify-between gap-3 flex-wrap cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs font-bold text-primary">{o.os_number}</span>
          <span className="font-medium text-sm">{o.client_name}</span>
          <StatusBadge status={o.status} />
          <ActionBadge action={o.action_type} />
          <PriorityBadge priority={o.priority} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {o.assigned_driver && `🚛 ${o.assigned_driver}`} {o.assigned_vehicle && `• ${o.assigned_vehicle}`}
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
        </div>
      </div>
      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          {o.client_address && (
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div><div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Endereço</div><div>{o.client_address}</div></div>
            </div>
          )}
          {o.client_phone && (
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div><div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Telefone</div><div>{o.client_phone}</div></div>
            </div>
          )}
          {o.asset_type && (
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div><div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Ativo</div><div>{o.asset_type}{o.asset_serial && ` • ${o.asset_serial}`}</div></div>
            </div>
          )}
          {o.assigned_driver && (
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <div><div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Motorista</div><div>{o.assigned_driver}{o.assigned_vehicle && ` — ${o.assigned_vehicle}`}</div></div>
            </div>
          )}
          {o.route_date && (
            <div><div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Data da Rota</div><div>{o.route_date}</div></div>
          )}
          {o.setor && (
            <div><div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Setor</div><div>{o.setor}</div></div>
          )}
          {o.driver_notes && (
            <div className="sm:col-span-2"><div className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Obs. Motorista</div><div>{o.driver_notes}</div></div>
          )}
          {o.occurrence_reason && (
            <div className="sm:col-span-2"><div className="text-xs text-orange-600 font-medium uppercase tracking-wide">⚠️ Ocorrência</div><div className="text-orange-700">{o.occurrence_reason}{o.occurrence_details && `: ${o.occurrence_details}`}</div></div>
          )}
          {o.photo_urls?.length > 0 && (
            <div className="sm:col-span-3">
              <div className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Fotos</div>
              <div className="flex gap-2 flex-wrap">
                {o.photo_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt={`Foto ${i+1}`} className="w-14 h-14 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Logistics() {
  return (
    <PanelAccessGate panel="logistics">
      <LogisticsContent />
    </PanelAccessGate>
  );
}

function LogisticsContent() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const queryClient = useQueryClient();
  const { getSession } = useAccess();
  const session = getSession('logistics');
  const revenda = session?.revenda || null;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['logistics-orders', revenda],
    queryFn: () => revenda
      ? base44.entities.ServiceOrder.filter({ revenda }, '-created_date', 200)
      : base44.entities.ServiceOrder.list('-created_date', 200),
    refetchInterval: 15000,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['logistics-orders', revenda] });

  // OS Aguardando normais (excluir "Não deu tempo" — vão para aba de ocorrências)
  const pending = orders.filter(o => o.status === 'Aguardando' && o.occurrence_reason !== 'Não deu tempo');
  const naoDeuTempo = orders.filter(o => o.status === 'Aguardando' && o.occurrence_reason === 'Não deu tempo');
  const occurrenceOrders = orders.filter(o =>
    (o.status === 'Concluído com Ocorrência' && ['Não deu tempo','Ativo não encontrado','Porta Fechada','Cliente Recusou','Endereço Incorreto','Sem Acesso','Responsável ausente','Outro'].includes(o.occurrence_reason)) ||
    (o.status === 'Aguardando' && o.occurrence_reason === 'Não deu tempo')
  );
  const occurrenceCount = occurrenceOrders.length;
  const filtered = orders.filter(o => {
    const matchSearch = !search || o.client_name?.toLowerCase().includes(search.toLowerCase()) || o.os_number?.toLowerCase().includes(search.toLowerCase()) || o.assigned_driver?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const statuses = ['all', ...new Set(orders.map(o => o.status))];

  return (
    <div className="min-h-screen bg-background">
      <PanelTop panel="logistics" title="Torre de Controle — Logística" />
      <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <WarehouseAlertBanner orders={orders} collapsible />
          <div className="flex items-center gap-3 flex-wrap">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 flex-1">
              <div className="bg-card rounded-xl border p-4 text-center">
                <div className="text-2xl font-extrabold text-foreground">{orders.filter(o => o.status !== 'Excluído').length}</div>
                <div className="text-xs text-muted-foreground mt-1">Total OS</div>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <div className="text-2xl font-extrabold text-yellow-600">{pending.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Aguardando</div>
              </div>
              <div className="bg-card rounded-xl border p-4 text-center">
                <div className="text-2xl font-extrabold text-green-600">{orders.filter(o => ['Concluído', 'Concluído com Ocorrência', 'Conferido', 'Fechado'].includes(o.status)).length}</div>
                <div className="text-xs text-muted-foreground mt-1">Concluídas</div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Atualizar
            </Button>
          </div>

          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="pending" className="gap-2 flex-1 sm:flex-none"><ClipboardList className="w-4 h-4" /><span className="hidden xs:inline">Atribuir</span> ({pending.length})</TabsTrigger>
              <TabsTrigger value="occurrences" className="gap-2 flex-1 sm:flex-none relative">
                <AlertCircle className="w-4 h-4" /><span className="hidden xs:inline">Ocorrências</span>
                {occurrenceCount > 0 && (
                  <span className="ml-1 bg-orange-500 text-white text-xs font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">{occurrenceCount}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="summary" className="gap-2 flex-1 sm:flex-none"><FileText className="w-4 h-4" /><span className="hidden xs:inline">Resumo da Rota</span></TabsTrigger>
              <TabsTrigger value="dashboard" className="gap-2 flex-1 sm:flex-none"><BarChart3 className="w-4 h-4" /><span className="hidden xs:inline">Dashboard</span></TabsTrigger>
              <TabsTrigger value="all" className="gap-2 flex-1 sm:flex-none"><ClipboardList className="w-4 h-4" /><span className="hidden xs:inline">Visão Geral</span></TabsTrigger>
              <TabsTrigger value="manual" className="gap-2 flex-1 sm:flex-none"><BookOpen className="w-4 h-4" /><span className="hidden xs:inline">Manual</span></TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
              ) : pending.length === 0 ? (
                <div className="bg-card rounded-2xl border p-12 text-center text-muted-foreground">Nenhuma OS aguardando atribuição</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pending.map(o => <KanbanAssignCard key={o.id} order={o} onUpdated={refresh} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="occurrences">
              <LogisticsOccurrencesTab orders={orders} onUpdated={refresh} />
            </TabsContent>

            <TabsContent value="summary">
              <RouteSummary orders={orders} />
            </TabsContent>

            <TabsContent value="dashboard">
              <LogisticsDashboard orders={orders} />
            </TabsContent>

            <TabsContent value="manual">
              <PanelManual panel="logistics" />
            </TabsContent>

            <TabsContent value="all" className="space-y-4">
              <FunnelView orders={orders} />
              <div className="flex gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="flex gap-1 flex-wrap w-full sm:w-auto">
                  {statuses.map(s => (
                    <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(s)} className="text-xs">
                      {s === 'all' ? 'Todos' : s}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {filtered.map(o => <OrderRow key={o.id} o={o} />)}
              </div>
            </TabsContent>
          </Tabs>
          </div>
          </div>
  );
}
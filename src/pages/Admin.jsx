import { useState } from 'react';
import { useAccess } from '@/lib/accessContext';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PanelAccessGate from '@/components/PanelAccessGate';
import PanelTop from '@/components/PanelTop';
import CreateOrderForm from '@/components/admin/CreateOrderForm';
import AdminKanban from '@/components/admin/AdminKanban';
import { Input } from '@/components/ui/input';
import { ClipboardList, Plus, Search, BarChart2, Package, ChevronDown, ChevronUp, AlertTriangle, BookOpen, Trash2, FileArchive, Lock, DatabaseZap } from 'lucide-react';
import ClearDatabaseModal from '@/components/admin/ClearDatabaseModal';
import PanelManual from '@/components/PanelManual';
import OccurrencesList from '@/components/admin/OccurrencesList';
import AdminDashboard from '@/components/admin/AdminDashboard';
import AssetTypesManager from '@/components/admin/AssetTypesManager';
import DeletedOrders from '@/components/admin/DeletedOrders';
import OSBackupReport from '@/components/admin/OSBackupReport';
import ClosedOrders from '@/components/admin/ClosedOrders';

export default function Admin() {
  return (
    <PanelAccessGate panel="admin">
      <AdminContent />
    </PanelAccessGate>
  );
}

function AdminContent() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('list');
  const [occurrencesOpen, setOccurrencesOpen] = useState(false);
  const [createOccurrencesOpen, setCreateOccurrencesOpen] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const queryClient = useQueryClient();
  const { getSession } = useAccess();
  const session = getSession('admin');
  const revenda = session?.revenda || null;

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-orders', revenda],
    queryFn: () => revenda
      ? base44.entities.ServiceOrder.filter({ revenda }, '-created_date', 500)
      : base44.entities.ServiceOrder.list('-created_date', 500),
    refetchInterval: 15000,
  });

  const filtered = orders.filter(o =>
    !search || o.client_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.os_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.asset_serial?.toLowerCase().includes(search.toLowerCase())
  );

  const isListTab = activeTab === 'list';

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <PanelTop panel="admin" title="Painel Administrativo" />

      {/* Área de abas — sticky, fora do scroll */}
      <div className="border-b bg-card px-3 sm:px-6 pt-3 pb-0 shrink-0">
          <div className={isListTab ? '' : 'max-w-7xl mx-auto'}>
            <div className="flex flex-wrap gap-1 w-full sm:w-auto">
              <TabsTriggerBtn value="list" active={activeTab} setActive={setActiveTab}><ClipboardList className="w-4 h-4" /> Todas as Recolhas</TabsTriggerBtn>
              <TabsTriggerBtn value="create" active={activeTab} setActive={setActiveTab}><Plus className="w-4 h-4" /> Nova OS</TabsTriggerBtn>
              <TabsTriggerBtn value="dashboard" active={activeTab} setActive={setActiveTab}><BarChart2 className="w-4 h-4" /> Dashboard</TabsTriggerBtn>
              <TabsTriggerBtn value="asset-types" active={activeTab} setActive={setActiveTab}><Package className="w-4 h-4" /> Tipos de Ativo</TabsTriggerBtn>
              <TabsTriggerBtn value="deleted" active={activeTab} setActive={setActiveTab}><Trash2 className="w-4 h-4" /> Excluídos</TabsTriggerBtn>
              <TabsTriggerBtn value="closed" active={activeTab} setActive={setActiveTab}><Lock className="w-4 h-4" /> Fechadas</TabsTriggerBtn>
              <TabsTriggerBtn value="backup" active={activeTab} setActive={setActiveTab}><FileArchive className="w-4 h-4" /> Backup OS</TabsTriggerBtn>
              <TabsTriggerBtn value="manual" active={activeTab} setActive={setActiveTab}><BookOpen className="w-4 h-4" /> Manual</TabsTriggerBtn>
              <button
                onClick={() => setShowClearModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium border-b-2 border-transparent text-red-500 hover:text-red-700 hover:bg-red-50 transition-all"
              >
                <DatabaseZap className="w-4 h-4" /> Limpar Base
              </button>
            </div>
          </div>
        </div>

      {/* Conteúdo — ocupa o resto da tela */}
      <div className={`flex-1 overflow-hidden flex flex-col ${isListTab ? '' : 'overflow-y-auto'}`}>

          {/* ABA: NOVA OS */}
          {activeTab === 'create' && (
            <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 overflow-y-auto flex-1 space-y-4">
              <CreateOrderForm onCreated={() => queryClient.invalidateQueries({ queryKey: ['admin-orders', revenda] })} />
            </div>
          )}

          {/* ABA: TODAS AS OS — full width Kanban */}
          {activeTab === 'list' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Barra de busca */}
              <div className="px-4 py-2 border-b bg-card shrink-0 flex items-center gap-2">
                <div className="relative w-full sm:max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Buscar por cliente, OS ou patrimônio..." className="pl-10 h-9" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <CollapsibleOccurrences
                  orders={orders}
                  open={occurrencesOpen}
                  setOpen={setOccurrencesOpen}
                  onUpdated={() => queryClient.invalidateQueries({ queryKey: ['admin-orders', revenda] })}
                />
              </div>
              {/* Kanban com scroll horizontal */}
              {isLoading ? (
                <div className="flex justify-center items-center flex-1">
                  <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : (
                <div className="flex-1 overflow-hidden px-4 py-4">
                  <AdminKanban orders={filtered} onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-orders', revenda] })} />
                </div>
              )}
            </div>
          )}

          {/* ABA: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 overflow-y-auto flex-1">
              <AdminDashboard orders={orders} />
            </div>
          )}

          {/* ABA: TIPOS DE ATIVO */}
          {activeTab === 'asset-types' && (
            <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-6 overflow-y-auto flex-1">
              <AssetTypesManager />
            </div>
          )}

          {/* ABA: EXCLUÍDOS */}
          {activeTab === 'deleted' && (
            <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-6 overflow-y-auto flex-1">
              <DeletedOrders orders={orders} />
            </div>
          )}

          {/* ABA: FECHADAS */}
          {activeTab === 'closed' && (
            <div className="max-w-4xl mx-auto w-full px-3 sm:px-6 py-6 overflow-y-auto flex-1">
              <ClosedOrders orders={orders} onSaved={() => queryClient.invalidateQueries({ queryKey: ['admin-orders', revenda] })} />
            </div>
          )}

          {/* ABA: BACKUP OS */}
          {activeTab === 'backup' && (
            <div className="max-w-3xl mx-auto w-full px-3 sm:px-6 py-6 overflow-y-auto flex-1">
              <OSBackupReport orders={orders} />
            </div>
          )}

          {showClearModal && (
            <ClearDatabaseModal
              onCleared={() => queryClient.invalidateQueries({ queryKey: ['admin-orders', revenda] })}
              onClose={() => setShowClearModal(false)}
            />
          )}

          {/* ABA: MANUAL */}
          {activeTab === 'manual' && (
            <div className="max-w-3xl mx-auto w-full px-3 sm:px-6 py-6 overflow-y-auto flex-1">
              <PanelManual panel="admin" />
            </div>
          )}
          </div>
          </div>
          );
          }

// Ocorrências colapsável — versão compacta para barra de busca
function CollapsibleOccurrences({ orders, open, setOpen, onUpdated }) {
  const pendingCount = orders.filter(o =>
    o.status === 'Concluído com Ocorrência' || o.has_pending_assets
  ).length;

  if (pendingCount === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-orange-50 border border-orange-300 text-orange-800 text-sm font-semibold hover:bg-orange-100 transition-colors shrink-0"
      >
        <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
        Ocorrências ({pendingCount})
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-20 mt-1 w-[min(600px,90vw)] bg-white rounded-xl border border-orange-200 shadow-xl p-4 max-h-[70vh] overflow-y-auto">
          <OccurrencesList orders={orders} onUpdated={onUpdated} />
        </div>
      )}
    </div>
  );
}

// Botão de aba customizado (sem usar Tabs primitivo para ter controle total do layout)
function TabsTriggerBtn({ value, active, setActive, children }) {
  const isActive = active === value;
  return (
    <button
      onClick={() => setActive(value)}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-all border-b-2 -mb-px ${
        isActive
          ? 'border-primary text-primary bg-background'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
      }`}
    >
      {children}
    </button>
  );
}
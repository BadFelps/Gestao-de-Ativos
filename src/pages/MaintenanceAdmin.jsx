import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useAccess } from '@/lib/accessContext';
import { ArrowLeft, Wrench, Search, Package, Trash2, Loader2, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import TriageModal from '@/components/maintenance/TriageModal';
import MaintenancePartsManager from '@/components/maintenance/MaintenancePartsManager';
import ExecutionDetailsModal from '@/components/maintenance/ExecutionDetailsModal';
import MaintenanceDashboard from '@/components/maintenance/MaintenanceDashboard';


const statusConfig = {
  pendente_triagem:      { label: 'Aguardando Triagem',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  em_orcamento:          { label: 'Em Orçamento',          color: 'bg-blue-100 text-blue-800 border-blue-200' },
  aguardando_aprovacao:  { label: 'Aguard. Aprovação',     color: 'bg-orange-100 text-orange-800 border-orange-200' },
  aprovado_execucao:     { label: 'Aprovado p/ Execução',  color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  em_execucao:           { label: 'Em Execução',           color: 'bg-purple-100 text-purple-800 border-purple-200' },
  concluido:             { label: 'Concluído',             color: 'bg-green-100 text-green-800 border-green-200' },
  cancelado:             { label: 'Cancelado',             color: 'bg-red-100 text-red-700 border-red-200' },
};

export default function MaintenanceAdmin() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [triageItem, setTriageItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'parts' | 'dashboard'
  const { getSession } = useAccess();
  const session = getSession('maintenance_admin');
  const userFullName = session?.operatorName || '';


  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      // Exclui a pasta no OneDrive (não bloqueia caso falhe)
      const subfolder = deleteItem.request_number || deleteItem.id;
      base44.functions.invoke('deleteOneDriveFolder', { subfolder }).catch(() => {});
    } catch {}
    await base44.entities.MaintenanceRequest.delete(deleteItem.id);
    setDeleteItem(null);
    setDeleting(false);
    fetchRequests();
  };

  const fetchRequests = async () => {
    setLoading(true);
    const data = await base44.entities.MaintenanceRequest.list('-created_date', 200);
    setRequests(data);
    setLoading(false);
  };

  const filtered = requests.filter(r => {
    const q = search.toLowerCase();
    return !q || r.pdv_code?.toLowerCase().includes(q) || r.razao_social?.toLowerCase().includes(q) || r.fantasia?.toLowerCase().includes(q) || r.asset_tag?.toLowerCase().includes(q);
  });



  const pending = filtered.filter(r => r.status === 'pendente_triagem');
  const active = filtered.filter(r => !['pendente_triagem', 'concluido', 'cancelado'].includes(r.status));
  const done = filtered.filter(r => ['concluido', 'cancelado'].includes(r.status));

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/Maintenance">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Manutenção de Ativos</h1>
              <p className="text-xs text-muted-foreground">Painel Administrativo · {userFullName}</p>
            </div>
          </div>

        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all flex items-center gap-2 ${
              activeTab === 'requests' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wrench className="w-4 h-4" /> Solicitações
          </button>
          <button
            onClick={() => setActiveTab('parts')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all flex items-center gap-2 ${
              activeTab === 'parts' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="w-4 h-4" /> Base de Orçamento
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all flex items-center gap-2 ${
              activeTab === 'dashboard' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <BarChart2 className="w-4 h-4" /> Dashboard
          </button>
        </div>

        {activeTab === 'parts' && <MaintenancePartsManager />}

        {activeTab === 'dashboard' && <MaintenanceDashboard requests={requests} />}

        {activeTab === 'requests' && <>
        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Triagem Pendente', value: requests.filter(r => r.status === 'pendente_triagem').length, color: 'text-yellow-600' },
            { label: 'Em Andamento', value: requests.filter(r => ['em_orcamento','aguardando_aprovacao','aprovado_execucao','em_execucao'].includes(r.status)).length, color: 'text-blue-600' },
            { label: 'Concluídos', value: requests.filter(r => r.status === 'concluido').length, color: 'text-green-600' },
          ].map(s => (
            <Card key={s.label} className="border">
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por PDV, razão social, plaqueta..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : (
          <div className="space-y-5">
            {/* Triagem pendente */}
            {pending.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-yellow-700 mb-2">⚠️ Aguardando Triagem ({pending.length})</h2>
                <div className="space-y-2">
                  {pending.map(req => (
                    <RequestCard key={req.id} req={req} onAction={() => setTriageItem(req)} actionLabel="Fazer Triagem" actionClass="bg-amber-600 hover:bg-amber-700 text-white" onDelete={() => setDeleteItem(req)} />
                  ))}
                </div>
              </section>
            )}

            {/* Em andamento */}
            {active.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">Em Andamento ({active.length})</h2>
                <div className="space-y-2">
                  {active.map(req => <RequestCard key={req.id} req={req} onDelete={() => setDeleteItem(req)} />)}
                </div>
              </section>
            )}

            {/* Finalizados */}
            {done.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Histórico ({done.length})</h2>
                <div className="space-y-2">
                  {done.map(req => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      onDetails={req.status === 'concluido' ? () => setDetailItem(req) : undefined}
                      onDelete={() => setDeleteItem(req)}
                    />
                  ))}
                </div>
              </section>
            )}

            {filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>Nenhuma solicitação encontrada.</p>
              </div>
            )}
          </div>
        )}
        </>}
      </div>

      {triageItem && (
        <TriageModal
          request={triageItem}
          operatorName={userFullName}
          onClose={() => setTriageItem(null)}
          onDone={() => { setTriageItem(null); fetchRequests(); }}
        />
      )}
      {detailItem && (
        <ExecutionDetailsModal
          request={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}

      {/* Modal de confirmação de exclusão */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl border shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-base">Excluir Solicitação</h2>
                <p className="text-xs text-muted-foreground">Esta ação é permanente e irreversível</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm">
              <p className="font-medium text-red-800">{deleteItem.fantasia || deleteItem.razao_social}</p>
              <p className="text-xs text-red-600 mt-0.5">PDV: {deleteItem.pdv_code} · {deleteItem.problem_description}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Todos os dados desta solicitação serão excluídos permanentemente, incluindo fotos, orçamento e registros de execução.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteItem(null)} disabled={deleting}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleDelete} disabled={deleting}>
                {deleting ? <><Loader2 className="w-4 h-4 animate-spin" /> Excluindo...</> : <><Trash2 className="w-4 h-4" /> Excluir</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestCard({ req, onAction, actionLabel, actionClass, onDetails, onDelete }) {
  const st = statusConfig[req.status] || statusConfig.pendente_triagem;
  return (
    <Card className="border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{req.fantasia || req.razao_social}</p>
            <p className="text-xs text-muted-foreground">PDV: {req.pdv_code} · Plaqueta: {req.asset_tag || '—'}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{req.problem_description}</p>
            {req.technician_name && <p className="text-xs text-blue-600 mt-0.5">Técnico: {req.technician_name}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <Badge className={`text-xs border ${st.color}`}>{st.label}</Badge>
              <button onClick={onDelete} className="p-1 rounded-md hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors" title="Excluir solicitação">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {onAction && (
              <Button size="sm" className={`text-xs ${actionClass}`} onClick={onAction}>{actionLabel}</Button>
            )}
            {onDetails && (
              <button onClick={onDetails} className="text-xs text-blue-600 hover:underline">
                Ver detalhes
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useAccess } from '@/lib/accessContext';
import { Plus, CheckCircle2, XCircle, Wrench, DollarSign, ArrowLeft, ChevronDown, ChevronUp, Package, Eye, RotateCcw, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import NewMaintenanceForm from '@/components/maintenance/NewMaintenanceForm';
import QuoteDecisionModal from '@/components/maintenance/QuoteDecisionModal';
import ExecutionDetailsModal from '@/components/maintenance/ExecutionDetailsModal';
import ReopenRequestModal from '@/components/maintenance/ReopenRequestModal';
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

export default function MaintenanceCommercial() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [quoteItem, setQuoteItem] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [expandedQuote, setExpandedQuote] = useState(null);
  const [reopenItem, setReopenItem] = useState(null);
  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'dashboard'
  const { getSession } = useAccess();
  const session = getSession('maintenance_commercial');
  const userFullName = session?.operatorName || '';


  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const data = await base44.entities.MaintenanceRequest.list('-created_date', 100);
    setRequests(data);
    setLoading(false);
  };

  const handleCreated = () => { setShowForm(false); fetchRequests(); };



  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/Maintenance">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Manutenção de Ativos</h1>
              <p className="text-xs text-muted-foreground">Painel Comercial · {userFullName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="gap-2" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4" /> Nova Solicitação
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all flex items-center gap-2 ${activeTab === 'requests' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <Wrench className="w-4 h-4" /> Solicitações
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            <BarChart2 className="w-4 h-4" /> Dashboard
          </button>
        </div>

        {activeTab === 'dashboard' && <MaintenanceDashboard requests={requests} />}

        {activeTab === 'requests' && showForm && (
          <NewMaintenanceForm
            operatorName={userFullName}
            onCreated={handleCreated}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Lista — só mostra quando na aba requests */}
        {activeTab === 'requests' && loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
          </div>
        ) : activeTab === 'requests' && requests.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Nenhuma solicitação encontrada.</p>
          </div>
        ) : activeTab === 'requests' ? (
          <div className="space-y-3">
            {requests.map(req => {
              const st = statusConfig[req.status] || statusConfig.pendente_triagem;
              const needsDecision = req.status === 'aguardando_aprovacao';
              const isConcluded = req.status === 'concluido';
              const isCancelled = req.status === 'cancelado';
              const items = req.quote_items || [];
              const isExpanded = expandedQuote === req.id;
              return (
                <Card key={req.id} className={`border ${needsDecision ? 'border-orange-300 shadow-orange-100 shadow-md' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{req.fantasia || req.razao_social}</p>
                        <p className="text-xs text-muted-foreground">PDV: {req.pdv_code} · Plaqueta: {req.asset_tag || '—'}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{req.problem_description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <Badge className={`text-xs border ${st.color} shrink-0`}>{st.label}</Badge>
                        {isConcluded && (
                          <button onClick={() => setDetailItem(req)} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                            <Eye className="w-3 h-3" /> Ver detalhes
                          </button>
                        )}
                        {isCancelled && (
                          <button onClick={() => setReopenItem(req)} className="flex items-center gap-1 text-xs text-orange-600 hover:underline">
                            <RotateCcw className="w-3 h-3" /> Reabrir
                          </button>
                        )}
                      </div>
                    </div>
                    {req.quote_value && req.status === 'aguardando_aprovacao' && (
                      <div className="mt-3 p-3 rounded-lg bg-orange-50 border border-orange-200 space-y-2">
                        <div className="flex items-center justify-between text-orange-800">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            <span className="font-bold text-sm">Orçamento: R$ {Number(req.quote_value).toFixed(2).replace('.', ',')}</span>
                          </div>
                          {items.length > 0 && (
                            <button onClick={() => setExpandedQuote(isExpanded ? null : req.id)} className="flex items-center gap-1 text-xs text-orange-700 hover:text-orange-900">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              {isExpanded ? 'Ocultar' : 'Detalhes'}
                            </button>
                          )}
                        </div>
                        {req.quote_description && <p className="text-xs text-orange-700">{req.quote_description}</p>}
                        {isExpanded && items.length > 0 && (
                          <div className="border border-orange-200 rounded-lg overflow-hidden">
                            {items.map((item, i) => (
                              <div key={i} className={`flex items-center justify-between gap-2 px-2.5 py-1.5 text-xs ${i % 2 === 0 ? 'bg-orange-50/50' : 'bg-white'}`}>
                                <div className="flex items-center gap-1.5 text-orange-800">
                                  <Package className="w-3 h-3 shrink-0" />
                                  <span>{item.name} <span className="text-orange-600">x{item.quantity}</span></span>
                                </div>
                                <span className="font-medium text-orange-800">R$ {Number(item.total || item.unit_price * item.quantity).toFixed(2).replace('.', ',')}</span>
                              </div>
                            ))}
                            <div className="flex justify-between px-2.5 py-2 bg-orange-100 border-t border-orange-200 font-bold text-xs text-orange-800">
                              <span>Total</span>
                              <span>R$ {Number(req.quote_value).toFixed(2).replace('.', ',')}</span>
                            </div>
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1"
                            onClick={() => setQuoteItem({ req, decision: 'aprovado' })}>
                            <CheckCircle2 className="w-3 h-3" /> Aprovar
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 gap-1"
                            onClick={() => setQuoteItem({ req, decision: 'cancelado' })}>
                            <XCircle className="w-3 h-3" /> Recusar
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>

      {quoteItem && (
       <QuoteDecisionModal
         request={quoteItem.req}
         initialDecision={quoteItem.decision}
         operatorName={userFullName}
         onClose={() => setQuoteItem(null)}
         onDone={() => { setQuoteItem(null); fetchRequests(); }}
       />
      )}
      {detailItem && (
        <ExecutionDetailsModal
          request={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}
      {reopenItem && (
       <ReopenRequestModal
         request={reopenItem}
         operatorName={userFullName}
         onClose={() => setReopenItem(null)}
         onDone={() => { setReopenItem(null); fetchRequests(); }}
       />
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useAccess } from '@/lib/accessContext';
import { ArrowLeft, Wrench, DollarSign, PlayCircle, CheckCircle2, Eye, ZoomIn, ImageOff, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import QuoteForm from '@/components/maintenance/QuoteForm';
import ExecutionLogger from '@/components/maintenance/ExecutionLogger';
import ExecutionDetailsModal from '@/components/maintenance/ExecutionDetailsModal';
import PhotoLightbox from '@/components/maintenance/PhotoLightbox';


const statusConfig = {
  em_orcamento:         { label: 'Aguardando Orçamento', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  aguardando_aprovacao: { label: 'Aguard. Aprovação',    color: 'bg-orange-100 text-orange-800 border-orange-200' },
  aprovado_execucao:    { label: 'Aprovado p/ Execução', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  em_execucao:          { label: 'Em Execução',          color: 'bg-purple-100 text-purple-800 border-purple-200' },
  concluido:            { label: 'Concluído',            color: 'bg-green-100 text-green-800 border-green-200' },
};

function isOneDriveUrl(url) {
  if (!url) return false;
  return url.includes('sharepoint.com') || url.includes('1drv.ms') || url.includes('onedrive.live.com');
}

export default function MaintenanceTechnician() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRequest, setActiveRequest] = useState(null);
  const [mode, setMode] = useState(null); // 'quote' | 'execute'
  const [detailItem, setDetailItem] = useState(null);
  const [lightboxReq, setLightboxReq] = useState(null);
  const { getSession } = useAccess();
  const session = getSession('maintenance_technician');
  const userFullName = session?.operatorName || '';


  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    const data = await base44.entities.MaintenanceRequest.filter({
      status: ['em_orcamento', 'aguardando_aprovacao', 'aprovado_execucao', 'em_execucao', 'concluido']
    }, '-created_date', 100);
    setRequests(data);
    setLoading(false);
  };

  const handleAction = (req, m) => { setActiveRequest(req); setMode(m); };
  const handleDone = () => { setActiveRequest(null); setMode(null); fetchRequests(); };

  if (activeRequest && mode === 'quote') {
    return <QuoteForm request={activeRequest} technicianName={userFullName} onDone={handleDone} onCancel={() => { setActiveRequest(null); setMode(null); }} />;
  }

  if (activeRequest && mode === 'execute') {
    return <ExecutionLogger request={activeRequest} technicianName={userFullName} onDone={handleDone} onCancel={() => { setActiveRequest(null); setMode(null); }} />;
  }

  const myQueue = requests.filter(r => ['em_orcamento', 'aprovado_execucao', 'em_execucao'].includes(r.status));
  const done = requests.filter(r => r.status === 'concluido');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/Maintenance">
              <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Manutenção de Ativos</h1>
              <p className="text-xs text-muted-foreground">Painel Técnico · {userFullName}</p>
            </div>
          </div>

        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : (
          <div className="space-y-5">
            {myQueue.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">Minhas Tarefas ({myQueue.length})</h2>
                <div className="space-y-3">
                  {myQueue.map(req => {
                    const st = statusConfig[req.status];
                    const canQuote = req.status === 'em_orcamento';
                    const canExecute = req.status === 'aprovado_execucao' || req.status === 'em_execucao';
                    return (
                      <Card key={req.id} className="border">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm">{req.fantasia || req.razao_social}</p>
                              <p className="text-xs text-muted-foreground">PDV: {req.pdv_code} · Plaqueta: {req.asset_tag || '—'}</p>
                              {req.address && <p className="text-xs text-muted-foreground mt-0.5">📍 {req.address}</p>}
                              {req.contact && <p className="text-xs text-muted-foreground">📞 {req.contact}</p>}
                            </div>
                            {st && <Badge className={`text-xs border ${st.color} shrink-0`}>{st.label}</Badge>}
                          </div>
                          <div className="p-2 rounded-lg bg-muted text-xs text-muted-foreground">
                            <b>Problema:</b> {req.problem_description}
                          </div>
                          {req.admin_notes && (
                            <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                              <b>📋 Obs. Administrativo:</b> {req.admin_notes}
                            </div>
                          )}
                          {req.commercial_notes && (
                            <div className={`p-2 rounded-lg text-xs border ${req.commercial_decision === 'aprovado' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                              <b>💬 Obs. Comercial{req.commercial_decision === 'aprovado' ? ' (Aprovado)' : ' (Recusado)'}:</b> {req.commercial_notes}
                            </div>
                          )}
                          {req.initial_photo_url && (
                            isOneDriveUrl(req.initial_photo_url) ? (
                              <a
                                href={req.initial_photo_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 w-full rounded-lg border bg-muted/50 hover:bg-muted px-3 py-2.5 transition-colors"
                                onClick={e => e.stopPropagation()}
                              >
                                <ImageOff className="w-4 h-4 text-muted-foreground shrink-0" />
                                <span className="text-xs text-blue-600 underline truncate flex-1">Ver foto no OneDrive</span>
                                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setLightboxReq(req)}
                                className="relative group w-full rounded-lg overflow-hidden border focus:outline-none"
                              >
                                <img src={req.initial_photo_url} className="w-full h-32 object-cover" alt="Foto do equipamento" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                  <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1">
                                  Toque para ampliar
                                </p>
                              </button>
                            )
                          )}
                          {canQuote && (
                            <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleAction(req, 'quote')}>
                              <DollarSign className="w-4 h-4" /> Registrar Orçamento
                            </Button>
                          )}
                          {canExecute && (
                            <Button className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white" onClick={() => handleAction(req, 'execute')}>
                              <PlayCircle className="w-4 h-4" />
                              {req.status === 'em_execucao' ? 'Continuar Execução' : 'Iniciar Execução'}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {myQueue.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma tarefa pendente.</p>
              </div>
            )}

            {done.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Concluídos ({done.length})</h2>
                <div className="space-y-2">
                  {done.slice(0, 10).map(req => (
                    <Card key={req.id} className="border">
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{req.fantasia || req.razao_social}</p>
                          <p className="text-xs text-muted-foreground">PDV: {req.pdv_code}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className="text-xs border bg-green-100 text-green-800 border-green-200">Concluído</Badge>
                          <button onClick={() => setDetailItem(req)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
      {detailItem && (
        <ExecutionDetailsModal
          request={detailItem}
          onClose={() => setDetailItem(null)}
          hideReport
        />
      )}
      {lightboxReq && (
        <PhotoLightbox
          photos={[{ step_title: 'Foto do equipamento', photo_url: lightboxReq.initial_photo_url }]}
          initialIndex={0}
          onClose={() => setLightboxReq(null)}
        />
      )}
    </div>
  );
}
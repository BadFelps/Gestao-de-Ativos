import { X, CheckCircle2, DollarSign, Wrench, MapPin, Phone, Package, FileText, ZoomIn, ExternalLink, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MaintenanceReportGenerator from './MaintenanceReportGenerator';
import PhotoLightbox from './PhotoLightbox';
import { useState } from 'react';

const statusConfig = {
  pendente_triagem:     { label: 'Aguardando Triagem',   color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  em_orcamento:         { label: 'Em Orçamento',         color: 'bg-blue-100 text-blue-800 border-blue-200' },
  aguardando_aprovacao: { label: 'Aguard. Aprovação',    color: 'bg-orange-100 text-orange-800 border-orange-200' },
  aprovado_execucao:    { label: 'Aprovado p/ Execução', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
  em_execucao:          { label: 'Em Execução',          color: 'bg-purple-100 text-purple-800 border-purple-200' },
  concluido:            { label: 'Concluído',            color: 'bg-green-100 text-green-800 border-green-200' },
  cancelado:            { label: 'Cancelado',            color: 'bg-red-100 text-red-700 border-red-200' },
};

function isOneDriveUrl(url) {
  if (!url) return false;
  return url.includes('sharepoint.com') || url.includes('1drv.ms') || url.includes('onedrive.live.com');
}

function PhotoThumb({ url, title, onClick }) {
  const [err, setErr] = useState(false);
  const oneDrive = isOneDriveUrl(url);
  if (oneDrive || err) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex flex-col items-center justify-center gap-1.5 w-full h-28 rounded-lg border bg-muted/50 hover:bg-muted text-center transition-colors"
        onClick={e => e.stopPropagation()}
      >
        <ImageOff className="w-5 h-5 text-muted-foreground" />
        <span className="text-xs text-blue-600 underline px-2 truncate max-w-full">{title || 'Ver foto'}</span>
        <ExternalLink className="w-3 h-3 text-muted-foreground" />
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className="relative group w-full rounded-lg overflow-hidden border focus:outline-none">
      <img src={url} className="w-full h-28 object-cover" alt={title} onError={() => setErr(true)} />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {title && <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1 truncate px-1">{title}</p>}
    </button>
  );
}

export default function ExecutionDetailsModal({ request, onClose, hideReport }) {
  const [showReport, setShowReport] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { photos: [], index: 0 }
  const st = statusConfig[request.status] || statusConfig.pendente_triagem;
  const logs = request.execution_logs || [];
  const items = request.quote_items || [];

  const openLightbox = (photos, index) => setLightbox({ photos, index });

  if (showReport) {
    return <MaintenanceReportGenerator request={request} onClose={() => setShowReport(false)} />;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl border shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b px-5 py-4 flex items-start justify-between gap-3 rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-base truncate">{request.fantasia || request.razao_social}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={`text-xs border ${st.color}`}>{st.label}</Badge>
              <span className="text-xs text-muted-foreground">PDV: {request.pdv_code}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Dados do cliente */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados do Cliente</h3>
            <div className="p-3 rounded-lg bg-muted space-y-1 text-sm">
              <p className="font-medium">{request.razao_social}</p>
              {request.fantasia && <p className="text-xs text-muted-foreground">{request.fantasia}</p>}
              {request.address && <p className="text-xs flex items-center gap-1"><MapPin className="w-3 h-3" />{request.address}</p>}
              {request.contact && <p className="text-xs flex items-center gap-1"><Phone className="w-3 h-3" />{request.contact}</p>}
              {request.asset_tag && <p className="text-xs">🏷️ Plaqueta: <b>{request.asset_tag}</b></p>}
              {request.equipment_description && <p className="text-xs text-blue-700">🧊 {request.equipment_description}</p>}
            </div>
          </section>

          {/* Problema */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Problema Reportado</h3>
            <p className="text-sm bg-muted p-3 rounded-lg">{request.problem_description}</p>
            {request.initial_photo_url && (
              <PhotoThumb
                url={request.initial_photo_url}
                title="Foto inicial"
                onClick={() => openLightbox([{ photo_url: request.initial_photo_url, step_title: 'Foto inicial' }], 0)}
              />
            )}
          </section>

          {/* Datas */}
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datas</h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {request.created_date && (
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-muted-foreground">Solicitado em</p>
                  <p className="font-medium">{new Date(request.created_date).toLocaleDateString('pt-BR')}</p>
                </div>
              )}
              {request.admin_action_date && (
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-muted-foreground">Triagem em</p>
                  <p className="font-medium">{new Date(request.admin_action_date).toLocaleDateString('pt-BR')}</p>
                </div>
              )}
              {request.quote_date && (
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-muted-foreground">Orçamento em</p>
                  <p className="font-medium">{new Date(request.quote_date).toLocaleDateString('pt-BR')}</p>
                </div>
              )}
              {request.completion_date && (
                <div className="p-2 rounded-lg bg-muted">
                  <p className="text-muted-foreground">Concluído em</p>
                  <p className="font-medium">{new Date(request.completion_date).toLocaleDateString('pt-BR')}</p>
                </div>
              )}
            </div>
          </section>

          {/* Orçamento */}
          {(request.quote_value || items.length > 0) && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Orçamento
              </h3>
              {request.quote_description && (
                <p className="text-sm bg-muted p-3 rounded-lg">{request.quote_description}</p>
              )}
              {items.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  {items.map((item, i) => (
                    <div key={i} className={`flex items-center justify-between gap-2 px-3 py-2 text-xs ${i % 2 === 0 ? 'bg-background' : 'bg-muted/40'}`}>
                      <div className="flex items-center gap-2">
                        <Package className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span>{item.name} <span className="text-muted-foreground">x{item.quantity}</span></span>
                      </div>
                      <span className="font-medium text-green-700">R$ {Number(item.total || item.unit_price * item.quantity).toFixed(2).replace('.', ',')}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-green-50 border-t border-green-200">
                    <span className="text-xs font-bold text-green-800">Total</span>
                    <span className="text-sm font-bold text-green-700">R$ {Number(request.quote_value).toFixed(2).replace('.', ',')}</span>
                  </div>
                </div>
              )}
              {request.technician_name && (
                <p className="text-xs text-muted-foreground">Técnico: <b>{request.technician_name}</b></p>
              )}
            </section>
          )}

          {/* Fotos do orçamento - sempre exibidas se existirem */}
          {(() => {
            const quotePhotos = (request.execution_logs || []).filter(l =>
              (l.step_title === 'Foto do equipamento (antes)' || l.step_title === 'Foto da peça com defeito') && l.photo_url
            );
            if (!quotePhotos.length) return null;
            return (
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">📷 Fotos do Orçamento</h3>
                <div className="grid grid-cols-2 gap-2">
                  {quotePhotos.map((log, i) => (
                    <PhotoThumb
                      key={i}
                      url={log.photo_url}
                      title={log.step_title}
                      onClick={() => openLightbox(quotePhotos, i)}
                    />
                  ))}
                </div>
              </section>
            );
          })()}

          {/* Aprovação comercial */}
          {request.commercial_decision && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Decisão Comercial</h3>
              <div className={`p-3 rounded-lg border text-sm ${request.commercial_decision === 'aprovado' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                <p className="font-semibold capitalize">{request.commercial_decision}</p>
                {request.commercial_decision_by && <p className="text-xs mt-0.5">Por: {request.commercial_decision_by}</p>}
                {request.commercial_decision_date && <p className="text-xs">{new Date(request.commercial_decision_date).toLocaleDateString('pt-BR')}</p>}
                {request.commercial_notes && (
                  <div className="mt-2 pt-2 border-t border-current/20">
                    <p className="text-xs font-semibold">Observação do Comercial:</p>
                    <p className="text-xs mt-0.5">{request.commercial_notes}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Registro de execução */}
          {logs.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5" /> Registro de Execução ({logs.length} etapas)
              </h3>
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <div key={i} className="p-3 rounded-lg bg-green-50 border border-green-200 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      <p className="text-xs font-semibold text-green-800">{log.step_title}</p>
                    </div>
                    {log.description && <p className="text-xs text-muted-foreground pl-5">{log.description}</p>}
                    {log.photo_url && (() => {
                      const photoLogs = logs.filter(l => l.photo_url);
                      const photoIdx = photoLogs.indexOf(log);
                      return (
                        <div className="pl-5">
                          <PhotoThumb
                            url={log.photo_url}
                            title={log.step_title}
                            onClick={() => openLightbox(photoLogs, photoIdx)}
                          />
                        </div>
                      );
                    })()}
                    <p className="text-xs text-muted-foreground pl-5">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Botão laudo PDF - só para Comercial e Administrativo */}
          {request.status === 'concluido' && !hideReport && (
            <Button
              className="w-full gap-2 bg-slate-800 hover:bg-slate-900 text-white"
              onClick={() => setShowReport(true)}
            >
              <FileText className="w-4 h-4" /> Gerar Laudo PDF
            </Button>
          )}
        </div>
      </div>
      {lightbox && (
        <PhotoLightbox
          photos={lightbox.photos}
          initialIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Loader2, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import PhotoLightbox from '@/components/maintenance/PhotoLightbox';

export default function QuoteDecisionModal({ request, initialDecision, operatorName, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const isApprove = initialDecision === 'aprovado';

  const handle = async () => {
    setSaving(true);
    await base44.entities.MaintenanceRequest.update(request.id, {
      commercial_decision: initialDecision,
      commercial_decision_by: operatorName,
      commercial_decision_date: new Date().toISOString(),
      commercial_notes: reason || '',
      status: isApprove ? 'aprovado_execucao' : 'cancelado',
      ...(isApprove ? {} : { cancellation_reason: reason, cancelled_by: operatorName }),
    });
    toast.success(isApprove ? 'Orçamento aprovado! Técnico notificado.' : 'Solicitação cancelada.');
    setSaving(false);
    onDone();
  };

  const quotePhotos = (request.execution_logs || []).filter(l =>
    l.step_title === 'Foto do equipamento (antes)' || l.step_title === 'Foto da peça com defeito'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-2xl border shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 space-y-4">
        <h2 className="text-base font-bold">{isApprove ? 'Aprovar Orçamento' : 'Recusar Orçamento'}</h2>
        <div className="p-3 rounded-lg bg-muted space-y-1 text-sm">
          <p className="font-semibold">{request.fantasia || request.razao_social}</p>
          <p className="text-muted-foreground text-xs">PDV: {request.pdv_code}</p>
          <p className="font-bold text-green-700">Valor: R$ {Number(request.quote_value).toFixed(2)}</p>
          {request.quote_description && <p className="text-xs text-muted-foreground">{request.quote_description}</p>}
        </div>

        {/* Fotos do técnico */}
        {quotePhotos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-blue-700">📷 Fotos do Técnico — toque para ampliar</p>
            <div className="grid grid-cols-2 gap-2">
              {quotePhotos.map((log, i) => (log.preview_url || log.photo_url) && (
                <button
                  key={i}
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="relative group rounded-lg overflow-hidden border focus:outline-none"
                >
                  <img
                    src={log.preview_url || log.photo_url}
                    className="w-full h-28 object-cover"
                    alt={log.step_title}
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1 truncate px-1">
                    {log.step_title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {lightboxIndex !== null && (
          <PhotoLightbox
            photos={quotePhotos}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}

        <div className="space-y-1">
          <Label className="text-xs">{isApprove ? 'Observação (opcional)' : 'Motivo do Cancelamento'}</Label>
          <Textarea
            placeholder={isApprove ? 'Alguma instrução para o técnico?' : 'Informe o motivo...'}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="min-h-[60px]"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Voltar</Button>
          <Button
            className={`flex-1 text-white ${isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
            onClick={handle}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isApprove
              ? <><CheckCircle2 className="w-4 h-4 mr-1" />Confirmar Aprovação</>
              : <><XCircle className="w-4 h-4 mr-1" />Confirmar Recusa</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
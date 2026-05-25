import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { uploadToOneDrive } from '@/utils/uploadToOneDrive';
import { ArrowLeft, Plus, Camera, Loader2, X, CheckCircle2, ChevronDown, Upload, ZoomIn } from 'lucide-react';
import PhotoLightbox from '@/components/maintenance/PhotoLightbox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

// Etapas sugeridas para a execução em campo
const EXECUTION_STEPS = [
  'Foto da peça nova',
  'Foto da instalação',
  'Foto do equipamento (depois)',
  'Teste de funcionamento',
];

export default function ExecutionLogger({ request, technicianName, onDone, onCancel }) {
  // logs persistidos (já salvos no banco, com photo_url = URL do OneDrive)
  const [logs, setLogs] = useState(request.execution_logs || []);
  // pendingLogs: etapas adicionadas nesta sessão mas ainda não enviadas ao OneDrive
  const [pendingLogs, setPendingLogs] = useState([]);
  const [newStep, setNewStep] = useState({ step_title: '', description: '', file: null, preview_url: '' });
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileRef = useRef();

  const [lightboxIndex, setLightboxIndex] = useState(null);
  const allLogs = [...logs, ...pendingLogs];
  const completedTitles = new Set(allLogs.map(l => l.step_title));

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const localPreview = URL.createObjectURL(file);
    setNewStep(s => ({ ...s, file, preview_url: localPreview, uploading: true }));
    // Faz upload no Base44 Storage para garantir preview permanente
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setNewStep(s => ({ ...s, preview_url: file_url, uploading: false }));
  };

  const addStep = () => {
    const finalTitle = newStep.step_title === '__outro'
      ? (newStep.custom_title || '').trim()
      : newStep.step_title.trim();
    if (!finalTitle) { toast.error('Informe o título da etapa.'); return; }
    if (!newStep.file) { toast.error('A foto é obrigatória para registrar uma etapa.'); return; }
    const entry = {
      step_title: finalTitle,
      description: newStep.description,
      photo_url: newStep.preview_url, // URL Base44 — preview permanente
      preview_url: newStep.preview_url,
      _file: newStep.file, // arquivo local para upload ao OneDrive
      timestamp: new Date().toISOString(),
    };
    setPendingLogs(prev => [...prev, entry]);
    setNewStep({ step_title: '', description: '', file: null, preview_url: '' });
    toast.success('Etapa adicionada! Será enviada ao concluir.');
  };

  const finish = async () => {
    if (allLogs.length === 0) { toast.error('Registre ao menos uma etapa antes de concluir.'); return; }
    setFinishing(true);
    const subfolder = request.request_number || request.id;

    // Faz upload de todas as etapas pendentes para o OneDrive
    const uploadedPending = [];
    for (let i = 0; i < pendingLogs.length; i++) {
      const log = pendingLogs[i];
      setUploadProgress(`Enviando foto ${i + 1} de ${pendingLogs.length}...`);
      try {
        const { preview_url, share_url } = await uploadToOneDrive(log._file, subfolder, log.step_title);
        uploadedPending.push({ step_title: log.step_title, description: log.description, photo_url: preview_url, share_url, timestamp: log.timestamp });
      } catch (err) {
        toast.error(`Erro ao enviar "${log.step_title}": ${err.message}`);
        setFinishing(false);
        setUploadProgress('');
        return;
      }
    }

    setUploadProgress('Salvando...');
    const updatedLogs = [...logs, ...uploadedPending];
    await base44.entities.MaintenanceRequest.update(request.id, {
      execution_logs: updatedLogs,
      status: 'concluido',
      completion_date: new Date().toISOString(),
      technician_name: technicianName,
    });
    toast.success('Serviço concluído com sucesso!');
    setFinishing(false);
    setUploadProgress('');
    onDone();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-4 py-6 space-y-4 pb-28">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel}><ArrowLeft className="w-5 h-5" /></Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Registro de Execução</h1>
            <p className="text-xs text-muted-foreground">{request.fantasia || request.razao_social}</p>
          </div>
        </div>



        {/* Etapas já registradas (persistidas + pendentes) */}
        {allLogs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Etapas ({allLogs.length})</p>
            {allLogs.map((log, i) => {
              const isPending = !!log._file;
              return (
                <Card key={i} className={`border ${isPending ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`w-4 h-4 shrink-0 ${isPending ? 'text-amber-500' : 'text-green-600'}`} />
                      <p className={`text-sm font-semibold ${isPending ? 'text-amber-800' : 'text-green-800'}`}>{log.step_title}</p>
                      {isPending && <span className="text-xs text-amber-600 ml-auto">(pendente envio)</span>}
                    </div>
                    {log.description && <p className="text-xs text-muted-foreground pl-6">{log.description}</p>}
                    {(log.preview_url || log.photo_url) && (
                      <div className="pl-6">
                        <button
                          type="button"
                          onClick={() => setLightboxIndex(i)}
                          className="relative group w-full rounded-lg overflow-hidden border focus:outline-none"
                        >
                          <img src={log.preview_url || log.photo_url} className="w-full h-28 object-cover" alt="Etapa" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground pl-6">{new Date(log.timestamp).toLocaleString('pt-BR')}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Nova etapa */}
        <Card className="border">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Registrar Etapa</p>

            <div className="space-y-1">
              <Label className="text-xs">Título da Etapa *</Label>
              <div className="relative">
                <select
                  value={newStep.step_title}
                  onChange={e => setNewStep(s => ({ ...s, step_title: e.target.value }))}
                  className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">Selecione uma etapa...</option>
                  {EXECUTION_STEPS.map(step => (
                    <option key={step} value={step} disabled={completedTitles.has(step)}>
                      {step}{completedTitles.has(step) ? ' ✓' : ''}
                    </option>
                  ))}
                  <option value="__outro">Outra etapa...</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              {newStep.step_title === '__outro' && (
                <input
                  type="text"
                  placeholder="Descreva a etapa..."
                  value={newStep.custom_title || ''}
                  onChange={e => setNewStep(s => ({ ...s, custom_title: e.target.value }))}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                />
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea placeholder="Detalhes desta etapa..." value={newStep.description} onChange={e => setNewStep(s => ({ ...s, description: e.target.value }))} className="min-h-[60px]" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Foto <span className="text-destructive font-semibold">*</span></Label>
              {newStep.preview_url ? (
                <div className="relative">
                  <img src={newStep.preview_url} className="w-full h-36 object-cover rounded-lg border" alt="Foto" />
                  <button type="button" onClick={() => setNewStep(s => ({ ...s, file: null, preview_url: '' }))} className="absolute top-2 right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={newStep.uploading}
                  className="w-full h-20 rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 flex items-center justify-center gap-2 text-amber-700 hover:border-amber-500 transition-colors disabled:opacity-60"
                >
                  {newStep.uploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">Enviando foto...</span></>
                    : <><Camera className="w-4 h-4" /><span className="text-xs">Foto obrigatória — toque para capturar</span></>
                  }
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
            </div>

            <Button className="w-full gap-2" onClick={addStep} disabled={saving || newStep.uploading}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4" />Adicionar Etapa</>}
            </Button>

            {/* Progresso das etapas sugeridas */}
            <div className="pt-2 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Progresso</p>
              {EXECUTION_STEPS.map(step => {
                const done = completedTitles.has(step);
                return (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center ${done ? 'bg-green-500' : 'bg-muted border border-border'}`}>
                      {done && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${done ? 'w-full bg-green-500' : 'w-0'}`} />
                    </div>
                    <span className={`text-xs w-36 truncate ${done ? 'text-green-700 font-medium' : 'text-muted-foreground'}`}>{step}</span>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground text-right">
                {EXECUTION_STEPS.filter(s => completedTitles.has(s)).length}/{EXECUTION_STEPS.length} concluídas
              </p>
            </div>
          </CardContent>
        </Card>

        {lightboxIndex !== null && (
          <PhotoLightbox
            photos={allLogs}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}

        {/* Concluir */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t md:static md:border-0 md:p-0">
          {pendingLogs.length > 0 && !finishing && (
            <p className="text-xs text-amber-700 text-center mb-2">
              <Upload className="w-3 h-3 inline mr-1" />
              {pendingLogs.length} etapa(s) serão enviadas ao concluir
            </p>
          )}
          {uploadProgress && (
            <p className="text-xs text-blue-700 text-center mb-2 animate-pulse">{uploadProgress}</p>
          )}
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
            onClick={finish}
            disabled={finishing || allLogs.length === 0}
          >
            {finishing ? <><Loader2 className="w-4 h-4 animate-spin" />{uploadProgress || 'Concluindo...'}</> : <><CheckCircle2 className="w-4 h-4" />Concluir Serviço</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
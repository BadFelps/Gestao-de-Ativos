import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { uploadToOneDrive } from '@/utils/uploadToOneDrive';
import { ArrowLeft, Loader2, Plus, Minus, Package, Wrench, Camera, X, CheckCircle2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

const categoryConfig = {
  peça:    { label: 'Peça',    color: 'bg-blue-100 text-blue-800 border-blue-200',    icon: Package },
  serviço: { label: 'Serviço', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Wrench },
};

// Fotos obrigatórias antes do orçamento
const REQUIRED_PHOTOS = [
  { key: 'photo_before', label: 'Foto do equipamento (antes)' },
  { key: 'photo_defect', label: 'Foto da peça com defeito' },
];

export default function QuoteForm({ request, technicianName, onDone, onCancel }) {
  const [parts, setParts] = useState([]);
  const [loadingParts, setLoadingParts] = useState(true);
  const [selected, setSelected] = useState({}); // { partId: quantity }
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  // Fotos capturadas localmente (upload só ocorre no submit)
  // Estrutura: { file: File, preview_url: string (ObjectURL) }
  const [photos, setPhotos] = useState({ photo_before: null, photo_defect: null });
  const photoRefs = { photo_before: useRef(), photo_defect: useRef() };

  useEffect(() => {
    base44.entities.MaintenancePart.filter({ is_active: true }, 'name', 200)
      .then(data => { setParts(data); setLoadingParts(false); });
  }, []);

  const handlePhotoCapture = (key, e) => {
    const file = e.target.files[0];
    if (!file) return;
    const preview_url = URL.createObjectURL(file);
    setPhotos(p => ({ ...p, [key]: { file, preview_url } }));
  };

  const togglePart = (part) => {
    setSelected(prev => {
      if (prev[part.id]) {
        const next = { ...prev };
        delete next[part.id];
        return next;
      }
      return { ...prev, [part.id]: 1 };
    });
  };

  const changeQty = (partId, delta) => {
    setSelected(prev => {
      const newQty = (prev[partId] || 1) + delta;
      if (newQty <= 0) {
        const next = { ...prev };
        delete next[partId];
        return next;
      }
      return { ...prev, [partId]: newQty };
    });
  };

  const selectedParts = parts.filter(p => selected[p.id]);
  const totalValue = selectedParts.reduce((sum, p) => sum + p.unit_price * (selected[p.id] || 1), 0);

  const grouped = {
    peça:    parts.filter(p => p.category === 'peça'),
    serviço: parts.filter(p => p.category === 'serviço'),
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photos.photo_before) {
      toast.error('Adicione a foto do equipamento (antes).');
      return;
    }
    if (!photos.photo_defect) {
      toast.error('Adicione a foto da peça com defeito.');
      return;
    }
    if (selectedParts.length === 0) {
      toast.error('Selecione ao menos uma peça ou serviço.');
      return;
    }
    if (!description.trim()) {
      toast.error('Preencha o diagnóstico/descrição do serviço.');
      return;
    }
    setSaving(true);
    const subfolder = request.request_number || request.id;

    // Faz upload das fotos para o OneDrive apenas no submit
    let uploadedBefore = null;
    let uploadedDefect = null;
    try {
      [uploadedBefore, uploadedDefect] = await Promise.all([
        uploadToOneDrive(photos.photo_before.file, subfolder, REQUIRED_PHOTOS[0].label),
        uploadToOneDrive(photos.photo_defect.file, subfolder, REQUIRED_PHOTOS[1].label),
      ]);
    } catch (err) {
      toast.error('Erro ao enviar fotos para o OneDrive: ' + err.message);
      setSaving(false);
      return;
    }

    const quoteItems = selectedParts.map(p => ({
      part_id: p.id,
      name: p.name,
      category: p.category,
      quantity: selected[p.id],
      unit_price: p.unit_price,
      total: p.unit_price * selected[p.id],
    }));
    const photoLogs = [
      { step_title: REQUIRED_PHOTOS[0].label, description: '', photo_url: uploadedBefore.preview_url, share_url: uploadedBefore.share_url, timestamp: new Date().toISOString() },
      { step_title: REQUIRED_PHOTOS[1].label, description: '', photo_url: uploadedDefect.preview_url, share_url: uploadedDefect.share_url, timestamp: new Date().toISOString() },
    ];
    const existingLogs = (request.execution_logs || []).filter(
      l => l.step_title !== REQUIRED_PHOTOS[0].label && l.step_title !== REQUIRED_PHOTOS[1].label
    );
    const quoteDate = new Date().toISOString();
    await base44.entities.MaintenanceRequest.update(request.id, {
      quote_value: totalValue,
      quote_description: description,
      quote_date: quoteDate,
      quote_items: quoteItems,
      technician_name: technicianName,
      status: 'aguardando_aprovacao',
      execution_logs: [...photoLogs, ...existingLogs],
    });

    // Notifica Teams sobre orçamento recebido
    base44.functions.invoke('notifyTeamsOnCompletion', {
      type: 'quote',
      data: {
        ...request,
        quote_value: totalValue,
        quote_date: quoteDate,
        technician_name: technicianName,
      },
    }).catch(() => {}); // fire-and-forget

    toast.success('Orçamento enviado para aprovação do comercial!');
    setSaving(false);
    onDone();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onCancel}><ArrowLeft className="w-5 h-5" /></Button>
          <h1 className="text-lg font-bold">Registrar Orçamento</h1>
        </div>

        {/* Info do cliente */}
        <Card className="border">
          <CardContent className="p-4 space-y-1 text-sm">
            <p className="font-semibold">{request.fantasia || request.razao_social}</p>
            <p className="text-muted-foreground text-xs">PDV: {request.pdv_code} · Plaqueta: {request.asset_tag || '—'}</p>
            {request.address && <p className="text-xs text-muted-foreground">📍 {request.address}</p>}
            {request.contact && <p className="text-xs text-muted-foreground">📞 {request.contact}</p>}
            {request.equipment_description && (
              <p className="text-xs text-blue-700 font-medium">🧊 {request.equipment_description}</p>
            )}
            <div className="mt-2 p-2 rounded-lg bg-muted text-xs">
              <b>Problema relatado:</b> {request.problem_description}
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fotos obrigatórias */}
          <Card className="border border-amber-200 bg-amber-50">
            <CardContent className="p-4 space-y-3">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">📷 Fotos obrigatórias (antes do orçamento)</p>
              {REQUIRED_PHOTOS.map(({ key, label }) => {
                const photo = photos[key];
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center gap-2">
                      {photo
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                        : <Circle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      }
                      <Label className="text-xs text-amber-900">{label} *</Label>
                    </div>
                    {photo ? (
                      <div className="relative">
                        <img src={photo.preview_url} className="w-full h-28 object-cover rounded-lg border border-amber-200" alt={label} />
                        <button type="button" onClick={() => setPhotos(p => ({ ...p, [key]: null }))} className="absolute top-1.5 right-1.5 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => photoRefs[key].current?.click()}
                        className="w-full h-16 rounded-lg border-2 border-dashed border-amber-300 flex items-center justify-center gap-2 text-amber-700 hover:border-amber-500 transition-colors"
                      >
                        <Camera className="w-4 h-4" /><span className="text-xs">Adicionar foto</span>
                      </button>
                    )}
                    <input ref={photoRefs[key]} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoCapture(key, e)} />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Seleção de peças/serviços */}
          <Card className="border">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm">Peças e Serviços *</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {loadingParts ? (
                <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : parts.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhuma peça cadastrada. Solicite ao administrativo.</p>
              ) : (
                <div className="space-y-4">
                  {(['peça', 'serviço']).map(cat => grouped[cat].length > 0 && (
                    <div key={cat}>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                        {categoryConfig[cat].label}s
                      </p>
                      <div className="space-y-1.5">
                        {grouped[cat].map(part => {
                          const isSelected = !!selected[part.id];
                          return (
                            <div
                              key={part.id}
                              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                                isSelected ? 'border-primary bg-accent/40' : 'border-border bg-background hover:bg-muted/40'
                              }`}
                              onClick={() => togglePart(part)}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                                  isSelected ? 'border-primary bg-primary' : 'border-border'
                                }`}>
                                  {isSelected && <span className="text-white text-[9px] font-bold">✓</span>}
                                </div>
                                <span className="text-sm truncate">{part.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                                <span className="text-xs text-green-700 font-medium">
                                  R$ {Number(part.unit_price).toFixed(2).replace('.', ',')}
                                </span>
                                {isSelected && (
                                  <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => changeQty(part.id, -1)} className="w-5 h-5 rounded border border-border bg-background flex items-center justify-center hover:bg-muted">
                                      <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-xs font-semibold w-4 text-center">{selected[part.id]}</span>
                                    <button type="button" onClick={() => changeQty(part.id, 1)} className="w-5 h-5 rounded border border-border bg-background flex items-center justify-center hover:bg-muted">
                                      <Plus className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total */}
          {selectedParts.length > 0 && (
            <Card className="border border-green-200 bg-green-50">
              <CardContent className="p-3 space-y-1">
                <p className="text-xs font-semibold text-green-800 mb-2">Resumo do Orçamento</p>
                {selectedParts.map(p => (
                  <div key={p.id} className="flex justify-between text-xs text-green-700">
                    <span>{p.name} x{selected[p.id]}</span>
                    <span>R$ {(p.unit_price * selected[p.id]).toFixed(2).replace('.', ',')}</span>
                  </div>
                ))}
                <div className="border-t border-green-200 pt-1 mt-1 flex justify-between font-bold text-sm text-green-800">
                  <span>Total</span>
                  <span>R$ {totalValue.toFixed(2).replace('.', ',')}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diagnóstico */}
          <div className="space-y-1">
            <Label>Diagnóstico / Descrição do Serviço *</Label>
            <Textarea
              placeholder="Descreva o problema identificado e o serviço a ser realizado..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Orçamento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
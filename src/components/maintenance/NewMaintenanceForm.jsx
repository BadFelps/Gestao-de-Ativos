import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { uploadToOneDrive } from '@/utils/uploadToOneDrive';
import { Camera, Loader2, X, Search, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function NewMaintenanceForm({ operatorName, onCreated, onCancel }) {
  const [form, setForm] = useState({
    pdv_code: '', razao_social: '', fantasia: '', address: '', contact: '',
    equipment_description: '', asset_tag: '', problem_description: '',
  });
  const [photoFile, setPhotoFile] = useState(null);   // File local (não enviado ainda)
  const [photoPreview, setPhotoPreview] = useState(null); // URL local para preview
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [clientFound, setClientFound] = useState(false);
  const [refrigeradores, setRefrigeradores] = useState([]);
  const [selectedRefrigerador, setSelectedRefrigerador] = useState('');
  const fileRef = useRef();

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSearchPDV = async () => {
    if (!form.pdv_code.trim()) { toast.error('Digite o código PDV.'); return; }
    setSearching(true);
    setClientFound(false);
    setRefrigeradores([]);
    setSelectedRefrigerador('');
    try {
      const results = await base44.entities.Cliente.filter({ codigo_cliente: form.pdv_code.trim() });
      if (!results || results.length === 0) {
        toast.error('Cliente não encontrado na base. Preencha os dados manualmente.');
        setSearching(false);
        return;
      }
      const cliente = results[0];
      const materiais = cliente.materiais || [];
      const refs = materiais.filter(m => m.descricao && m.descricao.trim().toLowerCase().startsWith('ref'));

      setForm(f => ({
        ...f,
        razao_social: cliente.razao_social || '',
        fantasia: cliente.fantasia || '',
        address: cliente.endereco || '',
      }));

      setRefrigeradores(refs);
      setClientFound(true);

      if (refs.length === 0) {
        toast.warning('Cliente encontrado, mas sem refrigeradores cadastrados na base.');
      } else {
        toast.success(`Cliente encontrado! ${refs.length} refrigerador(es) disponível(is).`);
      }
    } catch (err) {
      toast.error('Erro ao buscar cliente.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectRefrigerador = (descricao) => {
    setSelectedRefrigerador(descricao);
    set('equipment_description', descricao);
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.pdv_code || !form.razao_social || !form.problem_description) {
      toast.error('Preencha PDV, Razão Social e descrição do problema.');
      return;
    }
    if (!form.contact.trim()) {
      toast.error('Preencha o contato do PDV.');
      return;
    }
    setSaving(true);
    const num = `MAN-${Date.now().toString().slice(-6)}`;

    // Faz upload da foto para o OneDrive agora que temos o número da solicitação
    let initial_photo_url = '';
    if (photoFile) {
      try {
        const { preview_url } = await uploadToOneDrive(photoFile, num, 'foto_inicial');
        initial_photo_url = preview_url;
      } catch (err) {
        toast.error('Aviso: não foi possível enviar a foto ao OneDrive, mas a solicitação será criada.');
      }
    }

    await base44.entities.MaintenanceRequest.create({
      ...form,
      request_number: num,
      initial_photo_url,
      status: 'pendente_triagem',
      requested_by: operatorName,
    });
    toast.success(`Solicitação ${num} criada com sucesso!`);
    setSaving(false);
    onCreated();
  };

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Nova Solicitação de Manutenção</CardTitle>
          <button onClick={onCancel}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* PDV + Busca */}
          <div className="space-y-1">
            <Label className="text-xs">Código PDV *</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: 001234"
                value={form.pdv_code}
                onChange={e => { set('pdv_code', e.target.value); setClientFound(false); setRefrigeradores([]); setSelectedRefrigerador(''); }}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearchPDV())}
                className="flex-1"
              />
              <Button type="button" variant="outline" onClick={handleSearchPDV} disabled={searching} className="shrink-0">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Indicador de cliente encontrado */}
          {clientFound && (
            <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Dados preenchidos automaticamente da base de clientes</span>
            </div>
          )}

          {/* Dados do cliente */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Razão Social *</Label>
              <Input placeholder="Razão Social" value={form.razao_social} onChange={e => set('razao_social', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome Fantasia</Label>
              <Input placeholder="Nome Fantasia" value={form.fantasia} onChange={e => set('fantasia', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Endereço</Label>
              <Input placeholder="Endereço do PDV" value={form.address} onChange={e => set('address', e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contato *</Label>
              <Input placeholder="Telefone / Nome" value={form.contact} onChange={e => set('contact', e.target.value)} required />
            </div>
          </div>

          {/* Seleção de refrigerador */}
          <div className="space-y-1">
            <Label className="text-xs">Refrigerador com Defeito</Label>
            {refrigeradores.length > 0 ? (
              <div className="space-y-1.5">
                {refrigeradores.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSelectRefrigerador(r.descricao)}
                    className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-all flex items-center justify-between gap-2 ${
                      selectedRefrigerador === r.descricao
                        ? 'border-primary bg-accent text-primary font-medium'
                        : 'border-border bg-background hover:bg-muted/50'
                    }`}
                  >
                    <span>{r.descricao}</span>
                    {r.quantidade > 1 && <span className="text-xs text-muted-foreground shrink-0">x{r.quantidade}</span>}
                  </button>
                ))}
              </div>
            ) : (
              <Input
                placeholder="Modelo / Tipo do refrigerador"
                value={form.equipment_description}
                onChange={e => set('equipment_description', e.target.value)}
              />
            )}
          </div>

          {/* Plaqueta */}
          <div className="space-y-1">
            <Label className="text-xs">Número da Plaqueta</Label>
            <Input placeholder="Ex: 2220" value={form.asset_tag} onChange={e => set('asset_tag', e.target.value)} />
          </div>

          {/* Problema */}
          <div className="space-y-1">
            <Label className="text-xs">Problema Encontrado *</Label>
            <Textarea
              placeholder="Descreva o problema com o equipamento..."
              value={form.problem_description}
              onChange={e => set('problem_description', e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Foto */}
          <div className="space-y-1">
            <Label className="text-xs">Foto do Equipamento</Label>
            {photoPreview ? (
              <div className="relative w-full h-40">
                <img src={photoPreview} className="w-full h-40 object-cover rounded-lg border" alt="Foto" />
                <button type="button" onClick={clearPhoto} className="absolute top-2 right-2 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center shadow">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary transition-colors"
              >
                <Camera className="w-5 h-5" /><span className="text-xs">Tirar foto</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Solicitação'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
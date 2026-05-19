import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Search, Loader2, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const DEFAULT_ASSET_TYPES = [
  'Refrigerador Vertical','Refrigerador Horizontal','Jogos de Mesa Madeira','Jogos de Mesa Plástica',
  'Mesas Plásticas','Mesas de Madeira','Cadeiras Plásticas','Cadeiras de Madeira',
  'Caixa Térmica','Barril 30L','Barril 50L','Cilindro','Chopeira','Outro'
];
const DEFAULT_BRANDS = ['Devassa','Heineken','Amstel','Schin'];
const REQUEST_TYPES = ['Fixo', 'Evento', 'Recolha'];
const VOLTAGE_TYPES = ['110v', '220v'];
const NEEDS_VOLTAGE_TYPES = ['Refrigerador Vertical', 'Refrigerador Horizontal', 'Chopeira'];

function emptyItem() { return { asset_type: '', asset_brand: '', quantity: 1 }; }

export default function LoanFormModal({ session, initialDate, existingRequest, onClose, onSaved }) {
  const isEdit = !!existingRequest;

  const [form, setForm] = useState({
    pdv_code: existingRequest?.pdv_code || '',
    razao_social: existingRequest?.razao_social || '',
    fantasia: existingRequest?.fantasia || '',
    bairro: existingRequest?.bairro || '',
    cidade: existingRequest?.cidade || '',
    setor: existingRequest?.setor || session.setor || '',
    observations: existingRequest?.observations || '',
    request_type: existingRequest?.request_type || 'Fixo',
    comodato_type: existingRequest?.comodato_type || '',
    loan_date: existingRequest?.loan_date || initialDate || '',
    return_date: existingRequest?.return_date || '',
    voltage: existingRequest?.voltage || '',
    patrimonio: existingRequest?.patrimonio || '',
  });

  // Multi-material items — reconstrói todos os itens a partir de extra_items se existir
  const [items, setItems] = useState(() => {
    if (existingRequest?.extra_items) {
      try { return JSON.parse(existingRequest.extra_items); } catch {}
    }
    if (existingRequest?.asset_type) {
      return [{ asset_type: existingRequest.asset_type, asset_brand: existingRequest.asset_brand || '', quantity: existingRequest.quantity || 1 }];
    }
    return [emptyItem()];
  });

  const [searching, setSearching] = useState(false);
  const [clientFound, setClientFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: assetTypes = [] } = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => base44.entities.AssetType.list('name'),
    staleTime: 60000,
  });
  const activeTypes = assetTypes.filter(t => t.is_active);
  const typeNames = activeTypes.length > 0 ? activeTypes.map(t => t.name) : DEFAULT_ASSET_TYPES;

  const getBrands = (typeName) => {
    const found = activeTypes.find(t => t.name === typeName);
    return found?.brands?.length > 0 ? found.brands : DEFAULT_BRANDS;
  };

  const setItem = (idx, key, val) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [key]: val, ...(key === 'asset_type' ? { asset_brand: '' } : {}) } : it));
  };
  const addItem = () => setItems(prev => [...prev, emptyItem()]);
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const handlePdvSearch = async (val) => {
    set('pdv_code', val);
    setClientFound(false);
    if (val.trim().length < 3) return;
    setSearching(true);
    const results = await base44.entities.ClientBase.filter({ pdv_code: val.trim() });
    setSearching(false);
    if (results.length > 0) {
      const c = results[0];
      setForm(f => ({
        ...f,
        pdv_code: val.trim(),
        razao_social: c.razao_social || f.razao_social,
        fantasia: c.fantasia || f.fantasia,
        bairro: c.bairro || f.bairro,
        cidade: c.cidade || f.cidade,
        setor: c.vendedor || c.setor || f.setor,
      }));
      setClientFound(true);
    }
  };

  const handleSubmit = async () => {
    if (!form.pdv_code || !form.request_type || !form.loan_date) {
      toast.error('Preencha: PDV, Tipo e Data');
      return;
    }
    // Recolha: loan_date é a data da recolha (return_date fica vazio)
    if (form.request_type === 'Evento' && !form.return_date) {
      toast.error('Informe a Data de Recolha para Evento');
      return;
    }
    if (items.some(it => !it.asset_type)) {
      toast.error('Preencha o tipo de material em todos os itens');
      return;
    }

    // Voltagem obrigatória se algum item for Refrigerador ou Chopeira
    const hasRefOrChop = items.some(it => NEEDS_VOLTAGE_TYPES.includes(it.asset_type));
    if (hasRefOrChop && !form.voltage) {
      toast.error('Informe a voltagem (110v ou 220v)');
      return;
    }

    // Comodato obrigatório para Recolha
    if (form.request_type === 'Recolha' && !form.comodato_type) {
      toast.error('Informe o tipo de comodato para Recolha');
      return;
    }

    setLoading(true);

    const reqNum = `SOL-${Date.now().toString(36).toUpperCase()}`;
    let status = 'pendente_aprovacao_comercial';
    if (session.role === 'comercial') {
      status = form.request_type === 'Fixo' ? 'pendente_aprovacao_analista' : 'pendente';
    }

    // Primary asset fields (first item) for backward compat + todos os itens em extra_items sempre
    const firstItem = items[0];
    const payload = {
      ...form,
      asset_type: firstItem.asset_type,
      asset_brand: firstItem.asset_brand || '',
      quantity: firstItem.quantity,
      extra_items: JSON.stringify(items), // sempre salva todos os itens
      revenda: session.revenda,
      request_number: isEdit ? existingRequest.request_number : reqNum,
      created_by_role: isEdit ? existingRequest.created_by_role : session.role,
      created_by_name: isEdit ? existingRequest.created_by_name : session.operatorName,
      created_by_setor: isEdit ? existingRequest.created_by_setor : session.setor || form.setor,
      status: isEdit ? existingRequest.status : status,
    };

    if (isEdit) {
      await base44.entities.LoanRequest.update(existingRequest.id, payload);
      toast.success('Solicitação atualizada!');
    } else {
      const created = await base44.entities.LoanRequest.create(payload);
      toast.success('Solicitação criada!');
      // Notificar Teams
      try { await base44.functions.invoke('notifyLoanTeams', { type: 'criada', request: { ...payload, id: created?.id } }); } catch {}
    }

    setLoading(false);
    onSaved?.();
  };

  const showLoanDate = form.request_type === 'Fixo' || form.request_type === 'Evento';
  const showReturnDate = form.request_type === 'Evento';
  const showOnlyCollectDate = form.request_type === 'Recolha';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{isEdit ? 'Editar Solicitação' : 'Nova Solicitação'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* PDV */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Dados do Cliente</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500">Código PDV *</Label>
                <div className="relative">
                  <Input value={form.pdv_code} onChange={e => handlePdvSearch(e.target.value)} placeholder="Ex: 0001-8085"
                    className={clientFound ? 'border-green-400 bg-green-50 pr-8' : 'pr-8'} />
                  {searching && <Loader2 className="absolute right-2.5 top-2.5 w-4 h-4 animate-spin text-gray-400" />}
                  {!searching && clientFound && <CheckCircle2 className="absolute right-2.5 top-2.5 w-4 h-4 text-green-500" />}
                </div>
                {clientFound && <p className="text-xs text-green-600">✓ Cliente encontrado</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500">Razão Social</Label>
                <Input value={form.razao_social} onChange={e => set('razao_social', e.target.value)} placeholder="Razão Social" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500">Fantasia</Label>
                <Input value={form.fantasia} onChange={e => set('fantasia', e.target.value)} placeholder="Nome fantasia" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500">Bairro</Label>
                <Input value={form.bairro} onChange={e => set('bairro', e.target.value)} placeholder="Bairro" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500">Cidade</Label>
                <Input value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Cidade" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500">Setor</Label>
                <Input value={form.setor} onChange={e => set('setor', e.target.value)} placeholder="Ex: 101" />
              </div>
            </div>
          </section>

          {/* Materiais (multi) */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Materiais</p>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-orange-600 font-semibold hover:text-orange-700 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Adicionar item
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                  {/* Tipo */}
                  <Select value={item.asset_type} onValueChange={v => setItem(idx, 'asset_type', v)}>
                    <SelectTrigger className="flex-1 min-w-0 h-8 text-xs bg-white">
                      <SelectValue placeholder="Material *" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeNames.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {/* Marca */}
                  <Select value={item.asset_brand} onValueChange={v => setItem(idx, 'asset_brand', v)}>
                    <SelectTrigger className="w-24 h-8 text-xs bg-white shrink-0">
                      <SelectValue placeholder="Marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {getBrands(item.asset_type).map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {/* Qtd */}
                  <input type="number" min="1" value={item.quantity}
                    onChange={e => setItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                    className="w-12 h-8 text-center text-xs border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-orange-400 shrink-0" />
                  {/* Remover */}
                  {items.length > 1 && (
                    <button onClick={() => removeItem(idx)} className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Voltagem e Patrimônio — apenas se algum item for Refrigerador ou Chopeira */}
            {items.some(it => NEEDS_VOLTAGE_TYPES.includes(it.asset_type)) && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500">Voltagem *</Label>
                  <Select value={form.voltage} onValueChange={v => set('voltage', v)}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {VOLTAGE_TYPES.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500">Nº Patrimônio <span className="text-gray-400 font-normal">(opcional)</span></Label>
                  <Input value={form.patrimonio} onChange={e => set('patrimonio', e.target.value)} placeholder="Ex: 00123" />
                </div>
              </div>
            )}

            <div className="mt-3 space-y-1.5">
              <Label className="text-xs font-semibold text-gray-500">Observações</Label>
              <Input value={form.observations} onChange={e => set('observations', e.target.value)} placeholder="Observações adicionais..." />
            </div>
          </section>

          {/* Tipo e Datas */}
          <section>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Tipo e Datas</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500">Tipo *</Label>
                <Select value={form.request_type} onValueChange={v => set('request_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REQUEST_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {showLoanDate && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500">Data Empréstimo *</Label>
                  <Input type="date" value={form.loan_date} onChange={e => set('loan_date', e.target.value)} />
                </div>
              )}
              {showReturnDate && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500">Data Recolha *</Label>
                  <Input type="date" value={form.return_date} onChange={e => set('return_date', e.target.value)} />
                </div>
              )}
              {showOnlyCollectDate && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-500">Data da Recolha *</Label>
                  <Input type="date" value={form.loan_date} onChange={e => set('loan_date', e.target.value)} />
                </div>
              )}
            </div>
            {/* Tipo de Comodato — apenas para Recolha */}
            {form.request_type === 'Recolha' && (
              <div className="mt-3 space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500">Tipo de Comodato *</Label>
                <Select value={form.comodato_type} onValueChange={v => set('comodato_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Comodato Temporário">Comodato Temporário</SelectItem>
                    <SelectItem value="Comodato Fixo">Comodato Fixo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </section>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Salvar' : 'Criar Solicitação'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
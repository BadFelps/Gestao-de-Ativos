import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAccess } from '@/lib/accessContext.jsx';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Loader2, Search, PlusCircle } from 'lucide-react';
import AssetRow from './AssetRow';

const emptyAsset = () => ({
  asset_type: '', asset_brand: '', asset_serial: '', asset_description: '', quantity: 1
});

const emptyClient = {
  client_name: '', client_code: '', client_address: '', client_phone: '',
  razao_social: '', fantasia: '', cnpj: '', setor: '', revenda: '',
};

export default function CreateOrderForm({ onCreated }) {
  const { getSession } = useAccess();
  const session = getSession('admin');
  const sessionRevenda = session?.revenda || '';
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [clientFound, setClientFound] = useState(false);
  const [client, setClient] = useState({ ...emptyClient, revenda: sessionRevenda });
  const [isUrgent, setIsUrgent] = useState(false);
  const [indicatedDate, setIndicatedDate] = useState('');
  const [assets, setAssets] = useState([emptyAsset()]);

  // Sincroniza a revenda do formulário sempre que a sessão mudar
  useEffect(() => {
    if (sessionRevenda) {
      setClient(c => ({ ...c, revenda: c.revenda || sessionRevenda }));
    }
  }, [sessionRevenda]);

  const setClientField = (key, val) => setClient(c => ({ ...c, [key]: val }));

  const handleCodeChange = async (val) => {
    setClientField('client_code', val);
    setClientFound(false);
    if (val.trim().length < 3) return;

    setSearching(true);
    const results = await base44.entities.ClientBase.filter({ pdv_code: val.trim() });
    setSearching(false);
    if (results.length > 0) {
      const c = results[0];
      // Verifica se o cliente pertence à revenda da sessão (quando há sessão ativa)
      // Normaliza para comparação: remove " - " e espaços extras (banco usa "MS - Paulo Afonso", sessão usa "MS Paulo Afonso")
      const normalizar = (s = '') => s.trim().replace(/\s*-\s*/g, ' ').toLowerCase();
      if (sessionRevenda && c.revenda && c.revenda.trim() !== '' && normalizar(c.revenda) !== normalizar(sessionRevenda)) {
        toast.error(`Este cliente pertence à "${c.revenda}" e não pode ser acessado pela sessão "${sessionRevenda}".`);
        setClientFound(false);
        return;
      }
      const fullAddress = [c.address, c.bairro, c.cidade, c.cep].filter(Boolean).join(', ');
      setClient(prev => ({
        ...prev,
        client_code: val.trim(),
        client_name: c.fantasia || c.razao_social || prev.client_name,
        razao_social: c.razao_social || prev.razao_social,
        fantasia: c.fantasia || prev.fantasia,
        client_address: fullAddress || prev.client_address,
        setor: c.vendedor || c.setor || prev.setor,
        cnpj: c.cnpj || prev.cnpj,
        revenda: sessionRevenda || c.revenda || prev.revenda,
      }));
      setClientFound(true);
    }
  };

  const handleAssetChange = (index, updated) => {
    setAssets(prev => prev.map((a, i) => i === index ? updated : a));
  };

  const handleAddAsset = () => setAssets(prev => [...prev, emptyAsset()]);

  const handleRemoveAsset = (index) => setAssets(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!client.client_name) {
      toast.error('Preencha o campo obrigatório: Cliente');
      return;
    }
    if (assets.some(a => !a.asset_type)) {
      toast.error('Selecione o Tipo para todos os ativos');
      return;
    }

    setLoading(true);
    const priority = isUrgent ? 'Urgente' : 'Média';
    const osNumber = `RC-${Date.now().toString(36).toUpperCase()}`;
    const revendaFinal = client.revenda || session?.revenda || '';

    const firstAsset = assets[0];
    const created = await base44.entities.ServiceOrder.create({
      ...client,
      revenda: revendaFinal,
      ...firstAsset,
      assets,
      os_number: osNumber,
      status: 'Aguardando',
      action_type: 'Recolha',
      priority,
      retry_suggested_date: indicatedDate || undefined,
      created_by_name: session?.operatorName || 'Admin',
    });

    if (!created?.id) {
      toast.error('Erro ao criar OS. Tente novamente.');
      setLoading(false);
      return;
    }

    await base44.entities.ActivityLog.create({
      action: 'Criou Recolha',
      panel: 'admin',
      operator_name: session?.operatorName || 'Admin',
      access_code: session?.code || '',
      os_number: osNumber,
      details: `Recolha - ${assets.length} ativo(s) para ${client.client_name}`,
    });

    toast.success(`Recolha ${osNumber} criada com sucesso!`);
    setClient({ ...emptyClient, revenda: revendaFinal });
    setAssets([emptyAsset()]);
    setIsUrgent(false);
    setIndicatedDate('');
    setClientFound(false);
    setLoading(false);
    onCreated?.();
  };

  return (
    <div className="bg-card rounded-2xl border p-6 space-y-6">
      <h3 className="font-bold text-lg">Nova Recolha</h3>

      {/* Dados do Cliente */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Dados do Cliente</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Código Cliente</Label>
            <div className="relative">
              <Input
                placeholder="Ex: 0001-8085"
                value={client.client_code}
                onChange={e => handleCodeChange(e.target.value)}
                className={clientFound ? 'border-green-400 bg-green-50' : ''}
              />
              {searching && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />}
              {!searching && clientFound && <Search className="absolute right-3 top-2.5 w-4 h-4 text-green-600" />}
            </div>
            {clientFound && <p className="text-xs text-green-600 font-medium">✓ Cliente encontrado na base</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente *</Label>
            <Input placeholder="Nome do cliente" value={client.client_name} onChange={e => setClientField('client_name', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPF/CNPJ</Label>
            <Input placeholder="00.000.000/0000-00" value={client.cnpj} onChange={e => setClientField('cnpj', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Razão Social</Label>
            <Input placeholder="Razão Social" value={client.razao_social} onChange={e => setClientField('razao_social', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fantasia</Label>
            <Input placeholder="Nome Fantasia" value={client.fantasia} onChange={e => setClientField('fantasia', e.target.value)} />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço</Label>
            <Input placeholder="Endereço completo" value={client.client_address} onChange={e => setClientField('client_address', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telefone</Label>
            <Input placeholder="(00) 00000-0000" value={client.client_phone} onChange={e => setClientField('client_phone', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Setor</Label>
            <Input placeholder="Ex: 101" value={client.setor} onChange={e => setClientField('setor', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Revenda</Label>
            <Input placeholder="Revenda/Distribuidor" value={client.revenda} readOnly={!!sessionRevenda} className={sessionRevenda ? 'bg-muted/50' : ''} onChange={e => !sessionRevenda && setClientField('revenda', e.target.value)} />
            {sessionRevenda && <p className="text-xs text-muted-foreground">Definido pela sua sessão: <b>{sessionRevenda}</b></p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data Indicada para Recolha</Label>
            <Input type="date" value={indicatedDate} onChange={e => setIndicatedDate(e.target.value)} />
          </div>

          <div className="space-y-1.5 flex flex-col justify-center">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prioridade</Label>
            <div className="flex items-center gap-2 h-9">
              <Checkbox
                id="urgente"
                checked={isUrgent}
                onCheckedChange={setIsUrgent}
              />
              <label htmlFor="urgente" className="text-sm font-medium cursor-pointer text-red-600">Urgente</label>
            </div>
          </div>
        </div>
      </div>

      {/* Ativos */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Ativos para Recolha</p>
        <div className="space-y-3">
          {assets.map((asset, i) => (
            <AssetRow
              key={i}
              index={i}
              asset={asset}
              onChange={handleAssetChange}
              onRemove={handleRemoveAsset}
              showRemove={assets.length > 1}
            />
          ))}
        </div>
        <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={handleAddAsset}>
          <PlusCircle className="w-4 h-4" />
          Adicionar Ativo
        </Button>
      </div>

      <Button onClick={handleSubmit} disabled={loading} className="w-full h-11 font-semibold">
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <><Plus className="w-4 h-4 mr-2" /> Criar Recolha {assets.length > 1 ? `(${assets.length} ativos)` : ''}</>
        }
      </Button>
    </div>
  );
}
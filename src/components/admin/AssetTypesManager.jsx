import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Plus, Trash2, Loader2, Package, Tag, ToggleLeft, ToggleRight, X, Bookmark } from 'lucide-react';

export default function AssetTypesManager() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newBrand, setNewBrand] = useState('');
  const [editingBrands, setEditingBrands] = useState(null);
  const [saving, setSaving] = useState(false);

  // Marcas globais
  const [newGlobalBrand, setNewGlobalBrand] = useState('');
  const [savingBrand, setSavingBrand] = useState(false);

  const { data: globalBrands = [] } = useQuery({
    queryKey: ['asset-brands'],
    queryFn: () => base44.entities.AssetBrand.list('name'),
  });

  const handleCreateBrandGlobal = async () => {
    if (!newGlobalBrand.trim()) { toast.error('Informe o nome da marca'); return; }
    setSavingBrand(true);
    await base44.entities.AssetBrand.create({ name: newGlobalBrand.trim(), is_active: true });
    toast.success('Marca cadastrada!');
    setNewGlobalBrand('');
    queryClient.invalidateQueries({ queryKey: ['asset-brands'] });
    setSavingBrand(false);
  };

  const handleDeleteBrandGlobal = async (id) => {
    await base44.entities.AssetBrand.delete(id);
    toast.success('Marca removida');
    queryClient.invalidateQueries({ queryKey: ['asset-brands'] });
  };

  const handleToggleBrandGlobal = async (item) => {
    await base44.entities.AssetBrand.update(item.id, { is_active: !item.is_active });
    queryClient.invalidateQueries({ queryKey: ['asset-brands'] });
  };

  const { data: assetTypes = [], isLoading } = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => base44.entities.AssetType.list('name'),
  });

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Informe o nome do tipo'); return; }
    setSaving(true);
    await base44.entities.AssetType.create({ name: newName.trim(), brands: [], is_active: true });
    toast.success('Tipo cadastrado!');
    setNewName('');
    queryClient.invalidateQueries({ queryKey: ['asset-types'] });
    setSaving(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.AssetType.delete(id);
    toast.success('Tipo removido');
    queryClient.invalidateQueries({ queryKey: ['asset-types'] });
  };

  const handleToggle = async (item) => {
    await base44.entities.AssetType.update(item.id, { is_active: !item.is_active });
    queryClient.invalidateQueries({ queryKey: ['asset-types'] });
  };

  const handleAddBrand = async (item) => {
    if (!newBrand.trim()) return;
    const brands = [...(item.brands || []), newBrand.trim()];
    await base44.entities.AssetType.update(item.id, { brands });
    setNewBrand('');
    queryClient.invalidateQueries({ queryKey: ['asset-types'] });
  };

  const handleRemoveBrand = async (item, brand) => {
    const brands = (item.brands || []).filter(b => b !== brand);
    await base44.entities.AssetType.update(item.id, { brands });
    queryClient.invalidateQueries({ queryKey: ['asset-types'] });
  };

  return (
    <div className="space-y-6">
      {/* ===== SEÇÃO: MARCAS GLOBAIS ===== */}
      <div className="bg-card rounded-2xl border p-5 space-y-4">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-primary" /> Cadastrar Nova Marca
        </h3>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome da Marca</Label>
            <Input
              placeholder="Ex: Heineken, Devassa, Amstel..."
              value={newGlobalBrand}
              onChange={e => setNewGlobalBrand(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateBrandGlobal()}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreateBrandGlobal} disabled={savingBrand} className="gap-2 h-9">
              {savingBrand ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border p-5 space-y-3">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-primary" /> Marcas Cadastradas ({globalBrands.length})
        </h3>
        {globalBrands.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhuma marca cadastrada ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {globalBrands.map(item => (
              <div key={item.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-sm font-medium ${item.is_active ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-muted/30 border-border text-muted-foreground opacity-60'}`}>
                <span>{item.name}</span>
                <button onClick={() => handleToggleBrandGlobal(item)} title={item.is_active ? 'Desativar' : 'Ativar'} className="hover:opacity-70">
                  {item.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                </button>
                <button onClick={() => handleDeleteBrandGlobal(item.id)} className="hover:text-red-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== SEÇÃO: TIPOS DE ATIVO ===== */}
      {/* Formulário de novo tipo */}
      <div className="bg-card rounded-2xl border p-5 space-y-4">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" /> Cadastrar Novo Tipo de Ativo
        </h3>
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome do Tipo</Label>
            <Input
              placeholder="Ex: Refrigerador Vertical, Chopeira..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreate} disabled={saving} className="gap-2 h-9">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Adicionar
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de tipos cadastrados */}
      <div className="bg-card rounded-2xl border p-5 space-y-3">
        <h3 className="font-bold text-base flex items-center gap-2">
          <Tag className="w-4 h-4 text-primary" /> Tipos Cadastrados ({assetTypes.length})
        </h3>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : assetTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nenhum tipo cadastrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {assetTypes.map(item => (
              <div key={item.id} className={`rounded-xl border p-4 space-y-3 ${item.is_active ? 'bg-muted/20' : 'bg-muted/5 opacity-60'}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">{item.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {item.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => handleToggle(item)} title={item.is_active ? 'Desativar' : 'Ativar'}>
                      {item.is_active ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => handleDelete(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Marcas deste tipo */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marcas</p>
                  <div className="flex flex-wrap gap-2">
                    {(item.brands || []).map(brand => (
                      <span key={brand} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg">
                        {brand}
                        <button onClick={() => handleRemoveBrand(item, brand)} className="hover:text-red-500 transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {(item.brands || []).length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhuma marca cadastrada</span>
                    )}
                  </div>
                  {editingBrands === item.id ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nome da marca..."
                        value={newBrand}
                        onChange={e => setNewBrand(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { handleAddBrand(item); } if (e.key === 'Escape') setEditingBrands(null); }}
                        className="h-8 text-xs"
                        autoFocus
                      />
                      <Button size="sm" className="h-8 text-xs" onClick={() => handleAddBrand(item)}>
                        <Plus className="w-3 h-3 mr-1" /> Adicionar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingBrands(null)}>Cancelar</Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setEditingBrands(item.id); setNewBrand(''); }}>
                      <Plus className="w-3 h-3" /> Adicionar Marca
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
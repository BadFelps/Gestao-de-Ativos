import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Loader2, Check, Package, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const categoryConfig = {
  peça:    { label: 'Peça',    color: 'bg-blue-100 text-blue-800 border-blue-200',  icon: Package },
  serviço: { label: 'Serviço', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: Wrench },
};

function PartForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '');
  const [category, setCategory] = useState(initial?.category || 'peça');
  const [price, setPrice] = useState(initial?.unit_price ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || price === '' || isNaN(Number(price)) || Number(price) < 0) {
      toast.error('Preencha nome e valor válido.');
      return;
    }
    setSaving(true);
    await onSave({ name: name.trim(), category, unit_price: Number(price), is_active: true });
    setSaving(false);
  };

  return (
    <Card className="border border-primary/30 bg-accent/20">
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Nome *</Label>
            <Input placeholder="Ex: Compressor, Mão de obra..." value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Categoria</Label>
            <div className="flex gap-2">
              {(['peça', 'serviço']).map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    category === c ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background hover:bg-muted/50'
                  }`}
                >
                  {categoryConfig[c].label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Valor (R$) *</Label>
            <Input type="number" step="0.01" min="0" placeholder="0,00" value={price} onChange={e => setPrice(e.target.value)} />
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="flex-1" onClick={onCancel}>Cancelar</Button>
          <Button type="button" size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Check className="w-3.5 h-3.5 mr-1" />Salvar</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MaintenancePartsManager() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { fetchParts(); }, []);

  const fetchParts = async () => {
    setLoading(true);
    const data = await base44.entities.MaintenancePart.list('name', 200);
    setParts(data);
    setLoading(false);
  };

  const handleCreate = async (data) => {
    await base44.entities.MaintenancePart.create(data);
    toast.success('Item cadastrado!');
    setShowForm(false);
    fetchParts();
  };

  const handleUpdate = async (data) => {
    await base44.entities.MaintenancePart.update(editing.id, data);
    toast.success('Item atualizado!');
    setEditing(null);
    fetchParts();
  };

  const handleDelete = async (part) => {
    if (!window.confirm(`Remover "${part.name}"?`)) return;
    await base44.entities.MaintenancePart.delete(part.id);
    toast.success('Item removido!');
    fetchParts();
  };

  const grouped = { peça: parts.filter(p => p.category === 'peça'), serviço: parts.filter(p => p.category === 'serviço') };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm">Base de Orçamento</h2>
          <p className="text-xs text-muted-foreground">Peças e serviços disponíveis para orçamentos dos técnicos</p>
        </div>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
          </Button>
        )}
      </div>

      {showForm && <PartForm onSave={handleCreate} onCancel={() => setShowForm(false)} />}

      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />)}</div>
      ) : parts.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma peça ou serviço cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(['peça', 'serviço']).map(cat => grouped[cat].length > 0 && (
            <div key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {categoryConfig[cat].label}s ({grouped[cat].length})
              </h3>
              <div className="space-y-2">
                {grouped[cat].map(part => (
                  editing?.id === part.id ? (
                    <PartForm key={part.id} initial={part} onSave={handleUpdate} onCancel={() => setEditing(null)} />
                  ) : (
                    <Card key={part.id} className="border">
                      <CardContent className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge className={`text-xs border shrink-0 ${categoryConfig[part.category]?.color}`}>
                            {categoryConfig[part.category]?.label}
                          </Badge>
                          <span className="text-sm font-medium truncate">{part.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-semibold text-green-700">
                            R$ {Number(part.unit_price).toFixed(2).replace('.', ',')}
                          </span>
                          <button onClick={() => setEditing(part)} className="p-1 rounded hover:bg-muted transition-colors">
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          <button onClick={() => handleDelete(part)} className="p-1 rounded hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
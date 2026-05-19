import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Fallback caso não haja tipos cadastrados no banco
const DEFAULT_ASSET_TYPES = [
  'Refrigerador Vertical', 'Refrigerador Horizontal',
  'Jogos de Mesa Madeira', 'Jogos de Mesa Plástica',
  'Mesas Plásticas', 'Mesas de Madeira', 'Cadeiras Plásticas', 'Cadeiras de Madeira',
  'Caixa Térmica', 'Barril 30L', 'Barril 50L', 'Cilindro', 'Chopeira', 'Outro'
];
const DEFAULT_BRANDS = ['Devassa', 'Heineken', 'Amstel', 'Schin'];

export default function AssetRow({ index, asset, onChange, onRemove, showRemove }) {
  const set = (key, val) => onChange(index, { ...asset, [key]: val });

  const { data: assetTypes = [] } = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => base44.entities.AssetType.list('name'),
    staleTime: 60000,
  });

  const activeTypes = assetTypes.filter(t => t.is_active);
  const typeNames = activeTypes.length > 0 ? activeTypes.map(t => t.name) : DEFAULT_ASSET_TYPES;

  const { data: globalBrands = [] } = useQuery({
    queryKey: ['asset-brands'],
    queryFn: () => base44.entities.AssetBrand.list('name'),
    staleTime: 60000,
  });

  // Usa marcas globais cadastradas, ou fallback padrão se não houver nenhuma
  const activeBrands = globalBrands.filter(b => b.is_active).map(b => b.name);
  const brands = activeBrands.length > 0 ? activeBrands : DEFAULT_BRANDS;

  return (
    <div className="border rounded-xl p-4 bg-muted/30 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Ativo {index + 1}</span>
        {showRemove && (
          <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" onClick={() => onRemove(index)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Tipo */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo *</Label>
          <Select value={asset.asset_type} onValueChange={v => set('asset_type', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {typeNames.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Marca */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Marca</Label>
          <Select value={asset.asset_brand} onValueChange={v => set('asset_brand', v)}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>
              {brands.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* CEV */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">CEV</Label>
          <Input
            placeholder="Ex: CEV-12345"
            value={asset.asset_cev || ''}
            onChange={e => set('asset_cev', e.target.value)}
          />
        </div>

        {/* Patrimônio */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Patrimônio</Label>
          <Input
            placeholder="Ex: PAT-00123"
            value={asset.asset_patrimonio || ''}
            onChange={e => set('asset_patrimonio', e.target.value)}
          />
        </div>

        {/* Quantidade */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantidade</Label>
          <Input
            type="number"
            min="1"
            placeholder="1"
            value={asset.quantity}
            onChange={e => set('quantity', parseInt(e.target.value) || 1)}
          />
        </div>

        {/* Observação */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observação</Label>
          <Input
            placeholder="Observações sobre este ativo..."
            value={asset.asset_description}
            onChange={e => set('asset_description', e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
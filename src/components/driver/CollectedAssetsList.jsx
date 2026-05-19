import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CheckSquare, Square, AlertTriangle } from 'lucide-react';

const PLAQUETA_TYPES = ['Chopeira', 'Refrigerador Vertical', 'Refrigerador Horizontal'];
const PATRIMONIO_TYPES = ['Chopeira', 'Refrigerador Vertical', 'Refrigerador Horizontal'];

export default function CollectedAssetsList({ assets, collectedAssets, onChange }) {
  // assets: lista de ativos da OS (do administrativo)
  // collectedAssets: { [asset_type + index]: { checked, qty, plaqueta } }

  const toggleCheck = (key) => {
    const current = collectedAssets[key] || {};
    onChange({ ...collectedAssets, [key]: { ...current, checked: !current.checked, qty: current.qty || 0 } });
  };

  const updateField = (key, field, value) => {
    const current = collectedAssets[key] || { checked: true };
    onChange({ ...collectedAssets, [key]: { ...current, [field]: value } });
  };

  const normalizedAssets = assets?.length > 0
    ? assets
    : [{ asset_type: 'Ativo', quantity: 1 }];

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">O que você recolheu?</p>
      {normalizedAssets.map((asset, i) => {
        const key = `${asset.asset_type}-${i}`;
        const state = collectedAssets[key] || {};
        const checked = !!state.checked;
        const needsPlaqueta = PLAQUETA_TYPES.includes(asset.asset_type);
        const expectedPatrimonio = asset.asset_patrimonio || asset.asset_serial || '';

        return (
          <div key={key} className={`rounded-xl border-2 p-3 space-y-2 transition-all ${checked ? 'border-green-400 bg-green-50' : 'border-muted bg-card'}`}>
            <button
              type="button"
              onClick={() => toggleCheck(key)}
              className="flex items-center gap-3 w-full text-left"
            >
              {checked
                ? <CheckSquare className="w-5 h-5 text-green-600 shrink-0" />
                : <Square className="w-5 h-5 text-muted-foreground shrink-0" />}
              <div className="flex-1">
                <span className="font-semibold text-sm">{asset.asset_type}</span>
                {asset.asset_brand && <span className="text-xs text-muted-foreground ml-1">· {asset.asset_brand}</span>}
              </div>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Prev: <strong>{asset.quantity || 1}</strong> un.
              </span>
            </button>

            {checked && (
              <div className="pl-8 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Qtd. recolhida</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={state.qty || ''}
                    onChange={e => updateField(key, 'qty', parseInt(e.target.value) || 0)}
                    className="h-9 text-base font-bold text-center w-24"
                  />
                </div>
                {needsPlaqueta && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Nº do Patrimônio
                      {expectedPatrimonio && <span className="ml-1 text-blue-600 font-normal normal-case">(esperado: {expectedPatrimonio})</span>}
                    </Label>
                    <Input
                      type="text"
                      placeholder="Ex: PAT-00123"
                      value={state.plaqueta || ''}
                      onChange={e => updateField(key, 'plaqueta', e.target.value)}
                      className={`h-9 text-sm ${state.plaqueta && expectedPatrimonio && state.plaqueta !== expectedPatrimonio ? 'border-orange-400 bg-orange-50' : ''}`}
                    />
                    {state.plaqueta && expectedPatrimonio && state.plaqueta !== expectedPatrimonio && (
                      <p className="text-xs text-orange-600 font-semibold">⚠️ Patrimônio diferente do esperado!</p>
                    )}
                  </div>
                )}

                {/* Material Danificado/Faltando */}
                <div className="border-t border-orange-200 pt-2 mt-1">
                  <button
                    type="button"
                    onClick={() => updateField(key, 'showDamage', !state.showDamage)}
                    className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-all ${state.showDamage ? 'bg-orange-100 text-orange-700' : 'text-muted-foreground hover:text-orange-600 hover:bg-orange-50'}`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Material Danificado/Faltando
                  </button>
                  {state.showDamage && (
                    <div className="mt-2 space-y-2 bg-orange-50 rounded-lg p-2 border border-orange-200">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Qtd. danificada/faltando</Label>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={state.damageQty || ''}
                          onChange={e => updateField(key, 'damageQty', parseInt(e.target.value) || 0)}
                          className="h-8 text-sm w-24 text-center border-orange-300"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-orange-700 uppercase tracking-wide">Descrição do problema</Label>
                        <Textarea
                          placeholder="Descreva o dano ou o que está faltando..."
                          value={state.damageDescription || ''}
                          onChange={e => updateField(key, 'damageDescription', e.target.value)}
                          className="text-xs min-h-[60px] border-orange-300"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
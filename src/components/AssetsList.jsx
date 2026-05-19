import { Package } from 'lucide-react';

// Exibe todos os ativos de uma OS (campo assets[] ou fallback para campos únicos)
export default function AssetsList({ order }) {
  const assets = order.assets?.length > 0
    ? order.assets
    : [{ asset_type: order.asset_type, asset_brand: order.asset_brand, asset_serial: order.asset_serial, quantity: order.quantity, asset_description: order.asset_description }];

  if (!assets[0]?.asset_type) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Package className="w-3 h-3" /> Ativos ({assets.length})
      </p>
      <div className="space-y-1">
        {assets.map((a, i) => (
          <div key={i} className="text-xs bg-muted/40 rounded-lg px-3 py-2 flex flex-wrap gap-x-3 gap-y-0.5">
            <span className="font-medium">{a.asset_type}</span>
            {a.asset_brand && <span className="text-muted-foreground">{a.asset_brand}</span>}
            {a.asset_serial && <span className="text-muted-foreground font-mono">CEV: {a.asset_serial}</span>}
            {a.quantity > 1 && <span className="text-muted-foreground">Qtd: {a.quantity}</span>}
            {a.asset_description && <span className="text-muted-foreground w-full">{a.asset_description}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
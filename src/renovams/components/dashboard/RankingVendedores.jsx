import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const medalColors = ['text-yellow-500', 'text-gray-400', 'text-amber-700'];
const medalBg = ['bg-yellow-50 border-yellow-200', 'bg-gray-50 border-gray-200', 'bg-amber-50 border-amber-200'];
const CODIGOS_VENDEDORES = ['101','102','103','104','105','202','203','204','205','206','207','501','502','503','504','505','506'];

export default function RankingVendedores({ clientes, loading }) {
  const map = {};
  (clientes || []).forEach(c => {
    const cod = c.codigo_vendedor?.trim();
    if (!cod || !CODIGOS_VENDEDORES.includes(cod)) return;
    if (!map[cod]) map[cod] = { codigo: cod, total: 0, validados: 0, divergentes: 0 };
    map[cod].total++;
    if (c.status_validacao === 'validado') map[cod].validados++;
    if (c.status_validacao === 'divergente') map[cod].divergentes++;
  });
  const ranking = Object.values(map)
    .map(v => ({ ...v, pct: v.total > 0 ? Math.round(((v.validados + v.divergentes) / v.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2"><Users className="w-4 h-4" style={{color:'hsl(122,55%,28%)'}} /><CardTitle className="text-base font-semibold">Ranking de Vendedores</CardTitle></div>
      </CardHeader>
      <CardContent>
        {loading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
        : ranking.length === 0 ? <p className="text-muted-foreground text-sm text-center py-8">Nenhum dado disponível ainda.</p>
        : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {ranking.map((v, i) => (
              <div key={v.codigo} className={cn('flex items-center gap-4 p-3 rounded-xl border', i < 3 ? medalBg[i] : 'bg-muted/30 border-border')}>
                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0', i < 3 ? medalColors[i] : 'text-muted-foreground')}>#{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">Vendedor {v.codigo}</p>
                  <p className="text-xs text-muted-foreground">{v.validados} valid. · {v.divergentes} diverg. · {v.total} total</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold" style={{color:'hsl(122,55%,28%)'}}>{v.pct}%</p>
                  <div className="w-24 bg-muted rounded-full h-1.5 mt-1"><div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${v.pct}%`, background:'hsl(122,55%,28%)' }} /></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
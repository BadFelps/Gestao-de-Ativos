import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProgressoGeral({ validados, divergentes, total, loading }) {
  const concluidos = validados + divergentes;
  const pctConc = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-2"><CardTitle className="text-base font-semibold">Progresso Geral da Renovação</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        {loading ? <Skeleton className="h-32 w-full rounded-2xl" /> : (
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-40 h-40 shrink-0">
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(122,55%,28%)" strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - pctConc / 100)}`}
                  strokeLinecap="round" className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{pctConc}%</span>
                <span className="text-xs text-muted-foreground">Visitados</span>
              </div>
            </div>
            <div className="flex-1 space-y-4 w-full">
              {[
                { label: 'Validados sem divergência', value: validados, colorClass: 'bg-green-500', textClass: 'text-green-600' },
                { label: 'Com divergência registrada', value: divergentes, colorClass: 'bg-yellow-400', textClass: 'text-yellow-600' },
                { label: 'Pendentes de visita', value: total - concluidos, colorClass: 'bg-gray-300', textClass: 'text-gray-500' },
              ].map(({ label, value, colorClass, textClass }) => (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-semibold ${textClass}`}>{value} / {total}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className={`${colorClass} h-2 rounded-full transition-all duration-700`}
                      style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
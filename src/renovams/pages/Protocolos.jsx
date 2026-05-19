import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, CheckCircle2, Clock, BarChart2, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function RenovaProtocolos() {
  const [protocolos, setProtocolos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [encerrando, setEncerrando] = useState(null);

  const carregar = async () => {
    setLoading(true);
    const dados = await base44.entities.Protocolo.list('-created_date', 500);
    setProtocolos(dados);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const handleEncerrar = async (p) => {
    if (!window.confirm(`Encerrar protocolo de ${p.fantasia || p.razao_social}?`)) return;
    setEncerrando(p.id);
    await base44.entities.Protocolo.update(p.id, { status: 'encerrado', data_encerramento: new Date().toISOString() });
    if (p.cliente_id) {
      await base44.entities.Cliente.update(p.cliente_id, { documento_renovado: true }).catch(() => {});
    }
    toast.success('Protocolo encerrado! Cliente marcado como Concluído.');
    await carregar();
    setEncerrando(null);
  };

  const rankingVendedor = Object.values(
    protocolos.reduce((acc, p) => {
      const cod = p.codigo_vendedor || 'N/A';
      if (!acc[cod]) acc[cod] = { codigo: cod, total: 0, abertos: 0 };
      acc[cod].total++;
      if (p.status === 'aberto') acc[cod].abertos++;
      return acc;
    }, {})
  ).sort((a, b) => b.abertos - a.abertos);

  const abertos = protocolos.filter(p => p.status === 'aberto');
  const encerrados = protocolos.filter(p => p.status === 'encerrado');

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Protocolos de Renovação</h1>
        <p className="text-muted-foreground text-sm mt-1">Controle de entrega e devolução de documentos</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total', value: protocolos.length, icon: FileText, bg: 'bg-blue-100', iconClass: 'text-blue-600' },
          { label: 'Em Aberto', value: abertos.length, icon: Clock, bg: 'bg-yellow-100', iconClass: 'text-yellow-600', valueClass: 'text-yellow-700' },
          { label: 'Encerrados', value: encerrados.length, icon: CheckCircle2, bg: 'bg-green-100', iconClass: 'text-green-600', valueClass: 'text-green-700' },
        ].map(({ label, value, icon: Icon, bg, iconClass, valueClass }) => (
          <Card key={label} className="border shadow-sm">
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}><Icon className={`w-4 h-4 ${iconClass}`} /></div>
              <div><p className="text-xs text-muted-foreground">{label}</p><p className={`text-xl font-bold ${valueClass || ''}`}>{loading ? '—' : value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>
      {rankingVendedor.length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2"><BarChart2 className="w-4 h-4 text-muted-foreground" /><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Comodatos Protocolados por Vendedor</CardTitle></div>
          </CardHeader>
          <CardContent className="space-y-2">
            {rankingVendedor.map((v, i) => (
              <div key={v.codigo} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5 text-right">{i + 1}.</span>
                <div className="flex items-center gap-1.5 w-24 shrink-0"><User className="w-3 h-3 text-muted-foreground" /><span className="text-sm font-medium">Vend. {v.codigo}</span></div>
                <div className="flex-1 bg-muted rounded-full h-2"><div className="h-2 rounded-full transition-all" style={{ width: `${(v.abertos / (rankingVendedor[0]?.abertos || 1)) * 100}%`, background:'hsl(122,55%,28%)' }} /></div>
                <span className="text-xs text-muted-foreground w-24 text-right">{v.abertos} aberto{v.abertos !== 1 ? 's' : ''} / {v.total} total</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      <Card className="border shadow-sm">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Lista de Protocolos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {loading && [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          {!loading && protocolos.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Nenhum protocolo registrado ainda.</p>}
          {!loading && protocolos.map(p => (
            <div key={p.id} className={cn('rounded-xl border p-4 space-y-1', p.status === 'aberto' ? 'border-yellow-200 bg-yellow-50' : 'border-border bg-muted/20')}>
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-semibold text-sm">{p.fantasia || p.razao_social}</p><p className="text-xs text-muted-foreground">{p.razao_social}</p></div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={p.status === 'aberto' ? 'border-yellow-400 text-yellow-700 bg-yellow-100' : 'border-green-400 text-green-700 bg-green-100'}>
                    {p.status === 'aberto' ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                    {p.status === 'aberto' ? 'Em Aberto' : 'Encerrado'}
                  </Badge>
                  {p.status === 'aberto' && (
                    <Button size="sm" variant="outline" className="border-green-400 text-green-700 hover:bg-green-50 h-7 text-xs" onClick={() => handleEncerrar(p)} disabled={encerrando === p.id}>
                      {encerrando === p.id ? 'Encerrando...' : 'Encerrar'}
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground mt-1">
                {p.codigo_vendedor && <span>Vendedor: <b>{p.codigo_vendedor}</b></span>}
                {p.cev_antigo && <span>CEV ant.: <b>{p.cev_antigo}</b></span>}
                {p.cev_novo && <span>CEV novo: <b>{p.cev_novo}</b></span>}
                {p.entregue_a && <span>Entregue a: <b>{p.entregue_a}</b></span>}
                {p.data_entrega && <span>Data entrega: <b>{new Date(p.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')}</b></span>}
                {p.data_encerramento && <span>Encerrado em: <b>{new Date(p.data_encerramento).toLocaleDateString('pt-BR')}</b></span>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
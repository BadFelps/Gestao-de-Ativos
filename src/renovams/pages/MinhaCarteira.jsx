import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLocalAuth } from '@/lib/LocalAuthContext';
import { Search, CheckCircle2, AlertTriangle, Clock, ChevronRight, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

const statusConfig = {
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-gray-100 text-gray-600 border-gray-200' },
  validado: { label: 'Validado', icon: CheckCircle2, className: 'bg-green-100 text-green-700 border-green-200' },
  divergente: { label: 'Divergente', icon: AlertTriangle, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
};

export default function RenovaMinhaCarteira() {
  const { setor } = useLocalAuth();
  const [user, setUser] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterDia, setFilterDia] = useState('todos');
  const navigate = useNavigate();

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        if (setor) {
          const data = await base44.entities.Cliente.filter({ codigo_vendedor: setor }, 'created_date', 500);
          setClientes(data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [setor]);

  const diasVisita = [...new Set(clientes.map(c => c.dia_visita).filter(Boolean))].sort();
  const filtered = clientes.filter(c => {
    const matchSearch = !search || c.razao_social?.toLowerCase().includes(search.toLowerCase()) || c.fantasia?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || c.status_validacao === filterStatus;
    const matchDia = filterDia === 'todos' || c.dia_visita === filterDia;
    return matchSearch && matchStatus && matchDia;
  });

  const total = clientes.length;
  const concluidos = clientes.filter(c => c.status_validacao !== 'pendente').length;
  const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0;

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div>
         <h1 className="text-2xl font-bold text-foreground">Minha Renovação</h1>
         <p className="text-muted-foreground text-sm mt-1">Clientes do Vendedor {setor}</p>
       </div>
      <div className="rounded-2xl p-4 space-y-2" style={{background:'hsl(122,55%,28%,0.06)', border:'1px solid hsl(122,55%,28%,0.2)'}}>
        <div className="flex justify-between text-sm">
          <span className="font-medium" style={{color:'hsl(122,55%,28%)'}}>Seu progresso</span>
          <span className="font-bold" style={{color:'hsl(122,55%,28%)'}}>{pct}%</span>
        </div>
        <Progress value={pct} className="h-2" />
        <p className="text-xs text-muted-foreground">{concluidos} de {total} clientes renovados</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar cliente..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterDia} onValueChange={setFilterDia}>
          <SelectTrigger className="w-44"><Calendar className="w-4 h-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Dia de visita" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os dias</SelectItem>
            {diasVisita.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="validado">Validado</SelectItem>
            <SelectItem value="divergente">Divergente</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        {loading ? Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        : filtered.map(c => {
            const st = statusConfig[c.status_validacao] || statusConfig.pendente;
            const Icon = st.icon;
            return (
              <div key={c.id} onClick={() => navigate(`/renovams/clientes/${c.id}`)} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-md transition-all cursor-pointer group">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center border shrink-0', st.className)}><Icon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground truncate">{c.fantasia || c.razao_social}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.endereco || c.razao_social}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-muted-foreground">{c.materiais?.length || 0} materiais em comodato</p>
                    {c.dia_visita && <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {c.dia_visita}</p>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </div>
            );
          })}
        {!loading && filtered.length === 0 && <p className="text-center text-muted-foreground py-12">Nenhum cliente encontrado.</p>}
      </div>
    </div>
  );
}
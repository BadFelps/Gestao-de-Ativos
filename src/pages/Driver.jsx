import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PanelAccessGate from '@/components/PanelAccessGate';
import PanelTop from '@/components/PanelTop';
import DriverTask from '@/components/driver/DriverTask';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RefreshCw, Route, CheckCircle2, AlertTriangle, Calendar, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import PanelManual from '@/components/PanelManual';
import { useAccess } from '@/lib/accessContext';

export default function Driver() {
  return (
    <PanelAccessGate panel="driver">
      <DriverContent />
    </PanelAccessGate>
  );
}

function DriverContent() {
   const { getSession } = useAccess();
   const session = getSession('driver');
   const queryClient = useQueryClient();
   const today = format(new Date(), 'yyyy-MM-dd');
   const [dateFilter, setDateFilter] = useState(today);

   const { data: orders = [], isLoading } = useQuery({
     queryKey: ['driver-orders', session?.operatorName],
     queryFn: async () => {
       if (!session?.operatorName) return [];
       return base44.entities.ServiceOrder.filter({ assigned_driver: session.operatorName }, '-created_date', 100);
     },
     enabled: !!session?.operatorName,
     refetchInterval: 10000,
   });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['driver-orders'] });

  const isToday = dateFilter === today;

  const matchesDate = (o) =>
    o.route_date === dateFilter ||
    o.assigned_date === dateFilter ||
    (!o.route_date && !o.assigned_date && isToday);

  const active = orders.filter(o =>
    ['Atribuído', 'Em Rota', 'No Cliente'].includes(o.status) &&
    (isToday || matchesDate(o))
  );
  const completed = orders.filter(o =>
    ['Concluído', 'Concluído com Ocorrência'].includes(o.status) &&
    matchesDate(o)
  );

  return (
    <div className="min-h-screen bg-background">
      <PanelTop panel="driver" title="Minha Rota" />
      <div className="w-full max-w-lg mx-auto px-3 py-4 space-y-4">

          <Tabs defaultValue="rota">
            <TabsList className="w-full">
              <TabsTrigger value="rota" className="flex-1 gap-2"><Route className="w-4 h-4" /> Minha Rota</TabsTrigger>
              <TabsTrigger value="manual" className="flex-1 gap-2"><BookOpen className="w-4 h-4" /> Manual</TabsTrigger>
            </TabsList>

            <TabsContent value="rota" className="space-y-4 mt-4">
              {/* Date filter + refresh */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 bg-card border rounded-lg px-3 h-10">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    className="border-0 shadow-none h-8 p-0 text-sm focus-visible:ring-0"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={refresh} className="gap-1.5 h-10 shrink-0">
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Atualizar</span>
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-card rounded-xl border p-3 text-center">
                  <Route className="w-5 h-5 mx-auto text-blue-500 mb-1" />
                  <div className="text-xl font-bold">{active.length}</div>
                  <div className="text-xs text-muted-foreground">Ativas</div>
                </div>
                <div className="bg-card rounded-xl border p-3 text-center">
                  <CheckCircle2 className="w-5 h-5 mx-auto text-green-500 mb-1" />
                  <div className="text-xl font-bold">{completed.length}</div>
                  <div className="text-xs text-muted-foreground">Feitas</div>
                </div>
                <div className="bg-card rounded-xl border p-3 text-center">
                  <AlertTriangle className="w-5 h-5 mx-auto text-orange-500 mb-1" />
                  <div className="text-xl font-bold">{orders.filter(o => o.status === 'Concluído com Ocorrência').length}</div>
                  <div className="text-xs text-muted-foreground">Ocorrências</div>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : active.length === 0 && completed.length === 0 ? (
                <div className="bg-card rounded-2xl border p-10 text-center text-muted-foreground text-sm">
                  Nenhuma tarefa encontrada
                </div>
              ) : (
                <div className="space-y-3">
                  {active.length > 0 && (
                    <>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                        Pendentes ({active.length})
                      </h3>
                      {active.map(o => <DriverTask key={o.id} order={o} onUpdated={refresh} />)}
                    </>
                  )}
                  {completed.length > 0 && (
                    <>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-4 px-1">
                        Concluídas ({completed.length})
                      </h3>
                      {completed.map(o => <DriverTask key={o.id} order={o} onUpdated={refresh} />)}
                    </>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="mt-4">
              <PanelManual panel="driver" />
            </TabsContent>
          </Tabs>
      </div>
    </div>
  );
}
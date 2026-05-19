import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Truck, Users, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function RouteSummary({ orders }) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [downloading, setDownloading] = useState(false);
  const tableRef = useRef(null);

  const dayOrders = orders.filter(o =>
    o.route_date === selectedDate &&
    o.assigned_driver &&
    ['Atribuído', 'Em Rota', 'No Cliente', 'Aguardando'].includes(o.status)
  );

  const byDriver = dayOrders.reduce((acc, o) => {
    const key = o.assigned_driver;
    if (!acc[key]) acc[key] = { vehicle: o.assigned_vehicle || '', orders: [] };
    acc[key].orders.push(o);
    return acc;
  }, {});

  const handleDownload = async () => {
    if (!tableRef.current) return;
    setDownloading(true);
    const canvas = await html2canvas(tableRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const link = document.createElement('a');
    link.download = `rota-${selectedDate}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setDownloading(false);
  };

  const formatDate = (d) => {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Data da Rota:</span>
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="border-0 shadow-none h-7 p-0 text-sm w-36 focus-visible:ring-0"
          />
        </div>
        <Button size="sm" variant="outline" onClick={handleDownload} disabled={downloading || Object.keys(byDriver).length === 0} className="gap-2">
          {downloading
            ? <div className="w-3 h-3 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            : <Download className="w-4 h-4" />}
          Baixar como Imagem
        </Button>
        <div className="ml-auto flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {Object.keys(byDriver).length} motorista(s)</span>
          <span className="flex items-center gap-1"><Truck className="w-4 h-4" /> {dayOrders.length} OS</span>
        </div>
      </div>

      {Object.keys(byDriver).length === 0 ? (
        <div className="bg-card rounded-xl border p-10 text-center text-muted-foreground">
          <Truck className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Nenhuma rota atribuída para {formatDate(selectedDate)}</p>
        </div>
      ) : (
        <div ref={tableRef} className="bg-white rounded-xl overflow-hidden border border-slate-200 font-inter">
          {/* Header */}
          <div className="bg-slate-700 text-white text-xs font-bold px-0 py-0">
            <div className="grid grid-cols-[180px_1fr_60px] divide-x divide-slate-600">
              <div className="px-4 py-2.5">MOTORISTA</div>
              <div className="px-4 py-2.5">CLIENTES E ATIVOS</div>
              <div className="px-4 py-2.5 text-center">OS</div>
            </div>
          </div>

          {/* Driver rows */}
          {Object.entries(byDriver).map(([driver, data], di) => (
            <div key={driver} className={`border-b last:border-0 ${di % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
              <div className="grid grid-cols-[180px_1fr_60px] divide-x divide-slate-200 min-h-[60px]">
                {/* Driver */}
                <div className="px-4 py-3 flex items-center">
                  <div className="font-bold text-sm text-slate-800">{driver}</div>
                </div>
                {/* Clients */}
                <div className="px-4 py-3 space-y-2">
                  {data.orders.map((o, oi) => {
                    const assets = o.assets?.length > 0
                      ? o.assets
                      : (o.asset_type ? [{ asset_type: o.asset_type, asset_brand: o.asset_brand, asset_serial: o.asset_serial, quantity: o.quantity }] : []);
                    return (
                      <div key={oi} className="text-xs border-b border-dashed border-slate-200 last:border-0 pb-1.5 last:pb-0">
                        <div className="flex items-center gap-2">
                          {o.client_code && (
                            <span className="font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs shrink-0">{o.client_code}</span>
                          )}
                          <span className="font-semibold text-slate-800">{o.client_name}</span>
                          {o.retry_count > 0 && (
                            <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded border border-orange-200 shrink-0">
                              Retent. #{o.retry_count}
                            </span>
                          )}
                        </div>
                        {o.client_address && (
                          <div className="text-slate-500 mt-0.5 ml-0">{o.client_address}</div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {assets.filter(a => a.asset_type).map((a, ai) => (
                            <span key={ai} className="bg-blue-50 text-blue-700 border border-blue-100 rounded px-1.5 py-0.5 text-xs font-medium">
                              {a.asset_type}
                              {a.asset_brand ? ` · ${a.asset_brand}` : ''}
                              {a.asset_serial ? ` · CEV: ${a.asset_serial}` : ''}
                              {(a.quantity > 1) ? ` · Qtd: ${a.quantity}` : ''}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Count */}
                <div className="px-4 py-3 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-xl font-extrabold text-primary">{data.orders.length}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="bg-slate-100 px-4 py-2 text-xs text-slate-500 text-right border-t">
            Rota do dia {formatDate(selectedDate)} · Gerado em {new Date().toLocaleString('pt-BR')}
          </div>
        </div>
      )}
    </div>
  );
}
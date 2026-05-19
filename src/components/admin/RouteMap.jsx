import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MapPin, Calendar, Users } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icons for leaflet in vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const driverColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function createColoredIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
      <div style="width:8px;height:8px;background:white;border-radius:50%;"></div>
    </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export default function RouteMap({ orders }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-map'],
    queryFn: () => base44.entities.ClientBase.list('-created_date', 2000),
  });

  // Normalize PDV code: remove hyphens, spaces for flexible matching
  const normCode = (code) => code ? code.toString().trim().replace(/[-\s]/g, '') : '';

  // Map client_code -> client data AND name maps for fallback
  const { clientByCode, clientByCodeNorm, clientByFantasia, clientByRazao } = useMemo(() => {
    const byCode = {};
    const byCodeNorm = {};
    const byFantasia = {};
    const byRazao = {};
    clients.forEach(c => {
      if (c.pdv_code) {
        byCode[c.pdv_code.trim()] = c;
        byCodeNorm[normCode(c.pdv_code)] = c;
      }
      if (c.fantasia) byFantasia[c.fantasia.trim().toLowerCase()] = c;
      if (c.razao_social) byRazao[c.razao_social.trim().toLowerCase()] = c;
    });
    return { clientByCode: byCode, clientByCodeNorm: byCodeNorm, clientByFantasia: byFantasia, clientByRazao: byRazao };
  }, [clients]);

  const findClient = (order) => {
    if (order.client_code) {
      // 1. exact match
      const c1 = clientByCode[order.client_code.trim()];
      if (c1) return c1;
      // 2. normalized match (strips hyphens + leading zeros)
      const c2 = clientByCodeNorm[normCode(order.client_code)];
      if (c2) return c2;
    }
    // 3. by fantasia / razao social name
    if (order.client_name) {
      const key = order.client_name.trim().toLowerCase();
      const c = clientByFantasia[key] || clientByRazao[key];
      if (c) return c;
    }
    return null;
  };

  // Filter orders for selected date that have a route
  const dateOrders = useMemo(() =>
    orders.filter(o => o.route_date === selectedDate && o.assigned_driver),
  [orders, selectedDate]);

  // Get unique drivers and assign colors
  const drivers = useMemo(() => [...new Set(dateOrders.map(o => o.assigned_driver))], [dateOrders]);
  const driverColorMap = useMemo(() => {
    const m = {};
    drivers.forEach((d, i) => { m[d] = driverColors[i % driverColors.length]; });
    return m;
  }, [drivers]);

  // Build points with coords
  const points = useMemo(() =>
    dateOrders.map(o => {
      const client = findClient(o);
      const lat = parseFloat(client?.latitude);
      const lng = parseFloat(client?.longitude);
      return { ...o, lat: isNaN(lat) ? null : lat, lng: isNaN(lng) ? null : lng, _clientFound: !!client };
    }),
  [dateOrders, clientByCode, clientByCodeNorm, clientByFantasia, clientByRazao]);

  const mappedPoints = points.filter(p => p.lat && p.lng);
  const unmappedCount = points.length - mappedPoints.length;

  const center = mappedPoints.length > 0
    ? [mappedPoints.reduce((s, p) => s + p.lat, 0) / mappedPoints.length, mappedPoints.reduce((s, p) => s + p.lng, 0) / mappedPoints.length]
    : [-9.4, -40.5]; // fallback centro BA/PE

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <label className="text-sm font-medium">Data da Rota:</label>
          <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-40 h-8 text-sm" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          {mappedPoints.length} ponto(s) no mapa
          {unmappedCount > 0 && <span className="text-orange-600">• {unmappedCount} sem coordenada</span>}
          <span className="text-xs opacity-60">({clients.length} clientes carregados)</span>
        </div>
      </div>

      {/* Driver legend */}
      {drivers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {drivers.map(d => (
            <div key={d} className="flex items-center gap-1.5 bg-card border rounded-full px-3 py-1">
              <div className="w-3 h-3 rounded-full" style={{ background: driverColorMap[d] }} />
              <span className="text-xs font-medium">{d}</span>
              <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                {dateOrders.filter(o => o.assigned_driver === d).length}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Map */}
      {mappedPoints.length === 0 ? (
        <div className="bg-muted/30 border rounded-2xl h-96 flex items-center justify-center text-muted-foreground text-sm">
          <div className="text-center">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhuma OS com coordenada para {selectedDate}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border" style={{ height: '500px' }}>
          <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mappedPoints.map(p => (
              <Marker key={p.id} position={[p.lat, p.lng]} icon={createColoredIcon(driverColorMap[p.assigned_driver] || '#666')}>
                <Popup>
                  <div className="text-sm space-y-1 min-w-[180px]">
                    <div className="font-bold text-primary">{p.os_number}</div>
                    <div className="font-semibold">{p.client_name}</div>
                    {p.client_address && <div className="text-xs text-gray-500">{p.client_address}</div>}
                    <div className="text-xs">🚛 <strong>{p.assigned_driver}</strong></div>
                    {p.assets?.length > 0 && (
                      <div className="text-xs text-gray-600">
                        {p.assets.map((a, i) => <div key={i}>{a.asset_type} {a.asset_brand && `• ${a.asset_brand}`}</div>)}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}

      {/* Unmapped list */}
      {unmappedCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-sm">
          <p className="font-semibold text-orange-800 mb-1">OS sem coordenada (verifique se o PDV/nome do cliente bate com a base):</p>
          <div className="flex flex-wrap gap-2">
            {points.filter(p => !p.lat || !p.lng).map(p => (
              <span key={p.id} className="text-xs bg-white border border-orange-200 rounded-full px-2 py-0.5 text-orange-700">
                {p.os_number} – {p.client_name} {p.client_code ? `(PDV: ${p.client_code})` : '(sem PDV)'}
                {!p._clientFound ? ' ⚠ não encontrado na base' : ' ✓ encontrado, sem lat/lng'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
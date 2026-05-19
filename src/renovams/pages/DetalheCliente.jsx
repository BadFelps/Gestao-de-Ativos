import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useLocalAuth } from '@/lib/LocalAuthContext';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, Clock, Camera, MapPin,
  Package, FileText, Loader2, X, PlayCircle, ChevronRight, Info,
  RotateCcw, Navigation
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusConfig = {
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-gray-100 text-gray-600 border-gray-200' },
  validado: { label: 'Validado', icon: CheckCircle2, className: 'bg-green-100 text-green-700 border-green-200' },
  divergente: { label: 'Divergente', icon: AlertTriangle, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
};

const isRefrigerador = (descricao = '') => /^ref/i.test(descricao.trim());
const isChopeira = (descricao = '') => /^chop/i.test(descricao.trim());
const isEquipamentoControlado = (descricao = '') => isRefrigerador(descricao) || isChopeira(descricao);
const getEquipamentoLabel = (descricao = '') => isChopeira(descricao) ? 'Chopeira' : 'Refrigerador';

export default function RenovaDetalheCliente() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isGestor, isVendedor, codigo_vendedor } = useLocalAuth();
  const [cliente, setCliente] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modoValidacao, setModoValidacao] = useState(false);

  // etapa: 'quantidades' | 'fotos'
  const [etapa, setEtapa] = useState('quantidades');

  const [materiaisValidados, setMateriaisValidados] = useState([]);
  const [observacao, setObservacao] = useState('');
  const [fotos, setFotos] = useState([]); // URLs do storage Base44 (para exibição)
  const [fotosFiles, setFotosFiles] = useState([]); // Files originais (para upload OneDrive)
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [uploadingOneDrive, setUploadingOneDrive] = useState(false);
  const [oneDriveProgress, setOneDriveProgress] = useState({ current: 0, total: 0 });

  const [protocolo, setProtocolo] = useState({ cevNovo: '', entregueA: '', dataEntrega: '' });
  const [salvandoProtocolo, setSalvandoProtocolo] = useState(false);
  const [marcandoDoc, setMarcandoDoc] = useState(false);
  const [resetandoValidacao, setResetandoValidacao] = useState(false);

  const fileInputRef = useRef();

  useEffect(() => {
    base44.entities.Cliente.filter({ id }).then(data => {
      const c = data?.[0] || null;
      setCliente(c);
      if (c) {
        const mats = c.materiais?.map(m => ({
          ...m,
          quantidade_real: 0,
          divergente: false,
        })) || [];
        setMateriaisValidados(c.materiais_validados?.length > 0 ? c.materiais_validados : mats);
        setObservacao(c.observacao_divergencia || '');
        setFotos(c.fotos_visita || []);
      }
      setLoading(false);
    });
  }, [id]);

  const capturarGeoSilencioso = () => new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { timeout: 8000 }
    );
  });

  const handleFotos = async (e) => {
    const files = Array.from(e.target.files);
    setUploadingFotos(true);
    const novasUrls = [];
    for (const f of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      novasUrls.push(file_url);
    }
    setFotos(prev => [...prev, ...novasUrls]);
    // Guarda os Files originais para upload direto ao OneDrive (sem CORS)
    setFotosFiles(prev => [...prev, ...files]);
    setUploadingFotos(false);
    toast.success(`${files.length} foto(s) adicionada(s).`);
  };

  // Comprime um File para base64 JPEG via FileReader + canvas
  const compressToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const maxW = 1024;
        if (width > maxW) { height = Math.round(height * maxW / width); width = maxW; }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.75).split(',')[1]);
      };
      img.onerror = () => reject(new Error('Erro ao processar imagem'));
      img.src = readerEvent.target.result;
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsDataURL(file);
  });

  // Upload das fotos para OneDrive usando Files originais (sem fetch de URL)
  const uploadFotosOneDrive = async (files, codigoCliente) => {
    if (!files || files.length === 0 || !codigoCliente) return;
    setUploadingOneDrive(true);
    setOneDriveProgress({ current: 0, total: files.length });
    for (let i = 0; i < files.length; i++) {
      setOneDriveProgress({ current: i + 1, total: files.length });
      const base64 = await compressToBase64(files[i]);
      const result = await base44.functions.invoke('uploadPhotoRenovaMS', {
        file_base64: base64,
        file_name: `foto_${Date.now()}.jpg`,
        mime_type: 'image/jpeg',
        codigo_cliente: String(codigoCliente),
      });
      const data = result?.data ?? result;
      if (data?.error) console.warn('Erro upload OneDrive:', data.error);
    }
    setUploadingOneDrive(false);
  };

  const handleAvancar = () => {
    // Valida patrimônio obrigatório para equipamentos controlados com qtd > 0
    for (const m of materiaisValidados) {
      if (isEquipamentoControlado(m.descricao) && Number(m.quantidade_real) > 0) {
        const qtd = Number(m.quantidade_real);
        const plaquetas = (m.plaqueta_numeros || '').trim().split(/[\n,;]+/).map(p => p.trim()).filter(Boolean);
        if (plaquetas.length < qtd) {
          const label = getEquipamentoLabel(m.descricao);
          toast.error(`Informe ${qtd} número(s) de patrimônio para "${m.descricao}" (${label}). Você informou ${plaquetas.length}.`);
          return;
        }
      }
    }
    const temDivergencia = materiaisValidados.some(m => Number(m.quantidade_real) !== Number(m.quantidade_base ?? m.quantidade));
    if (temDivergencia && !observacao.trim()) {
      toast.error('Preencha a observação explicando a divergência encontrada.');
      return;
    }
    const upd = materiaisValidados.map(m => ({
      ...m,
      quantidade_base: m.quantidade_base ?? m.quantidade,
      divergente: Number(m.quantidade_real) !== Number(m.quantidade_base ?? m.quantidade),
    }));
    setMateriaisValidados(upd);
    setEtapa('fotos');
  };

  const handleValidar = async () => {
    if (!cliente) return;
    if (fotos.length < 1) { toast.error('É obrigatório anexar pelo menos 1 foto.'); return; }
    setSaving(true);
    const geo = await capturarGeoSilencioso();
    const temDivergencia = materiaisValidados.some(m => m.divergente);
    const statusFinal = temDivergencia ? 'divergente' : 'validado';
    await base44.entities.Cliente.update(id, {
      status_validacao: statusFinal,
      data_validacao: new Date().toISOString(),
      materiais_validados: materiaisValidados,
      observacao_divergencia: observacao,
      fotos_visita: fotos,
      geolocalizacao: geo,
    });
    base44.functions.invoke('notificarValidacao', {
      cliente_id: id,
      razao_social: cliente.razao_social,
      fantasia: cliente.fantasia,
      data_validacao: new Date().toISOString(),
      codigo_vendedor,
    }).catch(() => {});
    // Upload das fotos para OneDrive usando os Files originais (sem CORS)
    await uploadFotosOneDrive(fotosFiles, cliente.codigo_cliente || id);
    toast.success(statusFinal === 'validado' ? 'Cliente validado com sucesso!' : 'Divergência registrada!');
    setSaving(false);
    navigate('/RenovaMS/minha-carteira');
  };

  const handleSalvarProtocolo = async () => {
    if (!protocolo.cevNovo && !protocolo.entregueA) { toast.error('Preencha ao menos o CEV novo ou o nome de quem recebeu.'); return; }
    setSalvandoProtocolo(true);
    await base44.entities.Protocolo.create({
      cliente_id: id,
      razao_social: cliente.razao_social,
      fantasia: cliente.fantasia,
      codigo_vendedor: cliente.codigo_vendedor,
      setor_vendedor: cliente.setor_vendedor,
      cev_antigo: cliente.cev,
      cev_novo: protocolo.cevNovo,
      entregue_a: protocolo.entregueA,
      data_entrega: protocolo.dataEntrega,
      status: 'aberto',
    });
    toast.success('Protocolo criado com sucesso!');
    setProtocolo({ cevNovo: '', entregueA: '', dataEntrega: '' });
    setSalvandoProtocolo(false);
  };

  const handleResetarValidacao = async () => {
    if (!window.confirm('Tem certeza que deseja resetar a validação deste cliente? Todos os dados da validação serão apagados.')) return;
    setResetandoValidacao(true);
    // Apaga a pasta OneDrive do cliente
    const codigoCliente = cliente.codigo_cliente || id;
    base44.functions.invoke('deleteOneDriveFolder', { subfolder: String(codigoCliente) }).catch(() => {});
    await base44.entities.Cliente.update(id, {
      status_validacao: 'pendente',
      data_validacao: null,
      materiais_validados: [],
      observacao_divergencia: '',
      fotos_visita: [],
      geolocalizacao: null,
      documento_renovado: false,
    });
    setCliente(prev => ({
      ...prev,
      status_validacao: 'pendente',
      data_validacao: null,
      materiais_validados: [],
      observacao_divergencia: '',
      fotos_visita: [],
      geolocalizacao: null,
      documento_renovado: false,
    }));
    setMateriaisValidados([]);
    setObservacao('');
    setFotos([]);
    toast.success('Validação resetada. O cliente voltou para o status Pendente.');
    setResetandoValidacao(false);
  };

  const handleMarcarDocumento = async () => {
    setMarcandoDoc(true);
    await base44.entities.Cliente.update(id, { documento_renovado: !cliente.documento_renovado });
    setCliente(prev => ({ ...prev, documento_renovado: !prev.documento_renovado }));
    toast.success(cliente.documento_renovado ? 'Documento desmarcado.' : 'Documento marcado como renovado!');
    setMarcandoDoc(false);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!cliente) return <div className="p-6 text-center text-muted-foreground">Cliente não encontrado.</div>;

  const st = statusConfig[cliente.status_validacao] || statusConfig.pendente;
  const Icon = st.icon;
  const isPendente = cliente.status_validacao === 'pendente';

  // Indicador simples de etapa
  const EtapaIndicador = () => (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      {['quantidades', 'fotos'].map((e, i) => {
        const isAtual = e === etapa;
        const isConcluida = (e === 'quantidades' && etapa === 'fotos');
        const label = e === 'quantidades' ? 'Quantidades' : 'Fotos';
        return (
          <span key={e} className="flex items-center gap-1">
            <span className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center font-bold text-xs border',
              isAtual ? 'bg-green-700 text-white border-green-700' :
              isConcluida ? 'bg-green-100 text-green-700 border-green-300' :
              'bg-muted text-muted-foreground border-border'
            )}>{isConcluida ? '✓' : i + 1}</span>
            <span className={isAtual ? 'font-medium text-foreground' : ''}>{label}</span>
            {i === 0 && <ChevronRight className="w-3 h-3" />}
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => modoValidacao ? setModoValidacao(false) : navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-foreground truncate">{cliente.fantasia || cliente.razao_social}</h1>
          <p className="text-xs text-muted-foreground truncate">{cliente.razao_social}</p>
        </div>
        <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', st.className)}>
          <Icon className="w-3 h-3" />{st.label}
        </div>
      </div>

      {/* Info card */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 space-y-2 text-sm">
          {cliente.endereco && <p className="text-muted-foreground flex items-start gap-2"><MapPin className="w-4 h-4 shrink-0 mt-0.5" />{cliente.endereco}</p>}
          {cliente.telefone && <p className="text-muted-foreground">📞 {cliente.telefone}</p>}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
            {cliente.codigo_cliente && <span>Código: <b>{cliente.codigo_cliente}</b></span>}
            {cliente.codigo_vendedor && <span>Vendedor: <b>{cliente.codigo_vendedor}</b></span>}
            {cliente.setor_vendedor && <span>Filial: <b>{cliente.setor_vendedor}</b></span>}
            {cliente.cev && <span>CEV: <b>{cliente.cev}</b></span>}
            {cliente.dia_visita && <span>Dia visita: <b>{cliente.dia_visita}</b></span>}
          </div>
        </CardContent>
      </Card>

      {/* ====== MODO VISUALIZAÇÃO (vendedor, pendente) ====== */}
      {isVendedor && isPendente && !modoValidacao && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: 'hsl(122,55%,28%)' }} />
                <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Materiais em Comodato</CardTitle>
              </div>
              <Button
                size="sm"
                className="gap-2 text-white"
                style={{ background: 'hsl(122,55%,28%)' }}
                onClick={() => { setModoValidacao(true); setEtapa('quantidades'); }}
              >
                <PlayCircle className="w-4 h-4" />
                Iniciar Validação
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {(cliente.materiais || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum material registrado.</p>
            )}
            {(cliente.materiais || []).map((m, i) => (
              <div key={i} className="rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-foreground">{m.descricao}</p>
                    {m.codigo && <p className="text-xs text-muted-foreground">CEV: {m.codigo}</p>}
                  </div>
                  <div className="text-center shrink-0">
                    <p className="text-xs text-muted-foreground mb-0.5">Na base</p>
                    <p className="font-bold text-sm text-foreground">{m.quantidade}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ====== ETAPA: Quantidades ====== */}
      {isVendedor && isPendente && modoValidacao && etapa === 'quantidades' && (
        <>
          <EtapaIndicador />

          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" style={{ color: 'hsl(122,55%,28%)' }} />
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Confirme as Quantidades</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {materiaisValidados.map((m, i) => {
                const qtdBase = m.quantidade_base ?? m.quantidade;
                const isDivergente = Number(m.quantidade_real) !== Number(qtdBase);
                const ehEquipamento = isEquipamentoControlado(m.descricao);
                return (
                  <div key={i} className={cn('rounded-xl border p-3', isDivergente ? 'border-yellow-300 bg-yellow-50' : 'border-border bg-muted/20')}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">{m.descricao}</p>
                        {m.codigo && <p className="text-xs text-muted-foreground">CEV: {m.codigo}</p>}
                        <p className="text-xs text-muted-foreground mt-1">Na base: <b>{qtdBase}</b></p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Label className="text-xs text-muted-foreground">Qtd real</Label>
                        <Input
                          type="number"
                          min="0"
                          value={m.quantidade_real ?? 0}
                          onChange={e => {
                            const upd = [...materiaisValidados];
                            upd[i] = { ...upd[i], quantidade_real: e.target.value === '' ? '' : Number(e.target.value) };
                            setMateriaisValidados(upd);
                          }}
                          className="w-20 text-center font-bold"
                        />
                        {isDivergente && <span className="text-xs text-yellow-600 font-medium">⚠️ Divergente</span>}
                      </div>
                    </div>
                    {ehEquipamento && Number(m.quantidade_real) > 0 && (
                      <div className="pt-2 border-t border-border space-y-1">
                        <Label className="text-xs font-semibold text-red-600 block">
                          Patrimônio(s) — obrigatório ({Number(m.quantidade_real)} número{Number(m.quantidade_real) > 1 ? 's' : ''} necessário{Number(m.quantidade_real) > 1 ? 's' : ''})
                        </Label>
                        <p className="text-xs text-muted-foreground">Separe por vírgula se houver mais de um. Ex: 2220, 2129</p>
                        <Input
                          type="text"
                          placeholder={Number(m.quantidade_real) > 1 ? `Ex: 2220, 2129 (${Number(m.quantidade_real)} números)` : 'Ex: 2220'}
                          value={m.plaqueta_numeros || ''}
                          onChange={e => {
                            const upd = [...materiaisValidados];
                            upd[i] = { ...upd[i], plaqueta_numeros: e.target.value };
                            setMateriaisValidados(upd);
                          }}
                          className={cn('text-sm', (() => {
                            const qtd = Number(m.quantidade_real);
                            const plaquetas = (m.plaqueta_numeros || '').trim().split(/[\n,;]+/).map(p => p.trim()).filter(Boolean);
                            return plaquetas.length >= qtd ? 'border-green-400 bg-green-50' : 'border-red-300';
                          })())}
                        />
                        {(() => {
                          const qtd = Number(m.quantidade_real);
                          const plaquetas = (m.plaqueta_numeros || '').trim().split(/[\n,;]+/).map(p => p.trim()).filter(Boolean);
                          return plaquetas.length >= qtd
                            ? <p className="text-xs text-green-600 font-medium">✓ {plaquetas.length} patrimônio(s) informado(s)</p>
                            : <p className="text-xs text-red-500">Faltam {qtd - plaquetas.length} número(s)</p>;
                        })()}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Observação
                {materiaisValidados.some(m => Number(m.quantidade_real) !== Number(m.quantidade)) && (
                  <span className="text-xs font-normal text-red-500">*obrigatório (divergência detectada)</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Descreva divergências ou observações relevantes..."
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                className="min-h-[80px]"
              />
            </CardContent>
          </Card>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border md:static md:border-0 md:p-0 md:bg-transparent">
            <Button className="w-full gap-2 text-white" style={{ background: 'hsl(122,55%,28%)' }} onClick={handleAvancar}>
              Avançar <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      {/* ====== ETAPA: Fotos gerais ====== */}
      {isVendedor && isPendente && modoValidacao && etapa === 'fotos' && (
        <>
          <EtapaIndicador />

          <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 leading-relaxed">
              Capture fotos gerais dos ativos para registrar a visita (mesas, cadeiras, etc.). <b>Caso o cliente tenha um Refrigerador ou Chopeira, é necessário capturar uma foto de cada um mostrando todo o equipamento e uma foto do número do Patrimônio de cada equipamento.</b>
            </p>
          </div>

          <Card className="border shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4" style={{ color: 'hsl(122,55%,28%)' }} />
                  <CardTitle className="text-base">Fotos da Visita</CardTitle>
                </div>
                <span className={cn('text-xs font-medium', fotos.length >= 1 ? 'text-green-600' : 'text-red-500')}>
                  {fotos.length}/10 foto(s) — mín. 1
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {fotos.map((url, i) => (
                  <div key={i} className="relative w-20 h-20">
                    <img src={url} alt={`Foto ${i + 1}`} className="w-20 h-20 rounded-lg object-cover border" />
                    <button
                      onClick={() => { setFotos(prev => prev.filter((_, fi) => fi !== i)); setFotosFiles(prev => prev.filter((_, fi) => fi !== i)); }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full flex items-center justify-center shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingFotos}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-green-400 transition-colors"
                >
                  {uploadingFotos ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Camera className="w-5 h-5" /><span className="text-xs">Foto</span></>}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotos} />
              </div>
            </CardContent>
          </Card>

          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border flex gap-3 md:static md:border-0 md:p-0 md:bg-transparent">
            <Button variant="outline" className="flex-1" onClick={() => setEtapa('quantidades')} disabled={saving}>
              <ArrowLeft className="w-4 h-4 mr-2" />Voltar
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={handleValidar} disabled={saving || uploadingOneDrive}>
              {uploadingOneDrive
                ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Enviando {oneDriveProgress.current}/{oneDriveProgress.total}</>
                : saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><CheckCircle2 className="w-4 h-4 mr-2" />Concluir</>
              }
            </Button>
          </div>
        </>
      )}

      {/* ====== VISUALIZAÇÃO PÓS-VALIDAÇÃO ====== */}
      {(!isPendente || isGestor) && (materiaisValidados.length > 0) && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" style={{ color: 'hsl(122,55%,28%)' }} />
              <CardTitle className="text-base">Materiais em Comodato</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {materiaisValidados.map((m, i) => (
              <div key={i} className={cn('rounded-xl border p-3', m.divergente ? 'border-yellow-300 bg-yellow-50' : 'border-border bg-muted/20')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{m.descricao}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                      {m.codigo && <p className="text-xs text-muted-foreground">CEV: {m.codigo}</p>}
                      {m.plaqueta_numeros && (
                        <p className="text-xs font-semibold text-blue-700">🏷️ Patrimônio: <span className="font-bold">{m.plaqueta_numeros}</span></p>
                      )}
                    </div>
                  </div>
                  {m.divergente && <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 border border-yellow-400 text-yellow-700">⚠️ Divergente</span>}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Na base: <b>{m.quantidade_base ?? m.quantidade}</b></span>
                  {m.quantidade_real !== undefined && <span>Real: <b>{m.quantidade_real}</b></span>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Geolocalização — gestor */}
      {isGestor && !isPendente && cliente.geolocalizacao?.lat && (
        <a
          href={`https://www.google.com/maps?q=${cliente.geolocalizacao.lat},${cliente.geolocalizacao.lng}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          <Navigation className="w-4 h-4 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Ver localização da validação</p>
            <p className="text-xs text-blue-500">
              {cliente.geolocalizacao.lat.toFixed(6)}, {cliente.geolocalizacao.lng.toFixed(6)}
              {cliente.geolocalizacao.accuracy && ` · precisão ±${Math.round(cliente.geolocalizacao.accuracy)}m`}
            </p>
          </div>
          <MapPin className="w-4 h-4 shrink-0" />
        </a>
      )}

      {/* Observação registrada */}
      {!isPendente && observacao && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-base">Observação registrada</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{observacao}</p></CardContent>
        </Card>
      )}

      {/* Fotos registradas */}
      {(isGestor || !isPendente) && (cliente.fotos_visita || []).length > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Fotos da Visita</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(cliente.fotos_visita || []).map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt={`Foto ${i + 1}`} className="w-20 h-20 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Protocolo — gestor */}
      {isGestor && cliente.status_validacao !== 'pendente' && (
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: 'hsl(122,55%,28%)' }} />
              <CardTitle className="text-base">Protocolo de Renovação</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">CEV Novo</Label><Input placeholder="Novo número CEV" value={protocolo.cevNovo} onChange={e => setProtocolo(p => ({ ...p, cevNovo: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Entregue a</Label><Input placeholder="Nome de quem recebeu" value={protocolo.entregueA} onChange={e => setProtocolo(p => ({ ...p, entregueA: e.target.value }))} /></div>
              <div className="space-y-1 col-span-2"><Label className="text-xs">Data de Entrega</Label><Input type="date" value={protocolo.dataEntrega} onChange={e => setProtocolo(p => ({ ...p, dataEntrega: e.target.value }))} /></div>
            </div>
            <Button className="w-full" style={{ background: 'hsl(122,55%,28%)' }} onClick={handleSalvarProtocolo} disabled={salvandoProtocolo}>
              {salvandoProtocolo ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Criar Protocolo'}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleMarcarDocumento} disabled={marcandoDoc}>
              {marcandoDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : cliente.documento_renovado ? '✅ Documento renovado — Desmarcar' : 'Marcar documento como renovado'}
            </Button>
            <Button
              variant="outline"
              className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 gap-2"
              onClick={handleResetarValidacao}
              disabled={resetandoValidacao}
            >
              {resetandoValidacao ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-4 h-4" />Resetar Validação</>}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
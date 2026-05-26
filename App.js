import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import CieloLio from 'react-native-lio';

const Stack = createNativeStackNavigator();

const expoExtra = Constants.expoConfig?.extra || {};
const normalizeBase44Url = (value) => {
  const url = String(value || '').replace(/\/$/, '');
  return !url || url === 'https://api.base44.com' ? 'https://base44.app' : url;
};

const API_BASE_URL = normalizeBase44Url(expoExtra.base44AppBaseUrl);

const APP_ID = expoExtra.base44AppId || '69b984ecbe7402af99e141a5';

const FUNCTIONS_VERSION = expoExtra.base44FunctionsVersion || 'v3';

const todayIso = () => new Date().toISOString().slice(0, 10);

const request = async (path, options = {}) => {
  if (!API_BASE_URL || !APP_ID) {
    throw new Error('Configure VITE_BASE44_APP_BASE_URL e VITE_BASE44_APP_ID.');
  }

  const url = `${API_BASE_URL.replace(/\/$/, '')}/api${path}`;
  const optionHeaders = options.headers || {};
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = {
    Accept: 'application/json',
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    'X-App-Id': APP_ID,
    ...(FUNCTIONS_VERSION ? { 'Base44-Functions-Version': FUNCTIONS_VERSION } : {}),
    ...optionHeaders
  };
  Object.keys(headers).forEach((key) => headers[key] === undefined && delete headers[key]);

  const response = await fetch(url, {
    ...options,
    headers
  });

  const text = await response.text();
  const contentType = response.headers?.get?.('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = text && isJson ? JSON.parse(text) : null;

  if (!response.ok) {
    const detail = data?.message || data?.detail || text.slice(0, 120);
    throw new Error(detail || `Erro ao acessar a API (${response.status}).`);
  }

  if (text && !isJson) {
    throw new Error(`Resposta inesperada da API em ${url}: ${contentType || 'sem content-type'}.`);
  }

  return data;
};

const entityPath = (entity) => `/apps/${APP_ID}/entities/${entity}`;

const updateEntity = (entity, id, data) =>
  request(`${entityPath(entity)}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });

const createEntity = (entity, data) =>
  request(entityPath(entity), {
    method: 'POST',
    body: JSON.stringify(data)
  });

const uploadFile = async ({ uri, fileName, mimeType }) => {
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: fileName || `foto-${Date.now()}.jpg`,
    type: mimeType || 'image/jpeg'
  });

  return request(`/apps/${APP_ID}/integration-endpoints/Core/UploadFile`, {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': undefined }
  });
};

const listEntity = (entity, params = {}) => {
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  const suffix = query ? `?${query}` : '';
  return request(`${entityPath(entity)}${suffix}`);
};

const filterEntity = (entity, filter, sort, limit, skip) =>
  listEntity(entity, {
    q: JSON.stringify(filter),
    sort,
    limit,
    skip
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getCompletionLocation = async () => {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return null;

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeout: 10000
    });
    const coords = position.coords || {};
    const { latitude, longitude } = coords;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
};

const nextReceiptNumber = async () => {
  const year = new Date().getFullYear();
  let sequence = 1;

  try {
    const latest = await listEntity('Comprovante', { sort: '-numero_comprovante', limit: 1 });
    const latestNumber = latest?.[0]?.numero_comprovante || '';
    const match = String(latestNumber).match(/^COMP-(\d{4})-(\d+)$/);
    if (match && Number(match[1]) === year) {
      sequence = Number(match[2]) + 1;
    }
  } catch {
    sequence = 1;
  }

  return `COMP-${year}-${String(sequence).padStart(4, '0')}`;
};

const formatReceiptDateTime = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');
  return {
    date: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`
  };
};

const normalizeReceiptAssets = (collected) => collected.map((asset) => ({
  nome: asset.asset_type || 'Ativo',
  quantidade: asset.qty_collected || 1,
  numero_patrimonio: asset.patrimonio || asset.plaqueta || asset.expected_patrimonio || ''
}));

const parseReceiptAssets = (assets) => {
  if (Array.isArray(assets)) return assets;
  if (typeof assets !== 'string' || !assets.trim()) return [];

  try {
    const parsed = JSON.parse(assets);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const receiptString = (value) => (value === undefined || value === null ? '' : String(value));

const serializeReceiptForBase44 = (receipt) => {
  const assets = parseReceiptAssets(receipt.ativos_devolvidos);

  return {
    numero_comprovante: receiptString(receipt.numero_comprovante),
    tarefa_id: receiptString(receipt.tarefa_id),
    cliente_nome: receiptString(receipt.cliente_nome),
    cliente_endereco: receiptString(receipt.cliente_endereco),
    codigo_pdv: receiptString(receipt.codigo_pdv),
    motorista_nome: receiptString(receipt.motorista_nome),
    empresa: receiptString(receipt.empresa),
    ativos_devolvidos: JSON.stringify(assets),
    data_hora: receiptString(receipt.data_hora),
    status: receiptString(receipt.status)
  };
};

const buildReceiptText = (receipt, copyLabel) => {
  const { date, time } = formatReceiptDateTime(new Date(receipt.data_hora));
  const assetsText = parseReceiptAssets(receipt.ativos_devolvidos)
    .map((asset) => {
      const patrimonyValue = String(asset.numero_patrimonio || '');
      const patrimony = patrimonyValue
        ? `  ${patrimonyValue.toUpperCase().startsWith('PAT-') ? patrimonyValue : `PAT-${patrimonyValue}`}`
        : '';
      return `- ${asset.nome} x${asset.quantidade}${patrimony}`;
    })
    .join('\n') || '- Nenhum ativo informado';
  const signature = copyLabel === 'VIA DO MOTORISTA'
    ? '\nAssinatura do cliente:\n\n\n_________________________________\n\n================================\n'
    : '';

  return [
    '================================',
    '     GRUPO MS - COMPROVANTE',
    '     DE DEVOLUCAO DE ATIVOS',
    '================================',
    `N: ${receipt.numero_comprovante}`,
    `Data: ${date}  Hora: ${time}`,
    '',
    `CLIENTE: ${receipt.cliente_nome || '-'}`,
    `Endereco: ${receipt.cliente_endereco || '-'}`,
    `PDV: ${receipt.codigo_pdv || '-'}`,
    '',
    `MOTORISTA: ${receipt.motorista_nome || '-'}`,
    `Empresa: ${receipt.empresa || '-'}`,
    '',
    'ATIVOS DEVOLVIDOS:',
    assetsText,
    '',
    '================================',
    `        ${copyLabel}`,
    '================================',
    signature
  ].join('\n');
};

const waitForPrinterState = () => new Promise((resolve, reject) => {
  if (!CieloLio?.addListener) {
    resolve();
    return;
  }

  let settled = false;
  let subscription;
  const finish = (callback) => {
    if (settled) return;
    settled = true;
    subscription?.remove?.();
    callback();
  };

  subscription = CieloLio.addListener('onChangePrinterState', (data) => {
    const state = data?.printerState;
    if (state === 0 || state === 'SUCCESS') {
      finish(resolve);
      return;
    }
    const message = state === 2 || state === 'NO_PAPER'
      ? 'Impressora sem papel.'
      : 'Impressora indisponivel.';
    finish(() => reject(new Error(message)));
  });

  setTimeout(() => finish(resolve), 7000);
});

const printCieloText = async (text, style) => {
  if (!CieloLio?.printText) {
    throw new Error('Modulo de impressao Cielo indisponivel.');
  }

  const printerState = waitForPrinterState();
  CieloLio.printText(text, style);
  await printerState;
};

const printReceiptCopies = async (receipt) => {
  const printStyle = {
    key_attributes_align: 1,
    key_attributes_textsize: 20
  };
  await printCieloText(`${buildReceiptText(receipt, 'VIA DO CLIENTE')}\n\n`, printStyle);
  await sleep(900);
  await printCieloText(`${buildReceiptText(receipt, 'VIA DO MOTORISTA')}\n\n`, printStyle);
};

const getOperatorName = (code) => code?.name || code?.owner_name || code?.operator_name || '';

const normalizeCompany = (value) => String(value || '').trim();

const isActiveCode = (code) => code?.is_active !== false;

function IconMark({ children, color = '#10b981', background = '#dcfce7' }) {
  return (
    <View style={[styles.iconCircle, { backgroundColor: background }]}>
      <Text style={[styles.iconText, { color }]}>{children}</Text>
    </View>
  );
}

function CenterCard({ children }) {
  return (
    <View style={styles.darkScreen}>
      <View style={styles.authCard}>{children}</View>
    </View>
  );
}

function Button({ label, onPress, variant = 'outline', disabled = false, style }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'green' && styles.greenButton,
        variant === 'gray' && styles.grayButton,
        variant === 'red' && styles.redButton,
        disabled && styles.disabledButton,
        style
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'green' && styles.solidButtonText,
          variant === 'red' && styles.solidButtonText
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function EmpresaScreen({ navigation }) {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const codes = await filterEntity('AccessCode', { role: 'driver' }, 'revenda', 200);
      const unique = [...new Set(
        (codes || [])
          .filter(isActiveCode)
          .map((item) => normalizeCompany(item.revenda))
          .filter(Boolean)
      )];
      setCompanies(unique);
      if (unique.length === 0) {
        setError('Nenhuma empresa encontrada para motorista.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  return (
    <CenterCard>
      <IconMark>⌖</IconMark>
      <Text style={styles.authTitle}>Motorista</Text>
      <Text style={styles.authSubtitle}>Selecione a empresa</Text>
      <Text style={styles.question}>Qual empresa voce vai acessar?</Text>

      {loading ? <Text style={styles.mutedText}>Carregando empresas...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {companies.map((company) => (
        <Button
          key={company}
          label={company}
          onPress={() => navigation.navigate('CodigoAcesso', { company })}
        />
      ))}

      <Button label="Atualizar" onPress={loadCompanies} variant="outline" />
      <Button label="Voltar" onPress={() => navigation.goBack()} variant="gray" />
    </CenterCard>
  );
}

function CodigoScreen({ navigation, route }) {
  const company = route.params?.company || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!code.trim()) {
      setError('Informe o codigo de acesso.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const codes = await filterEntity('AccessCode', { code: code.trim(), role: 'driver' }, '-created_date', 20);
      const matched = (codes || []).find((item) => {
        const revenda = normalizeCompany(item.revenda);
        return isActiveCode(item) && (!revenda || revenda === company);
      });

      if (!matched) {
        setError('Codigo invalido para esta empresa.');
        return;
      }

      const operatorName = getOperatorName(matched);
      await request(entityPath('ActivityLog'), {
        method: 'POST',
        body: JSON.stringify({
          action: 'Login',
          panel: 'driver',
          operator_name: operatorName,
          access_code: matched.code,
          details: `Acesso ao painel Motorista - ${company}`
        })
      }).catch(() => null);

      navigation.replace('MinhaRota', {
        company,
        operatorName,
        code: matched.code
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <CenterCard>
      <IconMark>⌖</IconMark>
      <Text style={styles.authTitle}>Motorista</Text>
      <Text style={styles.authSubtitle}>Codigo de acesso</Text>

      <View style={styles.companyBadge}>
        <Text style={styles.companyBadgeText}>{company}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Empresa')}>
          <Text style={styles.changeLink}>Trocar</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>Codigo de Acesso</Text>
      <TextInput
        value={code}
        onChangeText={(value) => {
          setCode(value);
          setError('');
        }}
        secureTextEntry
        placeholder="Digite seu codigo"
        placeholderTextColor="#94a3b8"
        style={styles.input}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.rowGap}>
        <Button label="Voltar" onPress={() => navigation.goBack()} variant="gray" style={styles.flexButton} />
        <Button
          label={loading ? 'Entrando...' : 'Entrar'}
          onPress={handleLogin}
          variant="green"
          disabled={loading}
          style={styles.flexButton}
        />
      </View>
    </CenterCard>
  );
}

function CounterPill({ label, value, color }) {
  return (
    <View style={styles.counterPill}>
      <Text style={[styles.counterPillValue, { color }]}>{value}</Text>
      <Text style={styles.counterPillLabel}>{label}</Text>
    </View>
  );
}

const ACTIVE_STATUSES = ['Atribuido', 'Atribu\u00eddo', 'Em Rota', 'No Cliente'];
const DONE_STATUS = 'Conclu\u00eddo';
const OCCURRENCE_STATUS = 'Conclu\u00eddo com Ocorr\u00eancia';
const OCCURRENCE_REASONS = [
  'PDV Fechado',
  'Vasilhame Cheio',
  'Ativo n\u00e3o Encontrado',
  'Recolha Cancelada',
  'Respons\u00e1vel Ausente',
  'N\u00e3o deu tempo'
];

function TaskItem({ item, operatorName, accessCode, company, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(item.driver_notes || '');
  const [occurrenceReason, setOccurrenceReason] = useState(item.occurrence_reason || '');
  const [occurrenceDetails, setOccurrenceDetails] = useState(item.occurrence_details || '');
  const [occurrencePickerOpen, setOccurrencePickerOpen] = useState(false);
  const [collectedAssets, setCollectedAssets] = useState({});
  const [loadingAction, setLoadingAction] = useState('');

  const assets = item.assets?.length
    ? item.assets
    : item.asset_type
      ? [{
          asset_type: item.asset_type,
          asset_brand: item.asset_brand,
          asset_serial: item.asset_serial,
          asset_patrimonio: item.asset_patrimonio,
          quantity: item.quantity || 1
        }]
      : [];

  const isActive = ACTIVE_STATUSES.includes(item.status);
  const photoUrls = item.photo_urls || [];

  const logAction = async (action, details) => {
    await createEntity('ActivityLog', {
      action,
      panel: 'driver',
      operator_name: operatorName || '',
      access_code: accessCode || '',
      os_number: item.os_number,
      details
    }).catch(() => null);
  };

  const setAssetChecked = (key, asset, checked) => {
    setCollectedAssets((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        checked,
        qty: current[key]?.qty || asset.quantity || 1
      }
    }));
  };

  const setAssetQty = (key, qty) => {
    setCollectedAssets((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        checked: true,
        qty: Math.max(0, Number.parseInt(qty, 10) || 0)
      }
    }));
  };

  const setAssetPatrimonio = (key, patrimonio) => {
    setCollectedAssets((current) => ({
      ...current,
      [key]: {
        ...(current[key] || {}),
        checked: true,
        plaqueta: patrimonio,
        patrimonio
      }
    }));
  };

  const needsPatrimonio = (asset) => {
    const name = String(asset?.asset_type || '');
    return name.includes('Refrigerador') || name.includes('Chopeira');
  };

  const buildCollectedPayload = () => Object.entries(collectedAssets)
    .filter(([, value]) => value.checked)
    .map(([key, value]) => {
      const index = Number.parseInt(key.split('-').pop(), 10);
      const asset = assets[index] || {};
      const expectedPatrimonio = asset.asset_patrimonio || asset.asset_serial || '';
      return {
        asset_type: asset.asset_type || 'Ativo',
        asset_brand: asset.asset_brand || '',
        qty_collected: value.qty || asset.quantity || 1,
        plaqueta: value.plaqueta || '',
        patrimonio: value.plaqueta || '',
        expected_patrimonio: expectedPatrimonio,
        patrimonio_divergence: !!(value.plaqueta && expectedPatrimonio && value.plaqueta !== expectedPatrimonio)
      };
    });

  const handleComplete = async () => {
    const collected = buildCollectedPayload();
    if (collected.length === 0) {
      Alert.alert('Itens recolhidos', 'Marque ao menos um item em "O que voce recolheu?".');
      return;
    }

    setLoadingAction('complete');
    try {
      const summary = collected.map((asset) => `${asset.asset_type}: ${asset.qty_collected} un.`).join('; ');
      const checkoutTime = new Date().toISOString();
      const completionLocation = await getCompletionLocation();
      const updatePayload = {
        status: DONE_STATUS,
        driver_status: DONE_STATUS,
        driver_notes: notes ? `${notes} | Recolhido: ${summary}` : `Recolhido: ${summary}`,
        driver_collected_assets: collected,
        driver_checkout_time: checkoutTime,
        driver_completion_location: completionLocation
      };

      await updateEntity('ServiceOrder', item.id, updatePayload);
      await logAction(`Status -> ${DONE_STATUS}`, notes || summary);

      let postCompletionWarning = '';
      try {
        const receipt = {
          numero_comprovante: await nextReceiptNumber(),
          tarefa_id: item.id,
          cliente_nome: item.client_name || '',
          cliente_endereco: item.client_address || '',
          codigo_pdv: item.client_code || '',
          motorista_nome: operatorName || '',
          empresa: company || item.revenda || '',
          ativos_devolvidos: normalizeReceiptAssets(collected),
          data_hora: checkoutTime,
          status: 'emitido'
        };
        await createEntity('Comprovante', serializeReceiptForBase44(receipt));
        try {
          await printReceiptCopies(receipt);
        } catch (printErr) {
          postCompletionWarning = `\n\nImpressora indisponivel: ${printErr.message}`;
        }
      } catch (receiptErr) {
        postCompletionWarning = `\n\nComprovante nao emitido: ${receiptErr.message}`;
      }

      Alert.alert('Coleta concluida', `Dados enviados com sucesso.${postCompletionWarning}`);
      onUpdated?.();
    } catch (err) {
      Alert.alert('Erro ao concluir coleta', err.message);
    } finally {
      setLoadingAction('');
    }
  };

  const handlePhoto = async () => {
    setLoadingAction('photo');
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissao necessaria', 'Autorize o acesso a camera para anexar fotos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.75
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const photo = result.assets[0];
      const uploaded = await uploadFile({
        uri: photo.uri,
        fileName: photo.fileName || `os-${item.os_number || item.id}-${Date.now()}.jpg`,
        mimeType: photo.mimeType || 'image/jpeg'
      });
      const fileUrl = uploaded?.file_url || uploaded?.url;
      if (!fileUrl) throw new Error('A API nao retornou a URL da foto.');

      await updateEntity('ServiceOrder', item.id, {
        photo_urls: [...photoUrls, fileUrl]
      });
      await logAction('Upload foto', fileUrl);
      Alert.alert('Foto enviada', 'A foto foi anexada a tarefa.');
      onUpdated?.();
    } catch (err) {
      Alert.alert('Erro ao enviar foto', err.message);
    } finally {
      setLoadingAction('');
    }
  };

  const handleRemovePhoto = async (urlToRemove) => {
    setLoadingAction('photo-remove');
    try {
      await updateEntity('ServiceOrder', item.id, {
        photo_urls: photoUrls.filter((url) => url !== urlToRemove)
      });
      await logAction('Remover foto', urlToRemove);
      onUpdated?.();
    } catch (err) {
      Alert.alert('Erro ao remover foto', err.message);
    } finally {
      setLoadingAction('');
    }
  };

  const handleOccurrence = async () => {
    if (!occurrenceReason) {
      Alert.alert('Motivo obrigatorio', 'Selecione um motivo para registrar a ocorrencia.');
      return;
    }
    if (occurrenceReason === 'PDV Fechado' && photoUrls.length === 0) {
      Alert.alert('Foto obrigatória para ocorrência PDV Fechado.');
      return;
    }

    setLoadingAction('occurrence');
    try {
      const isNoTime = occurrenceReason === 'N\u00e3o deu tempo';
      const payload = isNoTime
        ? {
            status: 'Aguardando',
            assigned_driver: '',
            assigned_vehicle: '',
            assigned_date: '',
            route_date: '',
            driver_status: 'N\u00e3o Realizado'
          }
        : {
            status: OCCURRENCE_STATUS,
            driver_status: 'N\u00e3o Realizado'
          };

      await updateEntity('ServiceOrder', item.id, {
        ...payload,
        driver_notes: notes,
        occurrence_reason: occurrenceReason,
        occurrence_details: occurrenceDetails,
        driver_checkout_time: new Date().toISOString()
      });
      await logAction(`Ocorrencia: ${occurrenceReason}`, occurrenceDetails || notes);
      Alert.alert('Ocorrencia registrada', 'Dados enviados com sucesso.');
      onUpdated?.();
    } catch (err) {
      Alert.alert('Erro ao registrar ocorrencia', err.message);
    } finally {
      setLoadingAction('');
    }
  };

  return (
    <View style={styles.taskCard}>
      <TouchableOpacity activeOpacity={0.9} onPress={() => setExpanded((value) => !value)}>
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleWrap}>
          <Text style={styles.taskTitle}>{item.client_name || 'Cliente sem nome'}</Text>
          {item.client_code ? <Text style={styles.clientCodeText}>{item.client_code}</Text> : null}
        </View>
        <Text style={styles.statusBadge}>{item.status || 'Sem status'}</Text>
      </View>
      <Text style={styles.taskMeta}>{item.client_address || 'Endereco nao informado'}</Text>
      <Text style={styles.taskMeta}>Acao: {item.action_type || 'Recolha'}</Text>
      {assets.map((asset, index) => (
        <Text key={`${item.id}-${index}`} style={styles.assetLine}>
          {asset.quantity || 1}x {asset.asset_type || 'Ativo'} {asset.asset_brand ? `- ${asset.asset_brand}` : ''}
        </Text>
      ))}
      <Text style={styles.expandHint}>{expanded ? 'Recolher detalhes' : 'Expandir tarefa'}</Text>
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.taskDetails}>
          {isActive ? (
            <>
              <Text style={styles.fieldLabel}>Observacoes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Observacoes..."
                placeholderTextColor="#94a3b8"
                multiline
                style={styles.textArea}
              />

              <Text style={styles.sectionTitle}>O que voce recolheu?</Text>
              {assets.map((asset, index) => {
                const key = `${asset.asset_type || 'Ativo'}-${index}`;
                const state = collectedAssets[key] || {};
                return (
                  <View key={key} style={[styles.assetCheckCard, state.checked && styles.assetCheckCardActive]}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setAssetChecked(key, asset, !state.checked)}
                      style={styles.checkboxRow}
                    >
                      <Text style={[styles.checkbox, state.checked && styles.checkboxActive]}>
                        {state.checked ? '✓' : ''}
                      </Text>
                      <View style={styles.checkboxTextWrap}>
                        <Text style={styles.checkboxTitle}>{asset.asset_type || 'Ativo'}</Text>
                        <Text style={styles.checkboxMeta}>
                          Prev: {asset.quantity || 1} un.{asset.asset_brand ? ` - ${asset.asset_brand}` : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {state.checked ? (
                      <View style={styles.collectionFields}>
                        <View style={styles.qtyRow}>
                          <Text style={styles.smallLabel}>Qtd. recolhida</Text>
                          <TextInput
                            value={String(state.qty || '')}
                            onChangeText={(value) => setAssetQty(key, value)}
                            keyboardType="number-pad"
                            placeholder="0"
                            placeholderTextColor="#94a3b8"
                            style={styles.qtyInput}
                          />
                        </View>
                        {needsPatrimonio(asset) ? (
                          <View style={styles.patrimonioField}>
                            <Text style={styles.smallLabel}>{'N\u00ba DO PATRIM\u00d4NIO'}</Text>
                            <TextInput
                              value={state.patrimonio || state.plaqueta || ''}
                              onChangeText={(value) => setAssetPatrimonio(key, value)}
                              placeholder="Ex: 2125"
                              placeholderTextColor="#94a3b8"
                              style={styles.patrimonioInput}
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })}

              <View style={styles.actionRow}>
                <Button
                  label={loadingAction === 'complete' ? 'Enviando...' : 'Concluir Coleta'}
                  onPress={handleComplete}
                  variant="green"
                  disabled={!!loadingAction}
                  style={styles.flexButton}
                />
                <Button
                  label={loadingAction === 'photo' ? 'Enviando...' : 'Foto'}
                  onPress={handlePhoto}
                  variant="outline"
                  disabled={!!loadingAction}
                  style={styles.photoButton}
                />
              </View>

              <View style={styles.occurrenceBox}>
                <Text style={styles.occurrenceTitle}>{'Registrar Ocorr\u00eancia'}</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setOccurrencePickerOpen(true)}
                  style={styles.reasonDropdown}
                >
                  <Text style={[styles.reasonDropdownText, !occurrenceReason && styles.reasonDropdownPlaceholder]}>
                    {occurrenceReason || 'Motivo'}
                  </Text>
                  <Text style={styles.reasonDropdownIcon}>v</Text>
                </TouchableOpacity>
                <TextInput
                  value={occurrenceDetails}
                  onChangeText={setOccurrenceDetails}
                  placeholder="Detalhes..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  style={styles.textArea}
                />
                <Button
                  label={loadingAction === 'occurrence' ? 'Enviando...' : 'Registrar Ocorr\u00eancia'}
                  onPress={handleOccurrence}
                  variant="red"
                  disabled={!!loadingAction}
                />
                <Modal
                  visible={occurrencePickerOpen}
                  transparent
                  animationType="fade"
                  onRequestClose={() => setOccurrencePickerOpen(false)}
                >
                  <TouchableOpacity
                    activeOpacity={1}
                    onPress={() => setOccurrencePickerOpen(false)}
                    style={styles.modalOverlay}
                  >
                    <View style={styles.reasonModal}>
                      <Text style={styles.reasonModalTitle}>Motivo</Text>
                      {OCCURRENCE_REASONS.map((reason) => (
                        <TouchableOpacity
                          key={reason}
                          onPress={() => {
                            setOccurrenceReason(reason);
                            setOccurrencePickerOpen(false);
                          }}
                          style={styles.reasonOption}
                        >
                          <Text style={[
                            styles.reasonOptionText,
                            occurrenceReason === reason && styles.reasonOptionTextActive
                          ]}>
                            {reason}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </TouchableOpacity>
                </Modal>
              </View>
            </>
          ) : (
            <Text style={styles.mutedText}>Tarefa finalizada. Dados disponiveis para consulta.</Text>
          )}

          {photoUrls.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
              {photoUrls.map((url, index) => (
                <View key={`${url}-${index}`} style={styles.photoThumbWrap}>
                  <Image source={{ uri: url }} style={styles.photoThumb} />
                  {isActive ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleRemovePhoto(url)}
                      disabled={!!loadingAction}
                      style={styles.removePhotoButton}
                    >
                      <Text style={styles.removePhotoText}>✕</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function MinhaRotaScreen({ navigation, route }) {
  const { company, operatorName } = route.params || {};
  const [activeTab, setActiveTab] = useState('rota');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    if (!operatorName) {
      setOrders([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const data = await filterEntity('ServiceOrder', { assigned_driver: operatorName }, '-created_date', 100);
      setOrders((data || []).filter((order) => !company || !order.revenda || order.revenda === company));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [company, operatorName]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const today = todayIso();
  const matchesDate = useCallback((order) => (
    order.route_date === today ||
    order.assigned_date === today ||
    (!order.route_date && !order.assigned_date)
  ), [today]);

  const active = useMemo(() => orders.filter((order) =>
    ACTIVE_STATUSES.includes(order.status)
  ), [orders]);

  const completed = useMemo(() => orders.filter((order) =>
    [DONE_STATUS, OCCURRENCE_STATUS, 'Concluido', 'Concluido com Ocorrencia'].includes(order.status) &&
    matchesDate(order)
  ), [matchesDate, orders]);

  const occurrences = useMemo(() => orders.filter((order) =>
    [OCCURRENCE_STATUS, 'Concluido com Ocorrencia'].includes(order.status) &&
    matchesDate(order)
  ), [matchesDate, orders]);

  const visibleOrders = [...active, ...completed];

  const logout = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Empresa' }]
    });
  };

  return (
    <View style={styles.routeScreen}>
      <View style={styles.compactHeader}>
        <View style={styles.compactHeaderTopRow}>
          <Text style={styles.operatorName} numberOfLines={1}>{operatorName || '-'}</Text>
          <Text style={styles.compactCompanyBadge} numberOfLines={1}>{company || '-'}</Text>
          <Button label="Sair" onPress={logout} variant="red" style={styles.compactExitButton} />
        </View>
        <View style={styles.compactHeaderStatsRow}>
          <CounterPill label="Ativas" value={active.length} color="#2563eb" />
          <CounterPill label="Feitas" value={completed.length} color="#16a34a" />
          <CounterPill label="Ocorrências" value={occurrences.length} color="#f97316" />
          <Button label={loading ? '...' : 'Atualizar'} onPress={loadOrders} variant="outline" style={styles.compactRefreshButton} />
        </View>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'rota' && styles.activeTab]}
          onPress={() => setActiveTab('rota')}
        >
          <Text style={[styles.tabText, activeTab === 'rota' && styles.activeTabText]}>Minha Rota</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'manual' && styles.activeTab]}
          onPress={() => setActiveTab('manual')}
        >
          <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>{'Instru\u00e7\u00f5es'}</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'manual' ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.manualContent}>
          <Text style={styles.manualTitle}>{'Instru\u00e7\u00f5es'}</Text>
          <Text style={styles.manualText}>{'Ao concluir cada recolhimento que est\u00e1 atribu\u00eddo \u00e0 sua rota, preencha as informa\u00e7\u00f5es corretamente na aba Minha Rota.'}</Text>
          <Text style={styles.manualText}>{'\u2022 N\u00e3o realizar recolha parcial;'}</Text>
          <Text style={styles.manualText}>{'\u2022 N\u00e3o recolher material diferente do informado em Minha Rota;'}</Text>
          <Text style={styles.manualText}>{'\u2022 N\u00e3o recolher material quebrado;'}</Text>
          <Text style={styles.manualText}>{'Deve-se seguir as regras acima, caso contr\u00e1rio, somente com autoriza\u00e7\u00e3o do(a) Supervisor(a) de Log\u00edstica.'}</Text>
          <Text style={styles.manualText}>{'Qualquer d\u00favida ou sugest\u00e3o de melhoria, entre em contato com o seu supervisor.'}</Text>
        </ScrollView>
      ) : (
        <View style={styles.content}>
          {error ? <Text style={styles.routeErrorText}>{error}</Text> : null}

          <FlatList
            data={visibleOrders}
            keyExtractor={(item, index) => item.id || `${item.os_number}-${index}`}
            renderItem={({ item }) => (
              <TaskItem
                item={item}
                operatorName={operatorName}
                accessCode={route.params?.code}
                company={company}
                onUpdated={loadOrders}
              />
            )}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{loading ? 'Carregando tarefas...' : 'Nenhuma tarefa encontrada'}</Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Empresa" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Empresa" component={EmpresaScreen} />
        <Stack.Screen name="CodigoAcesso" component={CodigoScreen} />
        <Stack.Screen name="MinhaRota" component={MinhaRotaScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  darkScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#111827'
  },
  authCard: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    borderRadius: 14,
    backgroundColor: '#ffffff'
  },
  iconCircle: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    marginBottom: 14
  },
  iconText: {
    fontSize: 30,
    fontWeight: '800'
  },
  authTitle: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '800'
  },
  authSubtitle: {
    color: '#64748b',
    fontSize: 15,
    marginTop: 3,
    marginBottom: 26
  },
  question: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12
  },
  mutedText: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 10
  },
  errorText: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 12
  },
  button: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    marginTop: 10,
    paddingHorizontal: 14
  },
  greenButton: {
    borderColor: '#059669',
    backgroundColor: '#059669'
  },
  grayButton: {
    borderColor: '#e5e7eb',
    backgroundColor: '#f3f4f6'
  },
  redButton: {
    borderColor: '#dc2626',
    backgroundColor: '#dc2626'
  },
  disabledButton: {
    opacity: 0.65
  },
  buttonText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800'
  },
  solidButtonText: {
    color: '#ffffff'
  },
  companyBadge: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 10,
    backgroundColor: '#fff7ed',
    paddingHorizontal: 12,
    marginBottom: 20
  },
  companyBadgeText: {
    color: '#c2410c',
    fontSize: 14,
    fontWeight: '800'
  },
  changeLink: {
    color: '#ea580c',
    fontSize: 13,
    fontWeight: '800'
  },
  label: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    color: '#111827',
    fontSize: 16,
    paddingHorizontal: 12,
    marginBottom: 12
  },
  rowGap: {
    flexDirection: 'row',
    gap: 12
  },
  flexButton: {
    flex: 1
  },
  routeScreen: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  compactHeader: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 92,
    gap: 6,
    paddingTop: 22,
    paddingHorizontal: 8,
    paddingBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff'
  },
  compactHeaderTopRow: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6
  },
  compactHeaderStatsRow: {
    width: '100%',
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: 3
  },
  operatorName: {
    flex: 1,
    flexShrink: 1,
    minWidth: 60,
    color: '#111827',
    fontSize: 12,
    fontWeight: '900'
  },
  compactCompanyBadge: {
    flexShrink: 1,
    maxWidth: 116,
    overflow: 'hidden',
    color: '#c2410c',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: '#ffedd5',
    borderRadius: 7,
    paddingHorizontal: 6,
    paddingVertical: 4
  },
  counterPill: {
    minHeight: 28,
    minWidth: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 7,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 5
  },
  counterPillValue: {
    fontSize: 12,
    fontWeight: '900'
  },
  counterPillLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800'
  },
  compactRefreshButton: {
    width: 68,
    minHeight: 32,
    marginTop: 0,
    paddingHorizontal: 2
  },
  compactExitButton: {
    width: 48,
    minHeight: 32,
    marginTop: 0,
    paddingHorizontal: 4
  },
  header: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 34,
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff'
  },
  headerText: {
    flex: 1,
    paddingRight: 12
  },
  routeTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900'
  },
  routeSubtitle: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2
  },
  headerCompanyBadge: {
    alignSelf: 'flex-start',
    overflow: 'hidden',
    color: '#c2410c',
    fontSize: 12,
    fontWeight: '800',
    backgroundColor: '#ffedd5',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
    marginTop: 8
  },
  exitButton: {
    width: 76,
    minHeight: 40,
    marginTop: 0
  },
  tabs: {
    flexDirection: 'row',
    margin: 16,
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f1f5f9'
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    borderRadius: 9
  },
  activeTab: {
    backgroundColor: '#ffffff'
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '800'
  },
  activeTabText: {
    color: '#111827'
  },
  content: {
    flex: 1,
    paddingHorizontal: 16
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14
  },
  dateInput: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    color: '#111827',
    fontSize: 15,
    paddingHorizontal: 12
  },
  refreshButton: {
    width: 108,
    minHeight: 46,
    marginTop: 0
  },
  routeErrorText: {
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 10
  },
  counterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14
  },
  counterCard: {
    flex: 1,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff'
  },
  counterIcon: {
    fontSize: 22,
    fontWeight: '900'
  },
  counterValue: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 3
  },
  counterLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700'
  },
  listContent: {
    paddingBottom: 28
  },
  emptyBox: {
    minHeight: 128,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    padding: 20
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '700'
  },
  taskCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    padding: 14,
    marginBottom: 10
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 8
  },
  taskTitleWrap: {
    flex: 1
  },
  taskTitle: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900'
  },
  clientCodeText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2
  },
  statusBadge: {
    overflow: 'hidden',
    color: '#0f766e',
    fontSize: 11,
    fontWeight: '900',
    backgroundColor: '#ccfbf1',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  taskMeta: {
    color: '#475569',
    fontSize: 13,
    marginTop: 3
  },
  assetLine: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6
  },
  expandHint: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
    marginTop: 12
  },
  taskDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 12,
    paddingTop: 12
  },
  fieldLabel: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  textArea: {
    minHeight: 82,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    color: '#111827',
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    marginBottom: 12
  },
  sectionTitle: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 8,
    textTransform: 'uppercase'
  },
  assetCheckCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    padding: 10,
    marginBottom: 8
  },
  assetCheckCardActive: {
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4'
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#94a3b8',
    borderRadius: 5,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 20,
    textAlign: 'center'
  },
  checkboxActive: {
    borderColor: '#16a34a',
    backgroundColor: '#16a34a'
  },
  checkboxTextWrap: {
    flex: 1
  },
  checkboxTitle: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900'
  },
  checkboxMeta: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10
  },
  collectionFields: {
    gap: 10
  },
  smallLabel: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800'
  },
  qtyInput: {
    width: 74,
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    color: '#111827',
    backgroundColor: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center'
  },
  patrimonioField: {
    gap: 6,
    marginTop: 2
  },
  patrimonioInput: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    color: '#111827',
    backgroundColor: '#ffffff',
    fontSize: 15,
    paddingHorizontal: 12
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 12
  },
  photoButton: {
    width: 96
  },
  occurrenceBox: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 12,
    backgroundColor: '#fef2f2',
    padding: 10,
    marginTop: 2
  },
  occurrenceTitle: {
    color: '#b91c1c',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 8
  },
  reasonDropdown: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#f97316',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  reasonDropdownText: {
    flex: 1,
    color: '#111827',
    fontSize: 14,
    fontWeight: '800'
  },
  reasonDropdownPlaceholder: {
    color: '#94a3b8'
  },
  reasonDropdownIcon: {
    color: '#f97316',
    fontSize: 22,
    fontWeight: '900',
    marginLeft: 10
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.45)'
  },
  reasonModal: {
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden'
  },
  reasonModalTitle: {
    color: '#991b1b',
    fontSize: 15,
    fontWeight: '900',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff7ed',
    borderBottomWidth: 1,
    borderBottomColor: '#fed7aa'
  },
  reasonOption: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  reasonOptionText: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700'
  },
  reasonOptionTextActive: {
    color: '#dc2626',
    fontWeight: '900'
  },
  photoStrip: {
    marginTop: 12
  },
  photoThumbWrap: {
    width: 72,
    height: 72,
    marginRight: 8
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#e5e7eb'
  },
  removePhotoButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffffff',
    backgroundColor: '#dc2626'
  },
  removePhotoText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18
  },
  manualContent: {
    paddingBottom: 28
  },
  manualTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    marginBottom: 12
  },
  manualText: {
    color: '#475569',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 10
  }
});

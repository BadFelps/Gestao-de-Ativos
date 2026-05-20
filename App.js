import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
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

function CounterCard({ icon, label, value, color }) {
  return (
    <View style={styles.counterCard}>
      <Text style={[styles.counterIcon, { color }]}>{icon}</Text>
      <Text style={styles.counterValue}>{value}</Text>
      <Text style={styles.counterLabel}>{label}</Text>
    </View>
  );
}

const ACTIVE_STATUSES = ['Atribuido', 'Atribu\u00eddo', 'Em Rota', 'No Cliente'];
const DONE_STATUS = 'Conclu\u00eddo';
const OCCURRENCE_STATUS = 'Conclu\u00eddo com Ocorr\u00eancia';
const OCCURRENCE_REASONS = [
  'Porta Fechada',
  'Cliente Recusou',
  'Ativo N\u00e3o Encontrado',
  'Endere\u00e7o Incorreto',
  'Sem Acesso',
  'N\u00e3o deu tempo',
  'Outro'
];

function TaskItem({ item, operatorName, accessCode, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [notes, setNotes] = useState(item.driver_notes || '');
  const [occurrenceReason, setOccurrenceReason] = useState(item.occurrence_reason || '');
  const [occurrenceDetails, setOccurrenceDetails] = useState(item.occurrence_details || '');
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
      await updateEntity('ServiceOrder', item.id, {
        status: DONE_STATUS,
        driver_status: DONE_STATUS,
        driver_notes: notes ? `${notes} | Recolhido: ${summary}` : `Recolhido: ${summary}`,
        driver_collected_assets: collected,
        driver_checkout_time: new Date().toISOString()
      });
      await logAction(`Status -> ${DONE_STATUS}`, notes || summary);
      Alert.alert('Coleta concluida', 'Dados enviados com sucesso.');
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

  const handleOccurrence = async () => {
    if (!occurrenceReason) {
      Alert.alert('Motivo obrigatorio', 'Selecione um motivo para registrar a ocorrencia.');
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
        <Text style={styles.taskTitle}>{item.client_name || 'Cliente sem nome'}</Text>
        <Text style={styles.statusBadge}>{item.status || 'Sem status'}</Text>
      </View>
      <Text style={styles.taskMeta}>OS: {item.os_number || '-'}</Text>
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
                <Text style={styles.occurrenceTitle}>Registrar Ocorrencia</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reasonScroll}>
                  {OCCURRENCE_REASONS.map((reason) => (
                    <TouchableOpacity
                      key={reason}
                      onPress={() => setOccurrenceReason(reason)}
                      style={[styles.reasonChip, occurrenceReason === reason && styles.reasonChipActive]}
                    >
                      <Text style={[styles.reasonChipText, occurrenceReason === reason && styles.reasonChipTextActive]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TextInput
                  value={occurrenceDetails}
                  onChangeText={setOccurrenceDetails}
                  placeholder="Detalhes..."
                  placeholderTextColor="#94a3b8"
                  multiline
                  style={styles.textArea}
                />
                <Button
                  label={loadingAction === 'occurrence' ? 'Enviando...' : 'Registrar Ocorrencia'}
                  onPress={handleOccurrence}
                  variant="red"
                  disabled={!!loadingAction}
                />
              </View>
            </>
          ) : (
            <Text style={styles.mutedText}>Tarefa finalizada. Dados disponiveis para consulta.</Text>
          )}

          {photoUrls.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
              {photoUrls.map((url, index) => (
                <Image key={`${url}-${index}`} source={{ uri: url }} style={styles.photoThumb} />
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
  const [dateFilter, setDateFilter] = useState(todayIso());
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
  const isToday = dateFilter === today;

  const matchesDate = useCallback((order) => (
    order.route_date === dateFilter ||
    order.assigned_date === dateFilter ||
    (!order.route_date && !order.assigned_date && isToday)
  ), [dateFilter, isToday]);

  const active = useMemo(() => orders.filter((order) =>
    ['Atribuido', 'Atribuído', 'Em Rota', 'No Cliente'].includes(order.status) &&
    (isToday || matchesDate(order))
  ), [isToday, matchesDate, orders]);

  const completed = useMemo(() => orders.filter((order) =>
    ['Concluido', 'Concluído', 'Concluido com Ocorrencia', 'Concluído com Ocorrência'].includes(order.status) &&
    matchesDate(order)
  ), [matchesDate, orders]);

  const occurrences = useMemo(() => orders.filter((order) =>
    ['Concluido com Ocorrencia', 'Concluído com Ocorrência'].includes(order.status) &&
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
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.routeTitle}>Minha Rota</Text>
          <Text style={styles.routeSubtitle}>Operador: {operatorName || '-'}</Text>
          <Text style={styles.headerCompanyBadge}>{company}</Text>
        </View>
        <Button label="Sair" onPress={logout} variant="red" style={styles.exitButton} />
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
          <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>Manual</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'manual' ? (
        <ScrollView style={styles.content} contentContainerStyle={styles.manualContent}>
          <Text style={styles.manualTitle}>Manual</Text>
          <Text style={styles.manualText}>Consulte sua rota, confira os dados do PDV e atualize a lista antes de iniciar as visitas.</Text>
          <Text style={styles.manualText}>Em caso de divergencia, entre em contato com a equipe de logistica.</Text>
        </ScrollView>
      ) : (
        <View style={styles.content}>
          <View style={styles.filterRow}>
            <TextInput
              value={dateFilter}
              onChangeText={setDateFilter}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94a3b8"
              style={styles.dateInput}
            />
            <Button label={loading ? '...' : 'Atualizar'} onPress={loadOrders} variant="outline" style={styles.refreshButton} />
          </View>

          {error ? <Text style={styles.routeErrorText}>{error}</Text> : null}

          <View style={styles.counterRow}>
            <CounterCard icon="⌁" label="Ativas" value={active.length} color="#2563eb" />
            <CounterCard icon="✓" label="Feitas" value={completed.length} color="#16a34a" />
            <CounterCard icon="!" label="Ocorrencias" value={occurrences.length} color="#f97316" />
          </View>

          <FlatList
            data={visibleOrders}
            keyExtractor={(item, index) => item.id || `${item.os_number}-${index}`}
            renderItem={({ item }) => (
              <TaskItem
                item={item}
                operatorName={operatorName}
                accessCode={route.params?.code}
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
  taskTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '900'
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
  reasonScroll: {
    marginBottom: 10
  },
  reasonChip: {
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 999,
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginRight: 8
  },
  reasonChipActive: {
    borderColor: '#dc2626',
    backgroundColor: '#dc2626'
  },
  reasonChipText: {
    color: '#991b1b',
    fontSize: 12,
    fontWeight: '800'
  },
  reasonChipTextActive: {
    color: '#ffffff'
  },
  photoStrip: {
    marginTop: 12
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
    marginRight: 8,
    backgroundColor: '#e5e7eb'
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

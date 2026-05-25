import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, StatusBar,
  Animated, Modal, TouchableWithoutFeedback, Pressable,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

const COR_PRINCIPAL = '#F59E0B';
const COR_BG = '#FEF9C3';
const COR_TEXTO = '#92400E';

export default function AlertasScreen() {
  const [alertas, setAlertas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [formAberto, setFormAberto] = useState(false);
  const [notificacoesNovas, setNotificacoesNovas] = useState([]);
  const [menuAberto, setMenuAberto] = useState(null);

  const slideAnim = useRef(new Animated.Value(300)).current;
  const formAnim = useRef(new Animated.Value(0)).current;

  // ── Carregar
  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await api.get('/alertas');
      setAlertas(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar alertas.');
    } finally {
      setCarregando(false);
    }
  }

  async function verificarAlertas() {
    try {
      const { data } = await api.post('/alertas/verificar');
      if (data.notificacoes_geradas > 0) setNotificacoesNovas(data.notificacoes);
    } catch (err) {
      console.warn('Verificação de alertas falhou:', err);
    }
  }

  useFocusEffect(useCallback(() => {
    carregar();
    verificarAlertas();
  }, []));

  // ── Animação formulário
  function toggleForm() {
    if (formAberto) {
      Animated.timing(formAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => setFormAberto(false));
    } else {
      setFormAberto(true);
      Animated.spring(formAnim, { toValue: 1, useNativeDriver: false, bounciness: 4 }).start();
    }
  }

  // ── Bottom sheet
  function abrirMenu(id) {
    setMenuAberto(id);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  }

  function fecharMenu() {
    Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start(() => setMenuAberto(null));
  }

  // ── CRUD
  async function criarAlerta() {
    if (!valor) return Alert.alert('Atenção', 'Informe um valor limite.');
    setSalvando(true);
    try {
      await api.post('/alertas', {
        tipo_alerta: 'limite_despesa',
        descricao: descricao.trim() || 'Alerta de limite de despesas',
        valor_referencia: parseFloat(valor.replace(',', '.')),
      });
      setDescricao('');
      setValor('');
      toggleForm();
      carregar();
    } catch {
      Alert.alert('Erro', 'Não foi possível criar o alerta.');
    } finally {
      setSalvando(false);
    }
  }

  async function toggleAlerta(id, ativo) {
    fecharMenu();
    setAlertas(prev => prev.map(a => a.id_alerta === id ? { ...a, ativo: !a.ativo } : a));
    try {
      await api.patch(`/alertas/${id}/ativar-desativar`);
    } catch {
      setAlertas(prev => prev.map(a => a.id_alerta === id ? { ...a, ativo } : a));
      Alert.alert('Erro', 'Não foi possível alterar o alerta.');
    }
  }

  async function excluirAlerta(id) {
    fecharMenu();
    Alert.alert('Excluir alerta', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          setAlertas(prev => prev.filter(a => a.id_alerta !== id));
          try {
            await api.delete(`/alertas/${id}`);
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir o alerta.');
            carregar();
          }
        },
      },
    ]);
  }

  function dispensarNotificacao(id) {
    setNotificacoesNovas(prev => prev.filter(n => n.id_notificacao !== id));
    api.patch(`/alertas/notificacoes/${id}/lida`).catch(() => {});
  }

  function dispensarTodasNotificacoes() {
    notificacoesNovas.forEach(n => api.patch(`/alertas/notificacoes/${n.id_notificacao}/lida`).catch(() => {}));
    setNotificacoesNovas([]);
  }

  function formatarValor(texto) {
    const numeros = texto.replace(/\D/g, '');
    if (!numeros) return '';
    return (parseInt(numeros) / 100).toFixed(2).replace('.', ',');
  }

  const fmt = v => `R$ ${parseFloat(v).toFixed(2).replace('.', ',')}`;
  const ativos = alertas.filter(a => a.ativo);
  const inativos = alertas.filter(a => !a.ativo);
  const alertaSelecionado = alertas.find(a => a.id_alerta === menuAberto);

  // ── Render item
  function renderAlerta({ item }) {
    return (
      <View style={[s.item, !item.ativo && s.itemInativo]}>
        {/* Barra lateral colorida */}
        <View style={[s.itemBarra, { backgroundColor: item.ativo ? COR_PRINCIPAL : '#CBD5E1' }]} />

        <View style={s.itemConteudo}>
          <View style={s.itemTopo}>
            <View style={[s.itemIconeBox, { backgroundColor: item.ativo ? COR_BG : '#F1F5F9' }]}>
              <Text style={s.itemIcone}>🔔</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.itemDesc, !item.ativo && { color: '#94A3B8' }]} numberOfLines={1}>
                {item.descricao}
              </Text>
              <Text style={[s.itemLimite, { color: item.ativo ? COR_PRINCIPAL : '#94A3B8' }]}>
                Limite: {fmt(item.valor_referencia)}
              </Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: item.ativo ? COR_BG : '#F1F5F9' }]}>
              <Text style={[s.statusTexto, { color: item.ativo ? COR_TEXTO : '#94A3B8' }]}>
                {item.ativo ? 'Ativo' : 'Inativo'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3 pontinhos */}
        <TouchableOpacity
          style={s.menuBotao}
          onPress={() => abrirMenu(item.id_alerta)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <View style={s.dot} />
          <View style={s.dot} />
          <View style={s.dot} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.container}>

        {/* ── Header */}
        <View style={[s.header, { backgroundColor: COR_PRINCIPAL }]}>
          <View style={s.headerCentro}>
            <Text style={s.headerTitulo}>Alertas Financeiros</Text>
            <Text style={s.headerSub}>
              {alertas.length === 0
                ? 'Nenhum alerta configurado'
                : `${ativos.length} ativo${ativos.length !== 1 ? 's' : ''} · ${inativos.length} inativo${inativos.length !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>

        <FlatList
          data={alertas}
          keyExtractor={item => String(item.id_alerta)}
          contentContainerStyle={s.lista}
          showsVerticalScrollIndicator={false}

          ListHeaderComponent={
            <>
              {/* ── Banner de notificações */}
              {notificacoesNovas.length > 0 && (
                <View style={s.notifBanner}>
                  <View style={s.notifBannerTopo}>
                    <Text style={s.notifBannerTitulo}>
                      🔔 {notificacoesNovas.length} alerta{notificacoesNovas.length !== 1 ? 's' : ''} disparado{notificacoesNovas.length !== 1 ? 's' : ''}
                    </Text>
                    <TouchableOpacity onPress={dispensarTodasNotificacoes}>
                      <Text style={s.notifBannerDescartar}>Descartar tudo</Text>
                    </TouchableOpacity>
                  </View>
                  {notificacoesNovas.map(notif => (
                    <View key={notif.id_notificacao} style={s.notifItem}>
                      <Text style={s.notifItemTexto} numberOfLines={3}>{notif.mensagem}</Text>
                      <TouchableOpacity onPress={() => dispensarNotificacao(notif.id_notificacao)}>
                        <Text style={s.notifItemX}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* ── Stats */}
              {alertas.length > 0 && (
                <View style={s.statsRow}>
                  <View style={[s.statCard, { backgroundColor: COR_BG }]}>
                    <Text style={[s.statValor, { color: COR_PRINCIPAL }]}>{ativos.length}</Text>
                    <Text style={s.statLabel}>Ativos</Text>
                  </View>
                  <View style={[s.statCard, { backgroundColor: '#F1F5F9' }]}>
                    <Text style={[s.statValor, { color: '#94A3B8' }]}>{inativos.length}</Text>
                    <Text style={s.statLabel}>Inativos</Text>
                  </View>
                  <View style={[s.statCard, { backgroundColor: '#DBEAFE' }]}>
                    <Text style={[s.statValor, { color: '#1D4ED8' }]}>{alertas.length}</Text>
                    <Text style={s.statLabel}>Total</Text>
                  </View>
                </View>
              )}

              {/* ── Formulário colapsável */}
              {formAberto && (
                <Animated.View style={[s.form, { opacity: formAnim, transform: [{ scaleY: formAnim }] }]}>
                  <Text style={s.formTitulo}>Novo alerta de limite</Text>
                  <Text style={s.formDesc}>
                    Você será notificado quando suas despesas do mês ultrapassarem o valor definido.
                  </Text>

                  <Text style={s.fieldLabel}>DESCRIÇÃO <Text style={s.opcional}>(opcional)</Text></Text>
                  <TextInput
                    style={s.input}
                    placeholder="Ex: Limite mensal de gastos"
                    placeholderTextColor="#CBD5E1"
                    value={descricao}
                    onChangeText={setDescricao}
                  />

                  <Text style={s.fieldLabel}>LIMITE DE DESPESAS</Text>
                  <View style={[s.valorBox, { borderColor: COR_PRINCIPAL }]}>
                    <Text style={[s.valorCifrao, { color: COR_PRINCIPAL }]}>R$</Text>
                    <TextInput
                      style={[s.valorInput, { color: COR_PRINCIPAL }]}
                      placeholder="0,00"
                      placeholderTextColor="#CBD5E1"
                      value={valor}
                      onChangeText={v => setValor(formatarValor(v))}
                      keyboardType="numeric"
                    />
                  </View>

                  <TouchableOpacity
                    style={[s.botaoCriar, { backgroundColor: COR_PRINCIPAL }, salvando && { opacity: 0.6 }]}
                    onPress={criarAlerta}
                    disabled={salvando}
                  >
                    {salvando
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.botaoCriarTexto}>Criar alerta 🔔</Text>
                    }
                  </TouchableOpacity>
                </Animated.View>
              )}

              {alertas.length > 0 && (
                <Text style={s.listaLabel}>SEUS ALERTAS</Text>
              )}
            </>
          }

          ListEmptyComponent={
            !carregando ? (
              <View style={s.vazio}>
                <Text style={s.vazioIcone}>🔕</Text>
                <Text style={s.vazioTitulo}>Nenhum alerta ainda</Text>
                <Text style={s.vazioDesc}>
                  Crie um alerta para ser notificado quando suas despesas ultrapassarem um limite.
                </Text>
                <TouchableOpacity
                  style={[s.botaoCriarVazio, { backgroundColor: COR_PRINCIPAL }]}
                  onPress={toggleForm}
                >
                  <Text style={s.botaoCriarVazioTexto}>+ Criar primeiro alerta</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }

          renderItem={renderAlerta}
        />

        {/* ── Botão flutuante novo alerta */}
        <TouchableOpacity
          style={[s.fab, { backgroundColor: formAberto ? '#64748B' : COR_PRINCIPAL }]}
          onPress={toggleForm}
        >
          <Text style={s.fabTexto}>{formAberto ? '✕ Cancelar' : '+ Novo alerta'}</Text>
        </TouchableOpacity>

        {carregando && (
          <ActivityIndicator color={COR_PRINCIPAL} style={s.loader} size="large" />
        )}

      </View>

      {/* ── Bottom sheet de opções */}
      <Modal visible={menuAberto !== null} transparent animationType="none">
        <TouchableWithoutFeedback onPress={fecharMenu}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>

                <View style={s.sheetHandle} />

                {alertaSelecionado && (
                  <View style={s.sheetInfo}>
                    <View style={[s.sheetIconeBox, { backgroundColor: alertaSelecionado.ativo ? COR_BG : '#F1F5F9' }]}>
                      <Text style={{ fontSize: 22 }}>🔔</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sheetDescricao} numberOfLines={1}>{alertaSelecionado.descricao}</Text>
                      <Text style={[s.sheetLimite, { color: COR_PRINCIPAL }]}>
                        Limite: {fmt(alertaSelecionado.valor_referencia)}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={s.sheetDivisor} />

                {/* Toggle ativar/desativar */}
                {alertaSelecionado && (
                  <Pressable
                    style={({ pressed }) => [s.sheetOpcao, { backgroundColor: alertaSelecionado.ativo ? '#F0FDF4' : COR_BG }, pressed && { opacity: 0.75 }]}
                    onPress={() => toggleAlerta(menuAberto, alertaSelecionado.ativo)}
                  >
                    <Text style={s.sheetOpcaoIcone}>{alertaSelecionado.ativo ? '🔕' : '🔔'}</Text>
                    <View>
                      <Text style={[s.sheetOpcaoTexto, { color: alertaSelecionado.ativo ? '#16A34A' : COR_PRINCIPAL }]}>
                        {alertaSelecionado.ativo ? 'Desativar alerta' : 'Ativar alerta'}
                      </Text>
                      <Text style={s.sheetOpcaoSub}>
                        {alertaSelecionado.ativo ? 'Pausar notificações temporariamente' : 'Retomar notificações'}
                      </Text>
                    </View>
                  </Pressable>
                )}

                {/* Excluir */}
                <Pressable
                  style={({ pressed }) => [s.sheetOpcao, { backgroundColor: '#FFF5F5', marginTop: 8 }, pressed && { opacity: 0.75 }]}
                  onPress={() => excluirAlerta(menuAberto)}
                >
                  <Text style={s.sheetOpcaoIcone}>🗑️</Text>
                  <View>
                    <Text style={[s.sheetOpcaoTexto, { color: '#DC2626' }]}>Excluir alerta</Text>
                    <Text style={s.sheetOpcaoSub}>Esta ação não pode ser desfeita</Text>
                  </View>
                </Pressable>

                {/* Cancelar */}
                <Pressable
                  style={({ pressed }) => [s.sheetCancelar, pressed && { opacity: 0.75 }]}
                  onPress={fecharMenu}
                >
                  <Text style={s.sheetCancelarTexto}>Cancelar</Text>
                </Pressable>

              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  // ── Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerCentro: { alignItems: 'center' },
  headerIcone: { fontSize: 32, marginBottom: 6 },
  headerTitulo: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  // ── Lista
  lista: { padding: 16, paddingBottom: 100 },

  listaLabel: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 1, marginBottom: 10, marginTop: 4,
  },

  loader: { marginTop: 60 },

  // ── Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center' },
  statValor: { fontSize: 22, fontWeight: 'bold', marginBottom: 2 },
  statLabel: { fontSize: 12, color: '#64748B', fontWeight: '500' },

  // ── Banner notificações
  notifBanner: {
    backgroundColor: '#FFF7ED', borderLeftWidth: 4, borderLeftColor: COR_PRINCIPAL,
    borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  notifBannerTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  notifBannerTitulo: { fontSize: 14, fontWeight: '700', color: '#92400E' },
  notifBannerDescartar: { fontSize: 13, color: '#B45309', fontWeight: '600' },
  notifItem: {
    flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB',
    borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#FDE68A', gap: 8,
  },
  notifItemTexto: { flex: 1, fontSize: 13, color: '#78350F', lineHeight: 18 },
  notifItemX: { fontSize: 14, color: '#B45309', fontWeight: '700', paddingHorizontal: 4 },

  // ── Formulário
  form: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    transformOrigin: 'top',
  },
  formTitulo: { fontSize: 16, fontWeight: '700', color: '#1E293B', marginBottom: 4 },
  formDesc: { fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 18 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#475569', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  opcional: { fontSize: 11, color: '#94A3B8', fontWeight: '400', textTransform: 'none' },
  input: {
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 14, padding: 14, fontSize: 15, color: '#1E293B', marginBottom: 16,
  },
  valorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 14,
    borderWidth: 2, paddingHorizontal: 16, marginBottom: 16,
  },
  valorCifrao: { fontSize: 18, fontWeight: '700', marginRight: 8 },
  valorInput: { flex: 1, fontSize: 28, fontWeight: 'bold', paddingVertical: 14 },
  botaoCriar: {
    borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  botaoCriarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // ── Item
  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, marginBottom: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  itemInativo: { opacity: 0.6 },
  itemBarra: { width: 4, alignSelf: 'stretch' },
  itemConteudo: { flex: 1, padding: 14 },
  itemTopo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemIconeBox: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemIcone: { fontSize: 20 },
  itemDesc: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 2 },
  itemLimite: { fontSize: 13, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusTexto: { fontSize: 11, fontWeight: '700' },

  // ── 3 pontinhos
  menuBotao: { paddingHorizontal: 14, paddingVertical: 16, gap: 3, alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 999, backgroundColor: '#CBD5E1' },

  // ── FAB
  fab: {
    position: 'absolute', bottom: 24, left: 24, right: 24,
    borderRadius: 16, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
  },
  fabTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // ── Estado vazio
  vazio: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  vazioIcone: { fontSize: 52, marginBottom: 16 },
  vazioTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  vazioDesc: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  botaoCriarVazio: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  botaoCriarVazioTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // ── Overlay / Bottom sheet
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 999,
    backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20,
  },
  sheetInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  sheetIconeBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sheetDescricao: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  sheetLimite: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  sheetDivisor: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  sheetOpcao: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 14,
  },
  sheetOpcaoIcone: { fontSize: 22 },
  sheetOpcaoTexto: { fontSize: 15, fontWeight: '700' },
  sheetOpcaoSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  sheetCancelar: {
    padding: 16, borderRadius: 14, backgroundColor: '#F1F5F9',
    alignItems: 'center', marginTop: 8,
  },
  sheetCancelarTexto: { fontSize: 15, fontWeight: '600', color: '#64748B' },
});
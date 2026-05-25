import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Animated,
  TouchableWithoutFeedback, Pressable, Platform, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

const COR = '#2563EB';
const COR_BG = '#DBEAFE';
const COR_TEXTO = '#1E40AF';

const CORES     = { receita: '#16A34A', despesa: '#DC2626', investimento: '#CA8A04', custo: '#9333EA' };
const CORES_BG  = { receita: '#DCFCE7', despesa: '#FEE2E2', investimento: '#FEF9C3', custo: '#F3E8FF' };
const LABELS    = { receita: 'Receita',  despesa: 'Despesa',  investimento: 'Investimento',  custo: 'Custo' };

export default function LancamentosScreen({ navigation }) {
  const [lancamentos, setLancamentos]   = useState([]);
  const [carregando, setCarregando]     = useState(true);
  const [excluindo, setExcluindo]       = useState(null);
  const [menuAberto, setMenuAberto]     = useState(null);
  const slideAnim = useRef(new Animated.Value(300)).current;

  async function carregar() {
    setCarregando(true);
    try {
      const { data } = await api.get('/lancamentos');
      setLancamentos(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os lançamentos.');
    } finally {
      setCarregando(false);
    }
  }

  useFocusEffect(useCallback(() => { carregar(); }, []));

  function abrirMenu(id) {
    setMenuAberto(id);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
  }

  function fecharMenu() {
    Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true })
      .start(() => setMenuAberto(null));
  }

  async function excluir(id) {
    fecharMenu();
    Alert.alert('Excluir lançamento', 'Esta ação não pode ser desfeita.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          setExcluindo(id);
          try {
            await api.delete(`/lancamentos/${id}`);
            setLancamentos(prev => prev.filter(l => l.id_lancamento !== id));
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir o lançamento.');
          } finally {
            setExcluindo(null);
          }
        },
      },
    ]);
  }

  // ── Stats resumo
  const totalReceitas    = lancamentos.filter(l => l.tipo === 'receita').reduce((a, l) => a + parseFloat(l.valor), 0);
  const totalSaidas      = lancamentos.filter(l => l.tipo !== 'receita').reduce((a, l) => a + parseFloat(l.valor), 0);
  const fmt = v => `R$ ${(v ?? 0).toFixed(2).replace('.', ',')}`;

  const lancamentoSelecionado = lancamentos.find(l => l.id_lancamento === menuAberto);

  function renderItem({ item }) {
    const isExcluindo = excluindo === item.id_lancamento;
    const cor   = CORES[item.tipo];
    const corBg = CORES_BG[item.tipo];

    return (
      <View style={s.item}>
        <View style={[s.itemBarra, { backgroundColor: cor }]} />

        <View style={[s.itemIcone, { backgroundColor: corBg }]}>
          <View style={[s.itemDot, { backgroundColor: cor }]} />
        </View>

        <View style={s.itemInfo}>
          <Text style={s.itemDesc} numberOfLines={1}>
            {item.descricao || item.categoria?.nome || LABELS[item.tipo]}
          </Text>
          <View style={s.itemMetaRow}>
            {item.categoria?.nome && (
              <View style={[s.catBadge, { backgroundColor: corBg }]}>
                <Text style={[s.catBadgeTexto, { color: cor }]}>{item.categoria.nome}</Text>
              </View>
            )}
            <Text style={s.itemData}>
              {new Date(item.data_lancamento + 'T12:00:00').toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>

        <View style={s.itemDireita}>
          <Text style={[s.itemValor, { color: cor }]}>
            {item.tipo === 'receita' ? '+' : '−'} {fmt(parseFloat(item.valor))}
          </Text>
          {isExcluindo ? (
            <ActivityIndicator size="small" color="#94A3B8" style={{ marginTop: 6 }} />
          ) : (
            <TouchableOpacity
              style={s.menuBotao}
              onPress={() => abrirMenu(item.id_lancamento)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <View style={s.dot} />
              <View style={s.dot} />
              <View style={s.dot} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={s.container}>

      {/* ── Header */}
      <View style={[s.header, { backgroundColor: COR }]}>
        <View style={s.headerCentro}>
          <Text style={s.headerTitulo}>Lançamentos</Text>
          <Text style={s.headerSub}>
            {lancamentos.length === 0
              ? 'Nenhum lançamento registrado'
              : `${lancamentos.length} lançamento${lancamentos.length !== 1 ? 's' : ''}`}
          </Text>
        </View>
        <TouchableOpacity
          style={s.headerBotao}
          onPress={() => navigation.navigate('NovoLancamento')}
        >
          <Text style={s.headerBotaoTexto}>+ Novo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={lancamentos}
        keyExtractor={item => String(item.id_lancamento)}
        contentContainerStyle={s.lista}
        showsVerticalScrollIndicator={false}

        ListHeaderComponent={
          lancamentos.length > 0 ? (
            <>
              {/* ── Stats */}
              <View style={s.statsRow}>
                <View style={[s.statCard, { backgroundColor: '#DCFCE7' }]}>
                  <Text style={[s.statValor, { color: '#16A34A' }]}>{fmt(totalReceitas)}</Text>
                  <Text style={s.statLabel}>Entradas</Text>
                </View>
                <View style={[s.statCard, { backgroundColor: '#FEE2E2' }]}>
                  <Text style={[s.statValor, { color: '#DC2626' }]}>{fmt(totalSaidas)}</Text>
                  <Text style={s.statLabel}>Saídas</Text>
                </View>
                <View style={[s.statCard, { backgroundColor: COR_BG }]}>
                  <Text style={[s.statValor, { color: COR }]}>{lancamentos.length}</Text>
                  <Text style={s.statLabel}>Total</Text>
                </View>
              </View>

              <Text style={s.listaLabel}>TODOS OS LANÇAMENTOS</Text>
            </>
          ) : null
        }

        ListEmptyComponent={
          !carregando ? (
            <View style={s.vazio}>
              <View style={[s.vazioIconeBox, { backgroundColor: COR_BG }]}>
                <View style={[s.vazioDot, { backgroundColor: COR }]} />
              </View>
              <Text style={s.vazioTitulo}>Nenhum lançamento ainda</Text>
              <Text style={s.vazioDesc}>
                Registre receitas, despesas, custos e investimentos para acompanhar seu fluxo de caixa.
              </Text>
              <TouchableOpacity
                style={[s.vazioBtn, { backgroundColor: COR }]}
                onPress={() => navigation.navigate('NovoLancamento')}
              >
                <Text style={s.vazioBtnTexto}>+ Novo lançamento</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }

        renderItem={renderItem}
      />

      {carregando && (
        <ActivityIndicator color={COR} style={s.loader} size="large" />
      )}

      {/* ── Bottom sheet */}
      <Modal visible={menuAberto !== null} transparent animationType="none">
        <TouchableWithoutFeedback onPress={fecharMenu}>
          <View style={s.overlay}>
            <TouchableWithoutFeedback>
              <Animated.View style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}>

                <View style={s.sheetHandle} />

                {lancamentoSelecionado && (
                  <View style={s.sheetInfo}>
                    <View style={[s.sheetIconeBox, { backgroundColor: CORES_BG[lancamentoSelecionado.tipo] }]}>
                      <View style={[s.sheetDot, { backgroundColor: CORES[lancamentoSelecionado.tipo] }]} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.sheetDescricao} numberOfLines={1}>
                        {lancamentoSelecionado.descricao || lancamentoSelecionado.categoria?.nome || LABELS[lancamentoSelecionado.tipo]}
                      </Text>
                      <Text style={[s.sheetValor, { color: CORES[lancamentoSelecionado.tipo] }]}>
                        {fmt(parseFloat(lancamentoSelecionado.valor))}
                      </Text>
                    </View>
                    <View style={[s.tipoBadge, { backgroundColor: CORES_BG[lancamentoSelecionado.tipo] }]}>
                      <Text style={[s.tipoBadgeTexto, { color: CORES[lancamentoSelecionado.tipo] }]}>
                        {LABELS[lancamentoSelecionado.tipo]}
                      </Text>
                    </View>
                  </View>
                )}

                <View style={s.sheetDivisor} />

                <Pressable
                  style={({ pressed }) => [s.sheetOpcao, { backgroundColor: '#FFF5F5' }, pressed && { opacity: 0.75 }]}
                  onPress={() => excluir(menuAberto)}
                >
                  <View style={[s.sheetOpcaoIconeBox, { backgroundColor: '#FEE2E2' }]}>
                    <View style={{ width: 14, height: 14, borderRadius: 3, backgroundColor: '#DC2626' }} />
                  </View>
                  <View>
                    <Text style={[s.sheetOpcaoTexto, { color: '#DC2626' }]}>Excluir lançamento</Text>
                    <Text style={s.sheetOpcaoSub}>Esta ação não pode ser desfeita</Text>
                  </View>
                </Pressable>

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

    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  // ── Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 12,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerCentro: { flex: 1 },
  headerTitulo: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  headerBotao: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 12,
  },
  headerBotaoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // ── Lista
  lista: { padding: 16, paddingBottom: 40 },
  loader: { position: 'absolute', top: '50%', alignSelf: 'center' },

  // ── Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center' },
  statValor: { fontSize: 13, fontWeight: 'bold', marginBottom: 3, textAlign: 'center' },
  statLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },

  listaLabel: {
    fontSize: 11, fontWeight: '700', color: '#94A3B8',
    letterSpacing: 1, marginBottom: 10,
  },

  // ── Item
  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 16, marginBottom: 10, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  itemBarra: { width: 4, alignSelf: 'stretch' },
  itemIcone: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12, marginRight: 12, marginVertical: 14,
  },
  itemDot: { width: 14, height: 14, borderRadius: 999 },
  itemInfo: { flex: 1, paddingVertical: 14 },
  itemDesc: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginBottom: 4 },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  catBadgeTexto: { fontSize: 11, fontWeight: '600' },
  itemData: { fontSize: 11, color: '#94A3B8' },
  itemDireita: { alignItems: 'flex-end', paddingRight: 14, gap: 6 },
  itemValor: { fontSize: 14, fontWeight: 'bold' },

  // ── 3 pontinhos
  menuBotao: { padding: 4, gap: 3, alignItems: 'center' },
  dot: { width: 4, height: 4, borderRadius: 999, backgroundColor: '#CBD5E1' },

  // ── Estado vazio
  vazio: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 32 },
  vazioIconeBox: {
    width: 64, height: 64, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  vazioDot: { width: 20, height: 20, borderRadius: 999 },
  vazioTitulo: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 8 },
  vazioDesc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  vazioBtn: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 14 },
  vazioBtnTexto: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

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
  sheetIconeBox: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetDot: { width: 16, height: 16, borderRadius: 999 },
  sheetDescricao: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  sheetValor: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  tipoBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  tipoBadgeTexto: { fontSize: 12, fontWeight: '700' },
  sheetDivisor: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  sheetOpcao: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 16, borderRadius: 14, marginBottom: 8,
  },
  sheetOpcaoIconeBox: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetOpcaoTexto: { fontSize: 15, fontWeight: '700' },
  sheetOpcaoSub: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  sheetCancelar: {
    padding: 16, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center',
  },
  sheetCancelarTexto: { fontSize: 15, fontWeight: '600', color: '#64748B' },
});
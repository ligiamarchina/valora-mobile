import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Modal,
  Platform, StatusBar, Pressable,
} from 'react-native';
import { Calendar } from 'react-native-calendars';

import api from '../services/api';

const COR = '#8B5CF6';
const COR_BG = '#EDE9FE';
const COR_TEXTO = '#5B21B6';

const CATEGORIAS = [
  { key: 'receita',      label: 'Receitas',      cor: '#16A34A', bg: '#DCFCE7' },
  { key: 'despesa',      label: 'Despesas',      cor: '#DC2626', bg: '#FEE2E2' },
  { key: 'investimento', label: 'Investimentos', cor: '#CA8A04', bg: '#FEF9C3' },
  { key: 'custo',        label: 'Custos',        cor: '#9333EA', bg: '#F3E8FF' },
];

export default function RelatoriosScreen() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [relatorio, setRelatorio] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [mostrarCalInicio, setMostrarCalInicio] = useState(false);
  const [mostrarCalFim, setMostrarCalFim] = useState(false);

  async function gerar() {
    if (!dataInicio || !dataFim) return Alert.alert('Atenção', 'Selecione as duas datas.');
    if (dataInicio > dataFim) return Alert.alert('Atenção', 'A data início deve ser antes da data fim.');
    setCarregando(true);
    try {
      const { data } = await api.get(`/relatorios/fluxo-de-caixa?data_inicio=${dataInicio}&data_fim=${dataFim}`);
      setRelatorio(data);
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o relatório.');
    } finally {
      setCarregando(false);
    }
  }

  const fmt = v => `R$ ${(v ?? 0).toFixed(2).replace('.', ',')}`;

  function formatarDataExtenso(str) {
    if (!str) return null;
    return new Date(str + 'T12:00:00').toLocaleDateString('pt-BR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
  }

  function formatarDataCurta(str) {
    if (!str) return null;
    return new Date(str + 'T12:00:00').toLocaleDateString('pt-BR');
  }

  const saldoPositivo = (relatorio?.saldo ?? 0) >= 0;
  const totalMovimentado = relatorio
    ? Object.values(relatorio.totais).reduce((a, b) => a + (b || 0), 0)
    : 0;

  return (
    <View style={s.container}>

      {/* ── Header */}
      <View style={[s.header, { backgroundColor: COR }]}>
        <View style={s.headerCentro}>
          <Text style={s.headerTitulo}>Relatórios</Text>
          <Text style={s.headerSub}>Fluxo de caixa por período</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Seleção de período */}
        <View style={s.secao}>
          <Text style={s.secaoLabel}>Período</Text>

          <View style={s.datasRow}>
            {/* Data início */}
            <TouchableOpacity
              style={[s.dataBox, dataInicio && { borderColor: COR, backgroundColor: COR_BG }]}
              onPress={() => setMostrarCalInicio(true)}
            >
              <Text style={s.dataBoxLabel}>INÍCIO</Text>
              {dataInicio ? (
                <Text style={[s.dataBoxValor, { color: COR }]}>{formatarDataCurta(dataInicio)}</Text>
              ) : (
                <Text style={s.dataBoxPlaceholder}>Selecionar</Text>
              )}
              <Text style={[s.dataBoxChevron, dataInicio && { color: COR }]}>›</Text>
            </TouchableOpacity>

            <View style={s.datasSeparador}>
              <View style={s.datasSeparadorLinha} />
              <Text style={s.datasSeparadorTexto}>até</Text>
              <View style={s.datasSeparadorLinha} />
            </View>

            {/* Data fim */}
            <TouchableOpacity
              style={[s.dataBox, dataFim && { borderColor: COR, backgroundColor: COR_BG }]}
              onPress={() => setMostrarCalFim(true)}
            >
              <Text style={s.dataBoxLabel}>FIM</Text>
              {dataFim ? (
                <Text style={[s.dataBoxValor, { color: COR }]}>{formatarDataCurta(dataFim)}</Text>
              ) : (
                <Text style={s.dataBoxPlaceholder}>Selecionar</Text>
              )}
              <Text style={[s.dataBoxChevron, dataFim && { color: COR }]}>›</Text>
            </TouchableOpacity>
          </View>

          {dataInicio && dataFim && (
            <View style={[s.periodoResumo, { backgroundColor: COR_BG }]}>
              <Text style={[s.periodoResumoTexto, { color: COR_TEXTO }]}>
                {formatarDataExtenso(dataInicio)} — {formatarDataExtenso(dataFim)}
              </Text>
            </View>
          )}
        </View>

        {/* ── Botão gerar */}
        <TouchableOpacity
          style={[s.botaoGerar, { backgroundColor: COR }, carregando && { opacity: 0.7 }]}
          onPress={gerar}
          disabled={carregando}
        >
          {carregando
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.botaoGerarTexto}>Gerar relatório</Text>
          }
        </TouchableOpacity>

        {/* ── Resultado */}
        {relatorio && (
          <>
            {/* Card saldo */}
            <View style={[s.saldoCard, { backgroundColor: saldoPositivo ? '#1D4ED8' : '#B91C1C' }]}>
              <View style={s.saldoCardTopo}>
                <Text style={s.saldoCardLabel}>Saldo do período</Text>
                <View style={s.saldoPill}>
                  <Text style={s.saldoPillTexto}>
                    {saldoPositivo ? 'Positivo' : 'Negativo'}
                  </Text>
                </View>
              </View>
              <Text style={s.saldoCardValor}>{fmt(relatorio.saldo)}</Text>
              <View style={s.saldoDivisor} />
              <View style={s.saldoRodape}>
                <View style={s.saldoMini}>
                  <Text style={s.saldoMiniLabel}>Entradas</Text>
                  <Text style={s.saldoMiniValor}>{fmt(relatorio.totais.receita)}</Text>
                </View>
                <View style={s.saldoSep} />
                <View style={s.saldoMini}>
                  <Text style={s.saldoMiniLabel}>Saídas</Text>
                  <Text style={s.saldoMiniValor}>
                    {fmt((relatorio.totais.despesa || 0) + (relatorio.totais.custo || 0))}
                  </Text>
                </View>
                <View style={s.saldoSep} />
                <View style={s.saldoMini}>
                  <Text style={s.saldoMiniLabel}>Movimentado</Text>
                  <Text style={s.saldoMiniValor}>{fmt(totalMovimentado)}</Text>
                </View>
              </View>
            </View>

            {/* Detalhamento */}
            <View style={s.secao}>
              <Text style={s.secaoLabel}>Detalhamento</Text>

              {CATEGORIAS.map((cat, i) => {
                const val = relatorio.totais[cat.key] ?? 0;
                const pct = totalMovimentado > 0
                  ? ((val / totalMovimentado) * 100).toFixed(1)
                  : 0;

                return (
                  <View key={cat.key} style={[s.catRow, i < CATEGORIAS.length - 1 && s.catRowBorder]}>
                    <View style={[s.catIcone, { backgroundColor: cat.bg }]}>
                      <View style={[s.catDot, { backgroundColor: cat.cor }]} />
                    </View>
                    <View style={s.catInfo}>
                      <Text style={s.catNome}>{cat.label}</Text>
                      <View style={s.barraFundo}>
                        <View style={[s.barraPreench, { width: `${pct}%`, backgroundColor: cat.cor }]} />
                      </View>
                    </View>
                    <View style={s.catDireita}>
                      <Text style={[s.catValor, { color: cat.cor }]}>{fmt(val)}</Text>
                      <View style={[s.catPctBadge, { backgroundColor: cat.bg }]}>
                        <Text style={[s.catPctTexto, { color: cat.cor }]}>{pct}%</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

      </ScrollView>

      {/* ── Modais calendário */}
      {[
        { visivel: mostrarCalInicio, fechar: () => setMostrarCalInicio(false), titulo: 'Data início', valor: dataInicio, onDia: d => { setDataInicio(d.dateString); setMostrarCalInicio(false); } },
        { visivel: mostrarCalFim,    fechar: () => setMostrarCalFim(false),    titulo: 'Data fim',    valor: dataFim,    onDia: d => { setDataFim(d.dateString);    setMostrarCalFim(false);    }, minDate: dataInicio || undefined },
      ].map(({ visivel, fechar, titulo, valor, onDia, minDate }) => (
        <Modal key={titulo} visible={visivel} transparent animationType="fade">
          <Pressable style={s.modalOverlay} onPress={fechar}>
            <Pressable>
              <View style={s.modalBox}>
                <View style={[s.modalHeader, { backgroundColor: COR }]}>
                  <Text style={s.modalTitulo}>{titulo}</Text>
                </View>
                <Calendar
                  onDayPress={onDia}
                  minDate={minDate}
                  markedDates={valor ? { [valor]: { selected: true, selectedColor: COR } } : {}}
                  theme={{
                    todayTextColor: COR,
                    selectedDayBackgroundColor: COR,
                    arrowColor: COR,
                    dotColor: COR,
                  }}
                />
                <TouchableOpacity style={s.modalCancelar} onPress={fechar}>
                  <Text style={s.modalCancelarTexto}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ))}

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
    alignItems: 'center',
  },
  headerCentro: { alignItems: 'center' },
  headerTitulo: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  // ── Scroll
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 48 },

  // ── Seções
  secao: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  secaoLabel: {
    fontSize: 11, fontWeight: '700', color: '#475569',
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 14,
  },

  // ── Datas
  datasRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dataBox: {
    flex: 1, backgroundColor: '#F8FAFC',
    borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  dataBoxLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', letterSpacing: 0.5 },
  dataBoxValor: { flex: 1, fontSize: 14, fontWeight: '700' },
  dataBoxPlaceholder: { flex: 1, fontSize: 13, color: '#CBD5E1' },
  dataBoxChevron: { fontSize: 20, color: '#CBD5E1' },
  datasSeparador: { alignItems: 'center', gap: 4 },
  datasSeparadorLinha: { width: 1, height: 12, backgroundColor: '#E2E8F0' },
  datasSeparadorTexto: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  periodoResumo: {
    marginTop: 14, borderRadius: 12, padding: 12, alignItems: 'center',
  },
  periodoResumoTexto: { fontSize: 12, fontWeight: '600', textAlign: 'center' },

  // ── Botão gerar
  botaoGerar: {
    borderRadius: 18, padding: 18, alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  botaoGerarTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // ── Card saldo
  saldoCard: {
    borderRadius: 24, padding: 24, marginBottom: 16,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, elevation: 5,
  },
  saldoCardTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  saldoCardLabel: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  saldoPill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 },
  saldoPillTexto: { fontSize: 12, color: '#fff', fontWeight: '600' },
  saldoCardValor: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  saldoDivisor: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
  saldoRodape: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saldoSep: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  saldoMini: { flex: 1, alignItems: 'center' },
  saldoMiniLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  saldoMiniValor: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // ── Detalhamento
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  catRowBorder: { borderBottomWidth: 1, borderColor: '#F1F5F9' },
  catIcone: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catDot: { width: 12, height: 12, borderRadius: 999 },
  catInfo: { flex: 1, gap: 6 },
  catNome: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  barraFundo: { height: 5, backgroundColor: '#F1F5F9', borderRadius: 999, overflow: 'hidden' },
  barraPreench: { height: 5, borderRadius: 999 },
  catDireita: { alignItems: 'flex-end', gap: 4 },
  catValor: { fontSize: 15, fontWeight: '700' },
  catPctBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  catPctTexto: { fontSize: 11, fontWeight: '700' },

  // ── Modal calendário
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', padding: 20,
  },
  modalBox: { backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden' },
  modalHeader: { padding: 16, alignItems: 'center' },
  modalTitulo: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalCancelar: { padding: 16, alignItems: 'center', borderTopWidth: 1, borderColor: '#F1F5F9' },
  modalCancelarTexto: { color: '#EF4444', fontWeight: 'bold', fontSize: 15 },
});
import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity, Dimensions,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const LARGURA = Dimensions.get('window').width;

const AZUL    = '#2660A4';
const AMBAR   = '#ECA400';
const VERDE   = '#23967F';
const PRETO   = '#050505';
const FUNDO   = '#EDF7F6';
const VERMELHO = '#DC2626';
const ROXO    = '#7C3AED';

const CATEGORIAS = [
  { key: 'receita',      nome: 'Receitas',      cor: VERDE,    bg: '#ECFDF5', textoCor: '#065F46' },
  { key: 'despesa',      nome: 'Despesas',      cor: VERMELHO, bg: '#FEE2E2', textoCor: '#991B1B' },
  { key: 'custo',        nome: 'Custos',        cor: ROXO,     bg: '#F5F3FF', textoCor: '#5B21B6' },
  { key: 'investimento', nome: 'Investimentos', cor: AMBAR,    bg: '#FFF8E6', textoCor: '#92400E' },
];

export default function HomeScreen() {
  const { usuario, logout } = useAuth();
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      const hoje = new Date();
      const ano = hoje.getFullYear();
      const mes = String(hoje.getMonth() + 1).padStart(2, '0');
      const inicio = `${ano}-${mes}-01`;
      const ultimoDia = new Date(ano, hoje.getMonth() + 1, 0).getDate();
      const fim = `${ano}-${mes}-${ultimoDia}`;
      const { data } = await api.get(`/relatorios/fluxo-de-caixa?data_inicio=${inicio}&data_fim=${fim}`);
      setResumo(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }

  const fmt = (v) => `R$ ${(v ?? 0).toFixed(2).replace('.', ',')}`;
  const saldoPositivo = (resumo?.saldo ?? 0) >= 0;

  const dadosGrafico = CATEGORIAS
    .map((cat) => ({
      name: cat.nome,
      population: resumo?.totais?.[cat.key] || 0,
      color: cat.cor,
      legendFontColor: PRETO,
      legendFontSize: 12,
    }))
    .filter((d) => d.population > 0);

  const temDados = dadosGrafico.length > 0;
  const totalMovimentado = dadosGrafico.reduce((acc, d) => acc + d.population, 0);

  return (
    <ScrollView
      style={s.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerInfo}>
          <Text style={s.ola}>Olá, {usuario?.nome?.split(' ')[0]}</Text>
          <Text style={s.sub}>Resumo financeiro do mês atual</Text>
        </View>

        <TouchableOpacity onPress={logout} style={s.sairBotao}>
          <Text style={s.sair}>Sair</Text>
        </TouchableOpacity>
      </View>

      {carregando ? (
        <ActivityIndicator color={AZUL} style={{ marginTop: 80 }} size="large" />
      ) : (
        <>
          {/* Card saldo */}
          <View style={[
            s.saldoCard,
            { backgroundColor: saldoPositivo ? AZUL : VERMELHO }
          ]}>
            <View style={s.saldoTopo}>
              <Text style={s.saldoLabel}>Saldo do mês</Text>
              <View style={s.saldoStatusPill}>
                <Text style={s.saldoStatusTexto}>
                  {saldoPositivo ? 'Positivo' : 'Negativo'}
                </Text>
              </View>
            </View>

            <Text style={s.saldoValor}>{fmt(resumo?.saldo)}</Text>

            <View style={s.saldoDivisor} />

            <View style={s.saldoRodape}>
              <View style={s.saldoMiniItem}>
                <Text style={s.saldoMiniLabel}>Receitas</Text>
                <Text style={s.saldoMiniValor}>{fmt(resumo?.totais?.receita)}</Text>
              </View>
              <View style={s.saldoSeparador} />
              <View style={s.saldoMiniItem}>
                <Text style={s.saldoMiniLabel}>Saídas totais</Text>
                <Text style={s.saldoMiniValor}>
                  {fmt((resumo?.totais?.despesa || 0) + (resumo?.totais?.custo || 0))}
                </Text>
              </View>
              <View style={s.saldoSeparador} />
              <View style={s.saldoMiniItem}>
                <Text style={s.saldoMiniLabel}>Investimentos</Text>
                <Text style={s.saldoMiniValor}>
                  {fmt(resumo?.totais?.investimento || 0)}
                </Text>
              </View>
            </View>
          </View>

          {/* Distribuição */}
          <View style={s.secao}>
            <Text style={s.secaoTitulo}>Distribuição do mês</Text>

            {temDados ? (
              <>
                <View style={s.graficoWrapper}>
                  <PieChart
                    data={dadosGrafico}
                    width={LARGURA - 32}
                    height={220}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(5, 5, 5, ${opacity})`,
                    }}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft={String((LARGURA - 32) / 4.4)}
                    hasLegend={false}
                    absolute={false}
                  />
                </View>

                <View style={s.legendaGrid}>
                  {dadosGrafico.map((item) => {
                    const cat = CATEGORIAS.find((c) => c.nome === item.name);
                    const pct = totalMovimentado
                      ? ((item.population / totalMovimentado) * 100).toFixed(1).replace('.', ',')
                      : '0,0';

                    return (
                      <View key={item.name} style={s.legendaCell}>
                        <View style={s.legendaTopo}>
                          <View style={[s.legendaDot, { backgroundColor: item.color }]} />
                          <Text style={s.legendaNome} numberOfLines={1}>
                            {item.name}
                          </Text>
                        </View>

                        <Text style={s.legendaValor}>{fmt(item.population)}</Text>

                        <View style={[s.legendaBadge, { backgroundColor: cat?.bg ?? '#F1F5F9' }]}>
                          <Text style={[s.legendaBadgeTexto, { color: cat?.textoCor ?? '#475569' }]}>
                            {pct}%
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={s.semDados}>
                <View style={s.semDadosIconeWrap}>
                  <View style={s.semDadosIcone} />
                </View>
                <Text style={s.semDadosTexto}>Nenhum lançamento este mês</Text>
                <Text style={s.semDadosSub}>
                  Cadastre movimentações para visualizar a distribuição do período.
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: FUNDO },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 56,
    backgroundColor: AZUL,
  },
  headerInfo: { flex: 1, paddingRight: 12 },
  ola: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  sub: { fontSize: 13, color: 'rgba(255,255,255,0.82)', marginTop: 4 },
  sairBotao: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  sair: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

  saldoCard: {
    marginTop: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  saldoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  saldoLabel: { fontSize: 14, color: 'rgba(255,255,255,0.75)' },
  saldoStatusPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
  },
  saldoStatusTexto: { fontSize: 12, color: '#fff', fontWeight: '600' },
  saldoValor: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginBottom: 20 },
  saldoDivisor: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginBottom: 16 },
  saldoRodape: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  saldoSeparador: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },
  saldoMiniItem: { flex: 1, alignItems: 'center' },
  saldoMiniLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  saldoMiniValor: { fontSize: 13, fontWeight: '700', color: '#fff', textAlign: 'center' },

  secao: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  secaoTitulo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  graficoWrapper: {
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: FUNDO,
    marginBottom: 16,
  },

  legendaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendaCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: FUNDO,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  legendaTopo: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  legendaDot: { width: 10, height: 10, borderRadius: 999, marginRight: 6 },
  legendaNome: { flex: 1, fontSize: 13, fontWeight: '600', color: '#475569' },
  legendaValor: { fontSize: 15, fontWeight: '700', color: PRETO, marginBottom: 8 },
  legendaBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  legendaBadgeTexto: { fontSize: 12, fontWeight: '700' },

  semDados: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 10 },
  semDadosIconeWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  semDadosIcone: {
    width: 16,
    height: 16,
    borderRadius: 999,
    backgroundColor: AZUL,
  },
  semDadosTexto: { fontSize: 16, color: '#475569', fontWeight: '700', marginBottom: 6 },
  semDadosSub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 19 },
});
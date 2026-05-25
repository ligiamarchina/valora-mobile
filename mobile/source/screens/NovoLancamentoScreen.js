import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
  StatusBar,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import api from '../services/api';

const TIPOS = [
  { key: 'receita', label: 'Receita', cor: '#16A34A', bg: '#DCFCE7' },
  { key: 'despesa', label: 'Despesa', cor: '#DC2626', bg: '#FEE2E2' },
  { key: 'custo', label: 'Custo', cor: '#9333EA', bg: '#F3E8FF' },
  { key: 'investimento', label: 'Investimento', cor: '#CA8A04', bg: '#FEF3C7' },
];

function formatarValor(texto) {
  const numeros = texto.replace(/\D/g, '');
  if (!numeros) return '';
  const valor = (parseInt(numeros, 10) / 100).toFixed(2);
  return valor.replace('.', ',');
}

function valorParaNumero(texto) {
  return parseFloat((texto || '0').replace(',', '.'));
}

function formatarDataExtenso(data) {
  if (!data) return 'Selecionar data';
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function NovoLancamentoScreen({ navigation }) {
  const [tipo, setTipo] = useState('receita');
  const [valor, setValor] = useState('');
  const [data, setData] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [idCategoria, setIdCategoria] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  const tipoAtual = TIPOS.find((t) => t.key === tipo);

  useEffect(() => {
    async function carregarCategorias() {
      try {
        const { data } = await api.get('/categorias');
        setCategorias(data);
      } catch {
        Alert.alert('Aviso', 'Não foi possível carregar as categorias.');
      }
    }
    carregarCategorias();
  }, []);

  const categoriasFiltradas = useMemo(
    () => categorias.filter((c) => c.tipo === tipo),
    [categorias, tipo]
  );

  const categoriaSelecionada = categoriasFiltradas.find(
    (c) => c.id_categoria === idCategoria
  );

  function trocarTipo(novoTipo) {
    setTipo(novoTipo);
    setIdCategoria(null);
  }

  function handleDia(dia) {
    setData(dia.dateString);
    setMostrarCalendario(false);
  }

  async function salvar() {
    if (!valor) return Alert.alert('Atenção', 'Informe o valor.');
    if (!data) return Alert.alert('Atenção', 'Selecione a data.');
    if (!idCategoria) return Alert.alert('Atenção', 'Selecione uma categoria.');

    setCarregando(true);
    try {
      await api.post('/lancamentos', {
        tipo,
        valor: valorParaNumero(valor),
        data_lancamento: data,
        descricao: descricao.trim(),
        id_categoria: idCategoria,
      });
      navigation.goBack();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar o lançamento.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: tipoAtual.cor }]}>
        <TouchableOpacity style={s.voltarBotao} onPress={() => navigation.goBack()}>
          <Text style={s.voltarTexto}>Voltar</Text>
        </TouchableOpacity>

        <View style={s.headerCentro}>
          <Text style={s.headerTitulo}>Novo lançamento</Text>
          <Text style={s.headerSub}>Preencha os dados do lançamento</Text>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Tipo */}
        <View style={s.bloco}>
          <Text style={s.blocoTitulo}>Tipo</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.tiposRow}
          >
            {TIPOS.map((item) => {
              const ativo = item.key === tipo;
              return (
                <TouchableOpacity
                  key={item.key}
                  style={[
                    s.tipoChip,
                    ativo && {
                      backgroundColor: item.bg,
                      borderColor: item.cor,
                    },
                  ]}
                  onPress={() => trocarTipo(item.key)}
                >
                  <Text
                    style={[
                      s.tipoChipTexto,
                      ativo && { color: item.cor },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Valor */}
        <View style={s.bloco}>
          <Text style={s.blocoTitulo}>Valor</Text>

          <View style={[s.valorCard, { borderColor: tipoAtual.cor }]}>
            <Text style={[s.valorPrefixo, { color: tipoAtual.cor }]}>R$</Text>
            <TextInput
              style={s.valorInput}
              placeholder="0,00"
              placeholderTextColor="#CBD5E1"
              value={valor}
              onChangeText={(t) => setValor(formatarValor(t))}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Data */}
        <View style={s.bloco}>
          <Text style={s.blocoTitulo}>Data</Text>

          <TouchableOpacity
            style={[
              s.campoCard,
              data && { borderColor: tipoAtual.cor, backgroundColor: tipoAtual.bg },
            ]}
            onPress={() => setMostrarCalendario(true)}
          >
            <View style={s.campoTextos}>
              <Text style={[s.campoValor, data && { color: tipoAtual.cor }]}>
                {formatarDataExtenso(data)}
              </Text>
              <Text style={s.campoAjuda}>
                {data ? 'Toque para alterar' : 'Escolha a data do lançamento'}
              </Text>
            </View>
            <Text style={s.campoAcao}>Selecionar</Text>
          </TouchableOpacity>
        </View>

        {/* Categoria */}
        <View style={s.bloco}>
          <Text style={s.blocoTitulo}>Categoria</Text>

          {categoriasFiltradas.length === 0 ? (
            <View style={s.vazioCard}>
              <Text style={s.vazioTitulo}>Nenhuma categoria disponível</Text>
              <Text style={s.vazioTexto}>
                Não existem categorias cadastradas para este tipo.
              </Text>
            </View>
          ) : (
            <View style={s.listaCategorias}>
              {categoriasFiltradas.map((categoria) => {
                const ativa = categoria.id_categoria === idCategoria;
                return (
                  <TouchableOpacity
                    key={categoria.id_categoria}
                    style={[
                      s.categoriaItem,
                      ativa && {
                        borderColor: tipoAtual.cor,
                        backgroundColor: tipoAtual.bg,
                      },
                    ]}
                    onPress={() => setIdCategoria(categoria.id_categoria)}
                  >
                    <Text
                      style={[
                        s.categoriaTexto,
                        ativa && { color: tipoAtual.cor, fontWeight: '700' },
                      ]}
                    >
                      {categoria.nome}
                    </Text>
                    {ativa && (
                      <Text style={[s.categoriaStatus, { color: tipoAtual.cor }]}>
                        Selecionada
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Descrição */}
        <View style={s.bloco}>
          <Text style={s.blocoTitulo}>Descrição</Text>
          <TextInput
            style={s.descricaoInput}
            placeholder="Adicione uma descrição opcional"
            placeholderTextColor="#CBD5E1"
            value={descricao}
            onChangeText={setDescricao}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Resumo */}
        <View style={s.bloco}>
          <Text style={s.blocoTitulo}>Resumo</Text>

          <View style={s.resumoCard}>
            <View style={s.resumoLinha}>
              <Text style={s.resumoLabel}>Tipo</Text>
              <Text style={[s.resumoValor, { color: tipoAtual.cor }]}>
                {tipoAtual.label}
              </Text>
            </View>

            <View style={s.resumoLinha}>
              <Text style={s.resumoLabel}>Valor</Text>
              <Text style={s.resumoValor}>{valor ? `R$ ${valor}` : 'Não informado'}</Text>
            </View>

            <View style={s.resumoLinha}>
              <Text style={s.resumoLabel}>Data</Text>
              <Text style={s.resumoValor}>
                {data ? formatarDataExtenso(data) : 'Não selecionada'}
              </Text>
            </View>

            <View style={[s.resumoLinha, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <Text style={s.resumoLabel}>Categoria</Text>
              <Text style={s.resumoValor}>
                {categoriaSelecionada?.nome || 'Não selecionada'}
              </Text>
            </View>
          </View>
        </View>

        {/* Ação */}
        <TouchableOpacity
          style={[s.botaoSalvar, { backgroundColor: tipoAtual.cor }, carregando && { opacity: 0.7 }]}
          onPress={salvar}
          disabled={carregando}
        >
          {carregando ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.botaoSalvarTexto}>Salvar lançamento</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Calendário */}
      <Modal visible={mostrarCalendario} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalBox}>
            <View style={[s.modalHeader, { backgroundColor: tipoAtual.cor }]}>
              <Text style={s.modalTitulo}>Selecionar data</Text>
            </View>

            <Calendar
              onDayPress={handleDia}
              markedDates={
                data
                  ? { [data]: { selected: true, selectedColor: tipoAtual.cor } }
                  : {}
              }
              theme={{
                todayTextColor: tipoAtual.cor,
                selectedDayBackgroundColor: tipoAtual.cor,
                arrowColor: tipoAtual.cor,
                dotColor: tipoAtual.cor,
              }}
            />

            <TouchableOpacity
              style={s.modalCancelar}
              onPress={() => setMostrarCalendario(false)}
            >
              <Text style={s.modalCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  header: {
    paddingTop: Platform.OS === 'ios' ? 56 : (StatusBar.currentHeight ?? 24) + 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  voltarBotao: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 18,
  },
  voltarTexto: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  headerCentro: {
    alignItems: 'flex-start',
  },
  headerTitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
  },

  scroll: { flex: 1 },
  content: {
    padding: 16,
    paddingBottom: 36,
  },

  bloco: {
    marginBottom: 16,
  },
  blocoTitulo: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },

  tiposRow: {
    paddingRight: 8,
    gap: 10,
  },
  tipoChip: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  tipoChipTexto: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },

  valorCard: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  valorPrefixo: {
    fontSize: 22,
    fontWeight: '700',
    marginRight: 10,
  },
  valorInput: {
    flex: 1,
    fontSize: 34,
    fontWeight: 'bold',
    color: '#0F172A',
    padding: 0,
  },

  campoCard: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  campoTextos: {
    flex: 1,
  },
  campoValor: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  campoAjuda: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  campoAcao: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },

  listaCategorias: {
    gap: 10,
  },
  categoriaItem: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoriaTexto: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  categoriaStatus: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
  },

  vazioCard: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 16,
  },
  vazioTitulo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  vazioTexto: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
  },

  descricaoInput: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    padding: 16,
    minHeight: 110,
    color: '#1E293B',
    fontSize: 15,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  resumoCard: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  resumoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  resumoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  resumoValor: {
    flex: 1,
    textAlign: 'right',
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },

  botaoSalvar: {
    marginTop: 4,
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  botaoSalvarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    padding: 16,
    alignItems: 'center',
  },
  modalTitulo: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCancelar: {
    padding: 16,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalCancelarTexto: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 15,
  },
});
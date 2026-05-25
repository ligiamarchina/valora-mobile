import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const AZUL = '#2660A4';
const AMBAR = '#ECA400';
const PRETO = '#050505';
const FUNDO = '#EDF7F6';

export default function CadastroScreen({ navigation }) {
  const { cadastro } = useAuth();
  const [form, setForm] = useState({
    nome: '',
    email: '',
    senha: '',
    cnpj: '',
    razao_social: '',
    nome_fantasia: ''
  });
  const [carregando, setCarregando] = useState(false);

  function atualizar(campo, valor) {
    setForm(prev => ({ ...prev, [campo]: valor }));
  }

  async function handleCadastro() {
    if (!form.nome || !form.email || !form.senha || !form.cnpj) {
      return Alert.alert('Atenção', 'Preencha nome, e-mail, senha e CNPJ.');
    }
    setCarregando(true);
    try {
      await cadastro(form);
      Alert.alert('Sucesso', 'Cadastro realizado! Faça login.', [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível cadastrar. Verifique os dados.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.topo}>
          <View style={s.logoWrap}>
            <View style={s.logoCircle} />
          </View>
          <Text style={s.titulo}>Criar conta</Text>
          <Text style={s.subtitulo}>Cadastre seu MEI e comece a organizar seu financeiro.</Text>
        </View>

        <View style={s.card}>
          {[
            { campo: 'nome', placeholder: 'Nome completo', label: 'Nome' },
            { campo: 'email', placeholder: 'E-mail', label: 'E-mail', keyboard: 'email-address' },
            { campo: 'senha', placeholder: 'Senha', label: 'Senha', secure: true },
            { campo: 'cnpj', placeholder: '00.000.000/0001-00', label: 'CNPJ' },
            { campo: 'razao_social', placeholder: 'Razão social (opcional)', label: 'Razão social' },
            { campo: 'nome_fantasia', placeholder: 'Nome fantasia (opcional)', label: 'Nome fantasia' },
          ].map(({ campo, placeholder, label, keyboard, secure }) => (
            <View key={campo} style={s.campo}>
              <Text style={s.label}>{label}</Text>
              <TextInput
                style={s.input}
                placeholder={placeholder}
                placeholderTextColor="#94A3B8"
                value={form[campo]}
                onChangeText={v => atualizar(campo, v)}
                keyboardType={keyboard || 'default'}
                secureTextEntry={secure || false}
                autoCapitalize="none"
              />
            </View>
          ))}

          <TouchableOpacity style={s.botao} onPress={handleCadastro} disabled={carregando}>
            {carregando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.botaoTexto}>Cadastrar</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={s.link}>Já tem conta? Entrar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FUNDO,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingVertical: 36,
  },

  topo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoWrap: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#DCEBFA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 26,
    height: 26,
    borderRadius: 999,
    backgroundColor: AMBAR,
  },
  titulo: {
    fontSize: 30,
    fontWeight: 'bold',
    color: AZUL,
    marginBottom: 6,
  },
  subtitulo: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  campo: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: PRETO,
  },

  botao: {
    backgroundColor: AZUL,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  botaoTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },

  link: {
    color: AZUL,
    textAlign: 'center',
    marginTop: 18,
    fontSize: 14,
    fontWeight: '600',
  },
});
import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function CadastroScreen({ navigation }) {
  const { cadastro } = useAuth();
  const [form, setForm] = useState({ nome: '', email: '', senha: '', cnpj: '', razao_social: '', nome_fantasia: '' });
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
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.titulo}>Criar conta</Text>

      {[
        { campo: 'nome', placeholder: 'Nome completo' },
        { campo: 'email', placeholder: 'E-mail', keyboard: 'email-address' },
        { campo: 'senha', placeholder: 'Senha', secure: true },
        { campo: 'cnpj', placeholder: 'CNPJ (00.000.000/0001-00)' },
        { campo: 'razao_social', placeholder: 'Razão social (opcional)' },
        { campo: 'nome_fantasia', placeholder: 'Nome fantasia (opcional)' },
      ].map(({ campo, placeholder, keyboard, secure }) => (
        <TextInput
          key={campo}
          style={s.input}
          placeholder={placeholder}
          value={form[campo]}
          onChangeText={v => atualizar(campo, v)}
          keyboardType={keyboard || 'default'}
          secureTextEntry={secure || false}
          autoCapitalize="none"
        />
      ))}

      <TouchableOpacity style={s.botao} onPress={handleCadastro} disabled={carregando}>
        {carregando ? <ActivityIndicator color="#fff" /> : <Text style={s.botaoTexto}>Cadastrar</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={s.link}>Já tem conta? Entrar</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 24, backgroundColor: '#F8FAFC', flexGrow: 1, justifyContent: 'center' },
  titulo: { fontSize: 28, fontWeight: 'bold', color: '#2563EB', textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 15 },
  botao: { backgroundColor: '#2563EB', borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 8 },
  botaoTexto: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#2563EB', textAlign: 'center', marginTop: 20, fontSize: 14 },
});
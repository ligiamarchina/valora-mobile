import { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
import { usePushRegistration } from '../hooks/usePushRegistration'; // FIX: novo import

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Verifica se já tem token salvo ao abrir o app
  useEffect(() => {
    async function carregar() {
      const token = await AsyncStorage.getItem('token');
      const usuarioSalvo = await AsyncStorage.getItem('usuario');
      if (token && usuarioSalvo) {
        setUsuario(JSON.parse(usuarioSalvo));
      }
      setCarregando(false);
    }
    carregar();
  }, []);

  // FIX: registra o token de push assim que houver um usuário logado
  usePushRegistration(usuario);

  async function login(email, senha) {
    const { data } = await api.post('/auth/login', { email, senha });
    await AsyncStorage.setItem('token', data.token);
    await AsyncStorage.setItem('usuario', JSON.stringify(data.usuario));
    setUsuario(data.usuario);
  }

  async function cadastro(dados) {
    await api.post('/auth/cadastro', dados);
  }

  async function logout() {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('usuario');
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, cadastro, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
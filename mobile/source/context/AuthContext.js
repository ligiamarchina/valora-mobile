import { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../services/api";
import { usePushRegistration } from "../hooks/usePushRegistration";

const AuthContext = createContext({});

// ─── Credenciais para desenvolvimento ────────────────────────
// Troque para false quando a tela de login estiver funcionando
const AUTO_LOGIN = true;
const AUTO_EMAIL = "felipe@teste.com";
const AUTO_SENHA = "123456";
// ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        // 1. Tenta usar token já salvo
        const token = await AsyncStorage.getItem("token");
        const usuarioSalvo = await AsyncStorage.getItem("usuario");

        if (token && usuarioSalvo) {
          setUsuario(JSON.parse(usuarioSalvo));
          setCarregando(false);
          return;
        }

        // 2. Se não tem token e AUTO_LOGIN está ativo, faz login automático
        if (AUTO_LOGIN) {
          const { data } = await api.post("/auth/login", {
            email: AUTO_EMAIL,
            senha: AUTO_SENHA,
          });
          await AsyncStorage.setItem("token", data.token);
          await AsyncStorage.setItem("usuario", JSON.stringify(data.usuario));
          setUsuario(data.usuario);
        }
      } catch (err) {
        console.error("Erro ao carregar sessão:", err);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  usePushRegistration(usuario);

  async function login(email, senha) {
    const { data } = await api.post("/auth/login", { email, senha });
    await AsyncStorage.setItem("token", data.token);
    await AsyncStorage.setItem("usuario", JSON.stringify(data.usuario));
    setUsuario(data.usuario);
  }

  async function cadastro(dados) {
    await api.post("/auth/cadastro", dados);
  }

  async function logout() {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("usuario");
    setUsuario(null);
  }

  return (
    <AuthContext.Provider
      value={{ usuario, carregando, login, cadastro, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

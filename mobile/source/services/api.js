import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Troque pelo IP da sua máquina na rede local (não use localhost no celular)
const BASE_URL = "http://10.0.2.2:3000";

const api = axios.create({ baseURL: BASE_URL });

// Adiciona o token JWT em toda requisição automaticamente
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

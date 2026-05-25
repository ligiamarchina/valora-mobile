import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
import CadastroScreen from '../screens/CadastroScreen';
import HomeScreen from '../screens/HomeScreen';
import LancamentosScreen from '../screens/LancamentosScreen';
import NovoLancamentoScreen from '../screens/NovoLancamentoScreen';
import RelatoriosScreen from '../screens/RelatoriosScreen';
import AlertasScreen from '../screens/AlertasScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabsAutenticadas() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarStyle: { paddingBottom: 5 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Início', tabBarIcon: () => <Text>🏠</Text> }}
      />
      <Tab.Screen
        name="Lancamentos"
        component={LancamentosScreen}
        options={{ tabBarLabel: 'Lançamentos', tabBarIcon: () => <Text>💰</Text> }}
      />
      <Tab.Screen
        name="Relatorios"
        component={RelatoriosScreen}
        options={{ tabBarLabel: 'Relatórios', tabBarIcon: () => <Text>📊</Text> }}
      />
      <Tab.Screen
        name="Alertas"
        component={AlertasScreen}
        options={{ tabBarLabel: 'Alertas', tabBarIcon: () => <Text>🔔</Text> }}
      />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { usuario } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {usuario ? (
          <>
            <Stack.Screen name="Tabs" component={TabsAutenticadas} />
            <Stack.Screen name="NovoLancamento" component={NovoLancamentoScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Cadastro" component={CadastroScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
import { AuthProvider } from './source/context/AuthContext';
import Navigation from './source/navigation';

export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}
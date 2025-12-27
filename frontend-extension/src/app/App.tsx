import { useAuthStore } from '@/entities/user/authStore';
import { LoginPage } from '@/pages/login/LoginPage';
import { PopupPage } from '@/pages/popup/PopupPage';
import './styles/index.css';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <div className="font-sans antialiased text-slate-900">
      {isAuthenticated ? <PopupPage /> : <LoginPage />}
    </div>
  );
}

export default App;

import { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { ProtectedRoute } from "./components/ProtectedRoute";
import {
  LandingPage,
  LoginPage,
  SignupPage,
  PaymentCallback,
  GoogleCallback,
  DashboardLayout,
  DashboardOverview,
  DashboardPayment,
  DashboardSettings,
  DashboardAccessCode,
} from "./pages";
import "./index.css";

function App() {
  const { setUser, setToken } = useAuthStore();

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem("linq_token");
    const userStr = localStorage.getItem("linq_user");
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        setUser(user);
        setToken(token);
      } catch {
        localStorage.removeItem("linq_token");
        localStorage.removeItem("linq_user");
      }
    }
  }, [setUser, setToken]);

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/signup" element={<SignupPage />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/payment-callback" element={<PaymentCallback />} />

        {/* Protected Dashboard Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="overview" element={<DashboardOverview />} />
          <Route path="payment" element={<DashboardPayment />} />
          <Route path="settings" element={<DashboardSettings />} />
          <Route path="access-code" element={<DashboardAccessCode />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;

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
  DashboardAnalytics,
} from "./pages";
import "./index.css";

function App() {
  const { restoreSession, isAuthenticated, token } = useAuthStore();

  // Backup restore from manual localStorage (in case zustand persist fails)
  useEffect(() => {
    // Skip if already authenticated (zustand persist worked)
    if (isAuthenticated && token) return;

    const storedToken = localStorage.getItem("linq_token");
    const userStr = localStorage.getItem("linq_user");
    if (storedToken && userStr) {
      try {
        const user = JSON.parse(userStr);
        restoreSession(user, storedToken);
      } catch {
        localStorage.removeItem("linq_token");
        localStorage.removeItem("linq_user");
      }
    }
  }, [restoreSession, isAuthenticated, token]);

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
          <Route path="analytics" element={<DashboardAnalytics />} />
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

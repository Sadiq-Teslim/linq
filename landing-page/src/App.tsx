import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./components/AuthProvider";
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
  return (
    <Router>
      <AuthProvider>
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
      </AuthProvider>
    </Router>
  );
}

export default App;

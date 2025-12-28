import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Card } from "../components";

export const GoogleCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get("token");
    const email = searchParams.get("email");
    const error = searchParams.get("error");

    if (error) {
      // Error occurred, redirect to login
      setTimeout(() => {
        navigate(`/auth/login?error=${error}`);
      }, 2000);
      return;
    }

    if (token && email) {
      // Create user object from email
      const user = {
        id: "", // Will be set by backend
        email: email,
        full_name: email.split("@")[0], // Temporary name
      };

      // Login user
      login(user, token);
      localStorage.setItem("linq_token", token);
      localStorage.setItem("linq_user", JSON.stringify(user));

      // Redirect to dashboard
      setTimeout(() => {
        navigate("/dashboard/overview");
      }, 1000);
    } else {
      // Missing token, redirect to login
      setTimeout(() => {
        navigate("/auth/login?error=no_token");
      }, 2000);
    }
  }, [searchParams, navigate, login]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="animate-spin text-indigo-600 text-4xl mb-4">⟳</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Completing Sign In
        </h2>
        <p className="text-slate-600">Please wait...</p>
      </Card>
    </div>
  );
};


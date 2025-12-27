import { useState } from 'react';
import { useAuthStore } from '@/entities/user/authStore';
import { Button } from '@/shared/ui/Button';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const { login, register, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (isRegister) {
      await register(email, password);
    } else {
      await login(email, password);
    }
  };

  return (
    <div className="h-[500px] w-[350px] flex flex-col items-center justify-center bg-bg p-6">
      <h1 className="text-2xl font-bold text-primary mb-2">LINQ AI</h1>
      <p className="text-sm text-slate-500 mb-6 text-center">Africa's B2B Intelligence Engine</p>

      <form onSubmit={handleSubmit} className="w-full space-y-3">
        <input
          type="email"
          placeholder="Work Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full p-2 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />

        {error && (
          <p className="text-red-500 text-xs text-center">{error}</p>
        )}

        <Button type="submit" isLoading={isLoading} className="w-full">
          {isRegister ? 'Create Account' : 'Sign In'}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => { setIsRegister(!isRegister); clearError(); }}
        className="mt-4 text-xs text-slate-500 hover:text-primary"
      >
        {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
      </button>
    </div>
  );
};
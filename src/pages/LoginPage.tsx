import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../services/api';

function PasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required
        minLength={8}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Minimum 8 characters"
        className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-3 pr-12 text-sm text-white placeholder-slate-500 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20 transition-all"
        aria-label="Password"
        autoComplete={show ? 'off' : 'current-password'}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

export function LoginPage() {
  const { token, setAuth } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  const validate = () => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailValid) return 'Please enter a valid email address.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (mode === 'register' && name.trim().length < 2) return 'Please enter your full name.';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const validationErr = validate();
    if (validationErr) {
      setError(validationErr);
      return;
    }
    setLoading(true);
    try {
      const data =
        mode === 'login'
          ? await authApi.login(email.trim().toLowerCase(), password)
          : await authApi.register(name.trim(), email.trim().toLowerCase(), password);
      setAuth(data.token, data.user);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail('demo@bookmytix.com');
    setPassword('DemoPass123!');
  };

  return (
    <div className="min-h-screen bg-[#08090D] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#F84464]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-[#0F1118] border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#0A0C13] border-b border-white/[0.08] px-8 py-7 text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-white hover:opacity-80 transition-opacity mb-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#F84464] text-white font-black text-sm">
                B
              </span>
              <span className="font-extrabold text-xl tracking-tight">
                book<span className="text-[#F84464]">my</span>tix
              </span>
            </Link>
            <h1 className="text-xl font-black text-white">
              {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'login'
                ? 'Sign in to access your movie tickets &amp; seat bookings'
                : 'Join to reserve tickets and unlock exclusive discounts'}
            </p>
          </div>

          {/* Form */}
          <div className="p-8 space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Ayush Sharma"
                    className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20 transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Password
                  </label>
                  {mode === 'login' && (
                    <Link
                      to="/forgot-password"
                      className="text-xs text-[#F84464] hover:underline font-semibold"
                    >
                      Forgot password?
                    </Link>
                  )}
                </div>
                <PasswordField value={password} onChange={setPassword} />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#F84464] py-3.5 text-sm font-bold text-white hover:bg-[#e03355] transition-all disabled:opacity-50 shadow-lg shadow-[#F84464]/25 mt-2"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Please wait…</span>
                  </>
                ) : mode === 'login' ? (
                  'Sign In to Account'
                ) : (
                  'Create Account'
                )}
              </button>
            </form>

            {/* Demo Helper Button */}
            {mode === 'login' && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={fillDemo}
                  className="text-xs text-slate-400 hover:text-white transition-colors underline"
                >
                  Quick fill demo credentials
                </button>
              </div>
            )}

            {/* Toggle Mode */}
            <div className="border-t border-white/[0.08] pt-5 text-center">
              <p className="text-xs text-slate-400">
                {mode === 'login' ? "Don't have an account yet?" : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => {
                    setMode((m) => (m === 'login' ? 'register' : 'login'));
                    setError('');
                  }}
                  className="ml-1.5 font-bold text-[#F84464] hover:underline"
                >
                  {mode === 'login' ? 'Sign up' : 'Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

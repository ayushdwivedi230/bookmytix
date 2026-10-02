import { useState } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Ticket, AlertCircle } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { authApi } from '../services/api';
import { Button } from '../components/ui/Button';

function PasswordField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        required
        minLength={8}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Minimum 8 characters"
        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 pr-12 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20 transition-all"
        aria-label="Password"
        autoComplete={show ? 'off' : 'current-password'}
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
    if (validationErr) { setError(validationErr); return; }
    setLoading(true);
    try {
      const data = mode === 'login'
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

  const switchMode = () => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#F84464]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-slate-900 px-8 py-6 text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-white hover:opacity-80 transition-opacity mb-4">
              <Ticket size={18} aria-hidden />
              <span className="font-extrabold text-xl tracking-tighter">bookmytix</span>
            </Link>
            <h1 className="text-xl font-bold text-white">
              {mode === 'login' ? 'Welcome back' : 'Create an account'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {mode === 'login' ? 'Sign in to access your tickets and bookings' : 'Join to start booking tickets instantly'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5" noValidate>
            {/* Error banner */}
            {error && (
              <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-500" aria-hidden />
                <span>{error}</span>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                <input
                  id="name"
                  type="text"
                  required
                  minLength={2}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20 transition-all"
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#F84464] focus:ring-2 focus:ring-[#F84464]/20 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <PasswordField value={password} onChange={setPassword} />
              {mode === 'login' && (
                <p className="mt-1 text-xs text-slate-400">Minimum 8 characters</p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {mode === 'login' ? 'Sign in' : 'Create account'}
            </Button>

            <p className="text-center text-sm text-slate-600">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={switchMode}
                className="font-semibold text-[#F84464] hover:text-[#e03b5a] transition-colors"
              >
                {mode === 'login' ? 'Register' : 'Sign in'}
              </button>
            </p>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          By continuing, you agree to our{' '}
          <span className="text-slate-400 hover:text-white cursor-pointer transition-colors">Terms of Use</span>
          {' '}and{' '}
          <span className="text-slate-400 hover:text-white cursor-pointer transition-colors">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}

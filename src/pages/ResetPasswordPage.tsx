import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle2, RefreshCw, KeyRound } from 'lucide-react';
import { authApi } from '../services/api';
import { useToast } from '../hooks/useToast';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast('Invalid or missing password reset token', 'error');
      return;
    }
    if (password.length < 8) {
      toast('Password must be at least 8 characters long', 'error');
      return;
    }
    if (password !== confirmPassword) {
      toast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
      toast('Your password has been reset successfully!', 'success');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Reset failed or token expired', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090D] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0F1118] p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-4">
            <Lock size={26} />
          </div>
          <h1 className="text-2xl font-black text-white">Create New Password</h1>
          <p className="text-xs text-slate-400">
            Please enter and confirm your new secure account password.
          </p>
        </div>

        {success ? (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs space-y-2">
              <CheckCircle2 size={32} className="mx-auto" />
              <p className="font-bold text-white">Password Reset Complete</p>
              <p className="text-slate-300">
                You can now log in using your new credentials. Redirecting to login…
              </p>
            </div>
            <Link
              to="/login"
              className="block w-full py-2.5 rounded-xl bg-[#F84464] text-xs font-bold text-white text-center shadow-lg shadow-[#F84464]/20"
            >
              Sign In Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-2.5 text-sm text-white focus:border-indigo-400 focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-type password"
                className="w-full rounded-xl border border-white/10 bg-[#161925] px-4 py-2.5 text-sm text-white focus:border-indigo-400 focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm py-3 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw size={15} className="animate-spin" /> : null}
              Reset Password
            </button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={13} /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

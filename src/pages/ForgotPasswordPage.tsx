import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, RefreshCw, KeyRound } from 'lucide-react';
import { authApi } from '../services/api';
import { useToast } from '../hooks/useToast';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetTokenPreview, setResetTokenPreview] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      setSubmitted(true);
      // In local/sandbox development without SMTP, backend returns resetToken for instant verification
      if (res.resetToken) {
        setResetTokenPreview(res.resetToken);
      }
      toast('Password reset link instructions dispatched.', 'success');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Request failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08090D] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0F1118] p-8 space-y-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#F84464]/10 via-transparent to-transparent pointer-events-none" />

        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#F84464]/10 border border-[#F84464]/20 text-[#F84464] mx-auto flex items-center justify-center mb-4">
            <KeyRound size={26} />
          </div>
          <h1 className="text-2xl font-black text-white">Reset Account Password</h1>
          <p className="text-xs text-slate-400">
            Enter your registered email address to receive password recovery instructions.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-5 text-center">
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs space-y-2">
              <CheckCircle2 size={32} className="mx-auto" />
              <p className="font-bold text-white">Instructions Sent</p>
              <p className="text-slate-300">
                If an account exists for <strong className="text-white">{email}</strong>, you will receive password reset instructions.
              </p>
            </div>

            {resetTokenPreview && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left space-y-2 text-xs">
                <span className="font-mono text-[10px] uppercase font-bold text-amber-400">
                  Development Mode Reset Token
                </span>
                <p className="text-slate-300">Direct reset link generated:</p>
                <Link
                  to={`/reset-password?token=${resetTokenPreview}`}
                  className="block font-mono text-[11px] text-[#F84464] hover:underline break-all"
                >
                  /reset-password?token={resetTokenPreview}
                </Link>
              </div>
            )}

            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-white/10 bg-[#161925] pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#F84464] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#F84464] hover:bg-[#e03355] text-white font-extrabold text-sm py-3 shadow-lg shadow-[#F84464]/25 transition-all disabled:opacity-50"
            >
              {loading ? <RefreshCw size={15} className="animate-spin" /> : null}
              Send Recovery Link
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

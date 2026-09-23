'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No se proporcionó ningún token de recuperación en el enlace.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('El enlace no contiene un token válido.');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden. Por favor verifícalas.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.resetPassword({
        token,
        new_password: newPassword,
      });

      setSuccess(true);
      toast.success(res.message || '¡Contraseña actualizada exitosamente!');
    } catch (err: any) {
      const msg = err.message || 'Error al restablecer la contraseña. El enlace puede haber expirado.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-brand-dark" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(108,99,255,0.15)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,212,255,0.08)_0%,transparent_60%)]" />

      {/* Floating dots */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-brand-accent rounded-full opacity-40 animate-pulse" />
      <div className="absolute top-40 right-32 w-3 h-3 bg-brand-cyan rounded-full opacity-30 animate-pulse" style={{ animationDelay: '0.7s' }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass p-8 rounded-3xl w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TutorAvatar size="sm" emotion={success ? 'happy' : 'neutral'} />
            <span className="font-outfit text-xl font-bold text-white">Guionbajo</span>
          </div>
          <h1 className="text-2xl font-outfit font-bold text-white mb-1">
            {success ? '¡Contraseña Actualizada!' : 'Nueva Contraseña'}
          </h1>
          <p className="text-brand-text-secondary text-sm">
            {success
              ? 'Ya puedes ingresar con tus nuevas credenciales'
              : 'Elige una clave segura para proteger tu cuenta'}
          </p>
        </div>

        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
              <CheckCircle2 size={32} />
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Tu contraseña ha sido restablecida exitosamente. Puedes volver al inicio de sesión y continuar tu aprendizaje.
            </p>

            <Link
              href="/login"
              className="w-full py-3 px-4 bg-gradient-to-r from-brand-accent via-[#6366f1] to-brand-cyan hover:from-brand-accent/90 hover:to-cyan-400 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-brand-cyan/20"
            >
              Iniciar Sesión Ahora
            </Link>
          </motion.div>
        ) : !token ? (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle size={28} />
            </div>
            <p className="text-sm text-slate-300">
              El enlace que has abierto no contiene un token válido de recuperación.
            </p>
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 text-sm text-brand-cyan hover:underline font-medium"
            >
              <ArrowLeft size={16} /> Solicitar un nuevo enlace
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                Nueva Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3 pl-11 pr-12 text-white placeholder-brand-text-muted focus:outline-none focus:border-brand-accent transition-colors"
                  required
                />
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                Confirmar Contraseña
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError('');
                  }}
                  placeholder="Repite la contraseña"
                  className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3 pl-11 pr-12 text-white placeholder-brand-text-muted focus:outline-none focus:border-brand-accent transition-colors"
                  required
                />
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted pointer-events-none" />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-white transition-colors"
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className="mt-2 text-xs text-brand-error leading-relaxed">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full bg-gradient-to-r from-brand-accent via-[#6366f1] to-brand-cyan hover:from-brand-accent/90 hover:to-cyan-400 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand-cyan/20 active:scale-[0.98]"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Actualizando...
                </>
              ) : (
                'Guardar Nueva Contraseña'
              )}
            </button>

            <div className="pt-2 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-brand-text-secondary hover:text-brand-cyan transition-colors"
              >
                <ArrowLeft size={15} />
                <span>Volver al inicio de sesión</span>
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-brand-dark flex items-center justify-center text-brand-cyan">
          <Loader2 size={32} className="animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}

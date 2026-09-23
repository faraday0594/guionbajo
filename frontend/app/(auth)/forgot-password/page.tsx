'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import TutorAvatar from '@/app/components/TutorPanel/TutorAvatar';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError('');
    setLoading(true);

    try {
      await api.forgotPassword(email.trim());
      setSubmitted(true);
      toast.success('Enlace de recuperación enviado si el correo existe');
    } catch (err: any) {
      const msg = err.message || 'Error al procesar la solicitud';
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

      {/* Floating ambient dots */}
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
            <TutorAvatar size="sm" emotion={submitted ? 'happy' : 'neutral'} />
            <span className="font-outfit text-xl font-bold text-white">Guionbajo</span>
          </div>
          <h1 className="text-2xl font-outfit font-bold text-white mb-1">
            {submitted ? '¡Correo Enviado!' : 'Recuperar Contraseña'}
          </h1>
          <p className="text-brand-text-secondary text-sm">
            {submitted
              ? 'Revisa tu bandeja de entrada para continuar'
              : 'Ingresa tu correo y te enviaremos un enlace seguro'}
          </p>
        </div>

        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5 text-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-brand-cyan/15 border border-brand-cyan/40 text-brand-cyan flex items-center justify-center mx-auto shadow-lg shadow-brand-cyan/20">
              <CheckCircle2 size={32} />
            </div>

            <div className="p-4 rounded-2xl bg-brand-surface/70 border border-brand-border text-sm text-slate-300 leading-relaxed text-left">
              <p className="mb-2">
                Hemos enviado un correo a <strong className="text-brand-cyan font-mono">{email}</strong> con instrucciones para restablecer tu contraseña.
              </p>
              <p className="text-xs text-brand-text-muted">
                ⏱️ El enlace expirará en 30 minutos. Si no lo encuentras, revisa tu carpeta de <em>Spam</em> o <em>Promociones</em>.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <Link
                href="/login"
                className="w-full py-3 px-4 bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 glow-accent"
              >
                Volver al Inicio de Sesión
              </Link>

              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-xs text-brand-text-secondary hover:text-white transition-colors"
              >
                ¿No era tu correo? Intentar con otra dirección
              </button>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError('');
                  }}
                  placeholder="tu@email.com"
                  className={`w-full bg-brand-surface border rounded-xl px-4 py-3 pl-11 text-white placeholder-brand-text-muted focus:outline-none focus:border-brand-accent transition-colors ${
                    error ? 'border-brand-error' : 'border-brand-border'
                  }`}
                  required
                />
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-text-muted pointer-events-none" />
              </div>
              {error && <p className="mt-1.5 text-xs text-brand-error">{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 glow-accent btn-lift"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Enviando enlace...
                </>
              ) : (
                'Enviar Enlace de Recuperación'
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

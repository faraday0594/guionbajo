'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { Eye, EyeOff, Brain, Loader2, Zap } from 'lucide-react';

// Usuario demo para acceso rápido
const DEMO_USER = {
  email: 'demo@guionbajo.com',
  password: 'demo1234',
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState('');

  const doLogin = async (creds: { email: string; password: string }, isDemo = false) => {
    setError('');
    try {
      const res = await api.login(creds);
      if (res.access_token) {
        setToken(res.access_token);
        toast.success(isDemo ? '¡Entraste como usuario demo! 🚀' : '¡Bienvenido de vuelta! 👋');
        router.push('/dashboard');
      }
    } catch (err: any) {
      const msg = err.message || 'Credenciales incorrectas';
      setError(msg);
      toast.error(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await doLogin({ email, password });
    setLoading(false);
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    setEmail(DEMO_USER.email);
    setPassword(DEMO_USER.password);
    await doLogin(DEMO_USER, true);
    setDemoLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-brand-dark" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(108,99,255,0.15)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,212,255,0.08)_0%,transparent_60%)]" />

      {/* Floating dots */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-brand-accent rounded-full opacity-40 animate-pulse" />
      <div className="absolute top-40 right-32 w-3 h-3 bg-brand-cyan rounded-full opacity-30 animate-pulse" style={{animationDelay:'0.7s'}} />
      <div className="absolute bottom-32 left-40 w-2 h-2 bg-brand-gold rounded-full opacity-30 animate-pulse" style={{animationDelay:'1.2s'}} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass p-8 rounded-3xl w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Brain className="w-8 h-8 text-brand-cyan" />
            <span className="font-outfit text-xl font-bold text-white">Guionbajo</span>
          </div>
          <h1 className="text-2xl font-outfit font-bold text-white mb-1">Iniciar Sesión</h1>
          <p className="text-brand-text-secondary text-sm">Continúa tu aprendizaje de inglés</p>
        </div>

        {/* Demo access box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6 p-4 rounded-2xl border border-brand-gold/30 bg-brand-gold/5"
        >
          <div className="flex items-start gap-3">
            <Zap size={18} className="text-brand-gold mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-brand-gold mb-1">Acceso Demo</p>
              <p className="text-xs text-brand-text-secondary mb-3">
                Prueba el sistema sin registrarte
              </p>
              <div className="text-xs text-brand-text-muted space-y-1 font-mono mb-3">
                <div>📧 demo@guionbajo.com</div>
                <div>🔑 demo1234</div>
              </div>
              <button
                onClick={handleDemo}
                disabled={demoLoading || loading}
                className="w-full py-2 px-4 bg-brand-gold/20 hover:bg-brand-gold/30 border border-brand-gold/40
                  text-brand-gold text-sm font-semibold rounded-xl transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {demoLoading ? (
                  <><Loader2 size={14} className="animate-spin" /> Ingresando...</>
                ) : (
                  <><Zap size={14} /> Entrar como Demo</>
                )}
              </button>
            </div>
          </div>
        </motion.div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-brand-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="px-3 bg-brand-card text-xs text-brand-text-muted">o con tu cuenta</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(''); }}
              placeholder="tu@email.com"
              className={`w-full bg-brand-surface border rounded-xl px-4 py-3 text-white placeholder-brand-text-muted
                focus:outline-none focus:border-brand-accent transition-colors
                ${error ? 'border-brand-error' : 'border-brand-border'}`}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-2">Contraseña</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                className={`w-full bg-brand-surface border rounded-xl px-4 py-3 text-white placeholder-brand-text-muted
                  focus:outline-none focus:border-brand-accent transition-colors pr-12
                  ${error ? 'border-brand-error' : 'border-brand-border'}`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {error && <p className="mt-1.5 text-xs text-brand-error">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || demoLoading}
            className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold
              py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 glow-accent btn-lift"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Ingresando...</>
            ) : (
              'Entrar'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-text-secondary">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="text-brand-cyan hover:underline font-medium">
            Regístrate gratis
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

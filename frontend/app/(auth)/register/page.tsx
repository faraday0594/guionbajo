'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { Eye, EyeOff, Brain, Loader2 } from 'lucide-react';

const LANGUAGES = [
  { value: 'es', label: 'Español' },
  { value: 'pt', label: 'Português' },
  { value: 'fr', label: 'Français' },
  { value: 'it', label: 'Italiano' },
  { value: 'de', label: 'Deutsch' },
  { value: 'other', label: 'Otro' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    native_language: 'es',   // ← snake_case para el backend
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'El nombre es requerido';
    if (!formData.email.includes('@')) e.email = 'Email inválido';
    if (formData.password.length < 6) e.password = 'Mínimo 6 caracteres';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // 1. Registrar
      await api.register(formData);

      // 2. Auto-login para obtener el token
      const loginRes = await api.login({
        email: formData.email,
        password: formData.password,
      });

      if (loginRes.access_token) {
        setToken(loginRes.access_token);
        toast.success(`¡Bienvenido, ${formData.name}! 🎉`);
        // Nueva cuenta → ir al onboarding
        router.push('/onboarding');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error al registrarse. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    key: keyof typeof formData,
    type = 'text',
    placeholder = '',
    autoComplete = 'off'
  ) => (
    <div>
      <label htmlFor={key} className="block text-sm font-medium text-brand-text-secondary mb-2">
        {label}
      </label>
      <div className="relative">
        <input
          id={key}
          name={key}
          type={key === 'password' ? (showPassword ? 'text' : 'password') : type}
          value={formData[key]}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onChange={e => {
            setFormData({ ...formData, [key]: e.target.value });
            if (errors[key]) setErrors({ ...errors, [key]: '' });
          }}
          className={`w-full bg-brand-surface border rounded-xl px-4 py-3 text-white placeholder-brand-text-muted
            focus:outline-none focus:border-brand-accent transition-colors
            ${key === 'password' ? 'pr-12' : ''}
            ${errors[key] ? 'border-brand-error' : 'border-brand-border'}`}
          required
        />
        {key === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-muted hover:text-white transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {errors[key] && (
        <p className="mt-1 text-xs text-brand-error">{errors[key]}</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-brand-dark" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(108,99,255,0.15)_0%,transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(0,212,255,0.08)_0%,transparent_60%)]" />

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
          <h1 className="text-2xl font-outfit font-bold text-white mb-1">Crear Cuenta</h1>
          <p className="text-brand-text-secondary text-sm">Únete y aprende inglés con IA</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          {field('Nombre completo', 'name', 'text', 'Tu nombre', 'name')}
          {field('Email', 'email', 'email', 'tu@email.com', 'email')}
          {field('Contraseña', 'password', 'password', 'Mínimo 6 caracteres', 'new-password')}

          {/* Native language */}
          <div>
            <label className="block text-sm font-medium text-brand-text-secondary mb-2">
              Idioma nativo
            </label>
            <select
              value={formData.native_language}
              onChange={e => setFormData({ ...formData, native_language: e.target.value })}
              className="w-full bg-brand-surface border border-brand-border rounded-xl px-4 py-3 text-white
                focus:outline-none focus:border-brand-accent transition-colors appearance-none cursor-pointer"
            >
              {LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-accent hover:bg-brand-accent/90 text-white font-semibold
              py-3 rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed
              flex items-center justify-center gap-2 glow-accent btn-lift mt-2"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Creando cuenta...</>
            ) : (
              'Crear Cuenta'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-brand-text-secondary">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-brand-cyan hover:underline font-medium">
            Inicia Sesión
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

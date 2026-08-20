'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { clearToken } from '@/lib/auth';
import { toast } from 'react-hot-toast';
import { Save, Key, LogOut, ArrowLeft, Shield } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveKey = async () => {
    if (!apiKey) return;
    setSaving(true);
    try {
      await api.saveMinimaxKey(apiKey);
      toast.success('API Key guardada con éxito');
      setApiKey('');
    } catch (err) {
      toast.error('Error al guardar la API Key');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTTS = async () => {
    try {
      toast.loading('Probando audio...', { id: 'tts' });
      await api.testTtsConnection();
      toast.success('¡Conexión TTS exitosa!', { id: 'tts' });
    } catch (err) {
      toast.error('Fallo en la conexión TTS', { id: 'tts' });
    }
  };

  const handleLogout = () => {
    clearToken();
    toast.success('Sesión cerrada correctamente');
    router.push('/login');
  };

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-4xl mx-auto text-white">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2.5 glass rounded-2xl hover:bg-brand-surface border border-brand-border text-brand-text-secondary hover:text-white transition-all flex items-center gap-2 text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Volver a la Pizarra</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-outfit font-bold">Configuración</h1>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 hover:text-white transition-all text-xs sm:text-sm font-semibold shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Cerrar Sesión</span>
        </button>
      </div>

      <div className="space-y-8">
        {/* AI Configuration */}
        <section className="glass p-6 sm:p-8 rounded-3xl border border-brand-border/60">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <Key className="w-5 h-5 text-brand-accent" />
            Configuración de IA (MiniMax)
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-brand-text-secondary mb-2">Clave API de MiniMax</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="password"
                  name="minimax_api_key"
                  id="minimax_api_key"
                  autoComplete="new-password"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="Introduce tu clave API personalizada"
                  className="flex-1 bg-brand-surface border border-brand-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-accent transition-colors"
                />
                <button 
                  onClick={handleSaveKey}
                  disabled={saving || !apiKey}
                  className="px-6 py-3 bg-brand-accent hover:bg-brand-accent/90 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
              <p className="text-xs text-brand-text-muted mt-2">Tu clave API se almacena de forma segura y encriptada.</p>
            </div>

            <div className="pt-4 border-t border-brand-border/40">
              <button 
                onClick={handleTestTTS}
                className="px-4 py-2 border border-brand-cyan text-brand-cyan hover:bg-brand-cyan/10 rounded-xl text-sm font-semibold transition-colors"
              >
                Probar Conexión de Audio TTS
              </button>
            </div>
          </div>
        </section>

        {/* Account & Session Section */}
        <section className="glass p-6 sm:p-8 rounded-3xl border border-red-500/20 bg-red-950/10">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2 text-red-400">
            <Shield className="w-5 h-5 text-red-400" />
            Cuenta y Sesión Activa
          </h2>
          <p className="text-sm text-brand-text-secondary mb-6">
            Si deseas cambiar de usuario o salir del sistema en este dispositivo, cierra tu sesión aquí.
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 text-red-300 hover:text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión Ahora
          </button>
        </section>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Bell, Check, X, Loader2, ShieldCheck, RefreshCw, Clock, UserCheck, UserX } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface AccessUser {
  id: string;
  name: string;
  email: string;
  native_language: string;
  access_status: 'pending' | 'approved' | 'rejected' | string;
  created_at: string | null;
}

export default function AdminAccessNotifications() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [users, setUsers] = useState<AccessUser[]>([]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAccessRequests();
      setPendingCount(data?.pending_count || 0);
      setUsers(Array.isArray(data?.users) ? data.users : []);
    } catch (err) {
      console.error('Error loading access requests:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  const handleApprove = async (user: AccessUser) => {
    setActingId(user.id);
    try {
      await api.approveUserAccess(user.id);
      toast.success(`Acceso aprobado para ${user.email}`);
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'No se pudo aprobar el acceso');
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (user: AccessUser) => {
    setActingId(user.id);
    try {
      await api.rejectUserAccess(user.id);
      toast('Acceso rechazado/revocado', { icon: '🚫' });
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || 'No se pudo rechazar el acceso');
    } finally {
      setActingId(null);
    }
  };

  const pendingUsers = users.filter((u) => u.access_status === 'pending');
  const otherUsers = users.filter((u) => u.access_status !== 'pending');

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          fetchRequests();
        }}
        className={`relative flex items-center gap-1.5 px-3 py-2 glass rounded-2xl border transition-all text-xs font-semibold ${
          pendingCount > 0
            ? 'border-amber-400/60 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
            : 'border-brand-border text-brand-text-secondary hover:text-white hover:bg-brand-surface'
        }`}
        title="Notificaciones de acceso de nuevos usuarios"
      >
        <Bell className={`w-4 h-4 ${pendingCount > 0 ? 'text-amber-300 animate-bounce' : ''}`} />
        <span className="hidden md:inline">Accesos</span>
        {pendingCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-400 text-black leading-none">
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="glass w-full max-w-xl rounded-3xl border border-brand-border p-6 max-h-[85vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-brand-border/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-400/30">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Control de Acceso</h2>
                  <p className="text-xs text-brand-text-muted">
                    Solo visible para megafer1994@gmail.com
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchRequests}
                  disabled={loading}
                  className="p-2 rounded-xl glass border border-brand-border text-brand-text-secondary hover:text-white transition-colors"
                  title="Actualizar"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl glass border border-brand-border text-brand-text-secondary hover:text-white transition-colors"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
              {/* Pendientes */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Solicitudes Pendientes ({pendingUsers.length})
                  </h3>
                </div>

                {pendingUsers.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-brand-surface/50 border border-brand-border/50 text-center text-xs text-brand-text-muted">
                    No hay solicitudes pendientes en este momento.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingUsers.map((u) => (
                      <div
                        key={u.id}
                        className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-white truncate">{u.name}</div>
                          <div className="text-xs text-amber-200/90 truncate">{u.email}</div>
                          <div className="text-[11px] text-brand-text-muted mt-0.5">
                            Idioma: {(u.native_language || 'es').toUpperCase()}
                            {u.created_at ? ` · ${new Date(u.created_at).toLocaleDateString()}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            type="button"
                            disabled={actingId === u.id}
                            onClick={() => handleApprove(u)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            {actingId === u.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Dar Acceso
                          </button>
                          <button
                            type="button"
                            disabled={actingId === u.id}
                            onClick={() => handleReject(u)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-300 text-xs font-bold transition-colors disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            Rechazar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Otros usuarios */}
              {otherUsers.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted mb-2.5">
                    Usuarios Gestionados ({otherUsers.length})
                  </h3>
                  <div className="space-y-2">
                    {otherUsers.map((u) => {
                      const isApproved = u.access_status === 'approved';
                      return (
                        <div
                          key={u.id}
                          className="p-3 rounded-2xl bg-brand-surface/50 border border-brand-border/50 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm text-white truncate">{u.name}</span>
                              {isApproved ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  <UserCheck className="w-3 h-3" /> Aprobado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
                                  <UserX className="w-3 h-3" /> Rechazado
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-brand-text-muted truncate">{u.email}</div>
                          </div>
                          <div className="flex-shrink-0">
                            {isApproved ? (
                              <button
                                type="button"
                                disabled={actingId === u.id}
                                onClick={() => handleReject(u)}
                                className="px-2.5 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/30 text-red-300 text-[11px] font-semibold transition-colors disabled:opacity-50"
                              >
                                Revocar
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={actingId === u.id}
                                onClick={() => handleApprove(u)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold transition-colors disabled:opacity-50"
                              >
                                Aprobar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

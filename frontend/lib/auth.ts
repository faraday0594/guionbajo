let memoryToken: string | null = null;

export function getToken(): string | null {
  if (typeof window === 'undefined') return memoryToken;
  try {
    const t = localStorage.getItem('guionbajo_token') || localStorage.getItem('tutor_ai_token');
    if (t) {
      memoryToken = t;
      return t;
    }
  } catch (_) {}
  return memoryToken;
}

export function setToken(token: string): void {
  memoryToken = token;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('guionbajo_token', token);
  } catch (_) {}
}

export function clearToken(): void {
  memoryToken = null;
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('guionbajo_token');
    localStorage.removeItem('tutor_ai_token');
  } catch (_) {}
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

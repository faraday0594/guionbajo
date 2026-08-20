export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('guionbajo_token') || localStorage.getItem('tutor_ai_token');
}

export function setToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('guionbajo_token', token);
}

export function clearToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('guionbajo_token');
  localStorage.removeItem('tutor_ai_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

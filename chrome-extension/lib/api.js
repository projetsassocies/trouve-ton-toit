/**
 * Supabase REST API wrapper for the Chrome extension.
 * Uses direct REST calls instead of the JS SDK to keep the extension lightweight.
 *
 * IMPORTANT: Set your Supabase project values below before loading the extension.
 */

// TODO: Replace with your Supabase project values (same as VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
const SUPABASE_URL = 'https://iiwmtzorwwanjrnhsrah.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpd210em9yd3dhbmpybmhzcmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NTc0NjcsImV4cCI6MjA4NzUzMzQ2N30.zdJfVp9wT3GXLV--fIHV8Em8KweDw7kZSk3kTrrWu3A';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'ttt_access_token',
  REFRESH_TOKEN: 'ttt_refresh_token',
  USER: 'ttt_user',
  EXPIRES_AT: 'ttt_expires_at',
};

function headers(accessToken) {
  const h = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  };
  if (accessToken) {
    h['Authorization'] = `Bearer ${accessToken}`;
  }
  return h;
}

async function signIn(email, password) {
  const url = `${SUPABASE_URL}/auth/v1/token?grant_type=password`;
  const res = await fetch(url, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ email, password }),
  });

  const body = await res.text();

  if (!res.ok) {
    let errMsg = `Erreur ${res.status}`;
    try {
      const err = JSON.parse(body);
      errMsg = err.error_description || err.msg || err.message || err.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = JSON.parse(body);
  await storeSession(data);
  return data;
}

async function refreshSession() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.REFRESH_TOKEN]);
  const refreshToken = stored[STORAGE_KEYS.REFRESH_TOKEN];
  if (!refreshToken) throw new Error('Aucune session');

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) {
    await clearSession();
    throw new Error('Session expirée, reconnectez-vous');
  }
  const data = await res.json();
  await storeSession(data);
  return data;
}

async function getValidToken() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.EXPIRES_AT,
  ]);
  const token = stored[STORAGE_KEYS.ACCESS_TOKEN];
  const expiresAt = stored[STORAGE_KEYS.EXPIRES_AT];
  if (!token) return null;

  const nowSec = Math.floor(Date.now() / 1000);
  if (expiresAt && nowSec >= expiresAt - 60) {
    try {
      const refreshed = await refreshSession();
      return refreshed.access_token;
    } catch {
      return null;
    }
  }
  return token;
}

async function getUser() {
  const stored = await chrome.storage.local.get([STORAGE_KEYS.USER]);
  return stored[STORAGE_KEYS.USER] || null;
}

async function insertListing(listing) {
  const token = await getValidToken();
  if (!token) throw new Error('Non connecté');

  const res = await fetch(`${SUPABASE_URL}/rest/v1/listings`, {
    method: 'POST',
    headers: {
      ...headers(token),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(listing),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Erreur ${res.status}`);
  }
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

async function signOut() {
  const token = await getValidToken();
  if (token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: headers(token),
    }).catch(() => {});
  }
  await clearSession();
}

async function storeSession(data) {
  const expiresAt = Math.floor(Date.now() / 1000) + (data.expires_in || 3600);
  await chrome.storage.local.set({
    [STORAGE_KEYS.ACCESS_TOKEN]: data.access_token,
    [STORAGE_KEYS.REFRESH_TOKEN]: data.refresh_token,
    [STORAGE_KEYS.USER]: data.user,
    [STORAGE_KEYS.EXPIRES_AT]: expiresAt,
  });
}

async function clearSession() {
  await chrome.storage.local.remove(Object.values(STORAGE_KEYS));
}

async function isLoggedIn() {
  const token = await getValidToken();
  return !!token;
}

// Expose for use by popup and service-worker (all in extension context)
if (typeof globalThis !== 'undefined') {
  globalThis.TTT_API = {
    signIn,
    signOut,
    refreshSession,
    getValidToken,
    getUser,
    insertListing,
    isLoggedIn,
    SUPABASE_URL,
  };
}

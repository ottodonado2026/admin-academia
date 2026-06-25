import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Migración de token: Si hay un token viejo atascado con un Web Lock corrupto, lo movemos a una nueva llave
try {
  let oldKey = null;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.endsWith("-auth-token") && key !== "academia-v2-auth-token") {
      oldKey = key;
      break;
    }
  }
  if (oldKey) {
    const token = localStorage.getItem(oldKey);
    localStorage.setItem("academia-v2-auth-token", token);
    localStorage.removeItem(oldKey);
  }
} catch (e) {
  console.error("Error migrando token:", e);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: "academia-v2-auth-token",
    lock: async (name, acquireTimeout, fn) => {
      return await fn();
    }
  }
})
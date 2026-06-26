import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase, supabaseUrl, supabaseAnonKey } from "../services/supabaseClient";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const fetchUserRole = async (userId, accessToken = null) => {
    try {
      let data, error;

      if (accessToken) {
        // Fallback: Modo rescate
        const res = await fetch(`${supabaseUrl}/rest/v1/usuarios?select=role,nombre&auth_uid=eq.${userId}`, {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${accessToken}`
          }
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.message || "Error en fetch manual");
        data = result.length > 0 ? result[0] : null;
      } else {
        // Modo normal
        const response = await supabase
          .from("usuarios")
          .select("role, nombre")
          .eq("auth_uid", userId)
          .maybeSingle();
        data = response.data;
        error = response.error;
        if (error) throw error;
      }

      setRole(data?.role?.toLowerCase() || null);
      setUserData(data || null);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole(null);
      setUserData(null);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let sessionPromise = null;

    try {
      const sessionString = localStorage.getItem("academia-v2-auth-token");
      if (sessionString) {
        const manualSession = JSON.parse(sessionString);
        if (manualSession && manualSession.user) {
          setUser(manualSession.user);
        }
      }
    } catch (e) {
      console.error("Error rescate síncrono", e);
    }

    const loadSessionAndRole = async (session) => {
      if (!isMounted) return;

      try {
        if (session?.user) {
          setUser(session.user);
          await fetchUserRole(session.user.id);
        } else {
          setUser(null);
          setRole(null);
          setUserData(null);
        }
      } catch (err) {
        console.error("Error cargando sesión y rol:", err);
      } finally {
        if (isMounted) {
          setLoadingAuth(false);
        }
      }
    };

    async function init() {
      try {
        sessionPromise = supabase.auth.getSession();
        const { data, error } = await sessionPromise;
        if (error) {
          console.error("Error en getSession:", error);
        }
        if (isMounted) {
          await loadSessionAndRole(data.session);
        }
      } catch (e) {
        console.error("Excepción en init:", e);
      }
    }

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "INITIAL_SESSION") {
        return;
      }

      if (event === "SIGNED_OUT") {
        setUser(null);
        setRole(null);
        setUserData(null);
        setLoadingAuth(false);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await loadSessionAndRole(session);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoadingAuth(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error };
      }
      return { user: data.user };
    } finally {
      // El estado final (false) lo pone onAuthStateChange al procesar SIGNED_IN
    }
  };

  const logout = async () => {
    setLoadingAuth(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setLoadingAuth(false);
      localStorage.removeItem("academia-v2-auth-token");
      localStorage.removeItem("auth");
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, userData, loading: loadingAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

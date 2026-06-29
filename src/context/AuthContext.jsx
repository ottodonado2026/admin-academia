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
      // 1. Buscar en tabla usuarios (Admins / Coordinadores / etc)
      const resUsuarios = accessToken 
        ? await fetch(`${supabaseUrl}/rest/v1/usuarios?select=*&auth_uid=eq.${userId}`, {
            headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${accessToken}` }
          }).then(r => r.json()).catch(() => [])
        : await supabase.from("usuarios").select("*").eq("auth_uid", userId).maybeSingle().then(r => r.data ? [r.data] : []);
      
      const adminData = Array.isArray(resUsuarios) ? resUsuarios[0] : resUsuarios;
      
      if (adminData) {
        setRole(adminData.role?.toLowerCase() || "admin");
        setUserData(adminData);
        return;
      }

      // 2. Buscar en tabla profesores
      const { data: profData } = await supabase
        .from("profesores")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      
      if (profData) {
        setRole("profesor");
        setUserData(profData);
        return;
      }

      // 3. Buscar en tabla asesores
      const { data: asesorData } = await supabase
        .from("asesores")
        .select("*")
        .eq("auth_uid", userId)
        .maybeSingle();
      
      if (asesorData) {
        setRole("asesor");
        setUserData(asesorData);
        return;
      }

      // Si no se encuentra en ninguna
      setRole(null);
      setUserData(null);
    } catch (error) {
      console.error("Error fetching user identity:", error);
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
          await fetchUserRole(session.user.id, session.access_token);
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
      // Limpieza profunda (Seguridad)
      localStorage.removeItem("academia-v2-auth-token");
      localStorage.removeItem("auth");
      localStorage.removeItem("user");
      localStorage.removeItem("asesorAuth");
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, userData, loading: loadingAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};


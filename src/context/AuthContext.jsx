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
  const [loading, setLoading] = useState(true);
  const isFetching = useRef(false);

  const fetchUserRole = async (userId, accessToken = null) => {
    try {
      let data, error;

      if (accessToken) {
        // Fallback: Si estamos en modo rescate por congelamiento, usamos fetch directo para no tocar los Web Locks
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

  console.log("AuthProvider montado");


  useEffect(() => {
    let isMounted = true;
    let initialLoadDone = false;

    // 1. Declarar loadSessionAndRole PRIMERO para que pueda ser usada por los demás
    const loadSessionAndRole = async (session, manualToken = null) => {
      if (!isMounted) return;

      // Evitar peticiones concurrentes, pero sin bloquear la UI eternamente
      if (isFetching.current) {
        console.log("Carga en progreso, ignorando duplicado");
        return;
      }

      isFetching.current = true;

      try {
        if (session?.user) {
          setUser(session.user);
          // Micro-pausa para permitir que Supabase suelte los Web Locks de inicio de sesión
          await new Promise(resolve => setTimeout(resolve, 50));
          await fetchUserRole(session.user.id, manualToken);
        } else {
          setUser(null);
          setRole(null);
          setUserData(null);
        }
      } catch (err) {
        console.error("Error cargando sesión y rol:", err);
      } finally {
        isFetching.current = false;
        if (isMounted) {
          setLoading(false);
          initialLoadDone = true;
          clearTimeout(rescueTimeout);
        }
      }
    };

    // 2. Definir el timeout de rescate
    const rescueTimeout = setTimeout(() => {
      if (isMounted && !initialLoadDone) {
        console.warn("Rescue timeout triggered: Supabase está congelado. Forzando lectura manual de sesión.");
        try {
          let manualSession = null;
          const sessionString = localStorage.getItem("academia-v2-auth-token");
          if (sessionString) {
            manualSession = JSON.parse(sessionString);
          }
          if (manualSession && manualSession.user) {
            console.log("Sesión rescatada manualmente.");
            isFetching.current = false; // Forzar semáforo a verde
            loadSessionAndRole({ user: manualSession.user }, manualSession.access_token);
          } else {
            console.log("No se encontró sesión rescatable.");
            isFetching.current = false; // Forzar semáforo a verde
            loadSessionAndRole(null);
          }
        } catch (e) {
          console.error("Error en rescate manual:", e);
          isFetching.current = false; // Forzar semáforo a verde
          loadSessionAndRole(null);
        }
      }
    }, 3000);

    // 3. Ejecutar getSession inicialmente como salvavidas, pero sin chocar
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session && !initialLoadDone) {
          await loadSessionAndRole(data.session);
        }
      } catch (e) {
        console.error("Error obteniendo sesión inicial", e);
        if (!initialLoadDone) {
           loadSessionAndRole(null);
        }
      }
    })();

    // 4. Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("======== AUTH EVENT ========");
      console.log("Evento:", event);
      console.log("Session:", session);
      console.log("===========================");

      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setRole(null);
        setUserData(null);
        setLoading(false);
        clearTimeout(rescueTimeout);
      } else if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "INITIAL_SESSION"
      ) {
        // Solo recargar si no lo hizo ya getSession (evita doble carga)
        if (event === "INITIAL_SESSION" && initialLoadDone) return;
        await loadSessionAndRole(session);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(rescueTimeout);
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { error };
      }
      // El onAuthStateChange SIGNED_IN actualizará el estado automáticamente
      return { user: data.user };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } finally {
      // El onAuthStateChange SIGNED_OUT limpiará el estado
      setLoading(false);
      localStorage.removeItem("auth");
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, userData, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

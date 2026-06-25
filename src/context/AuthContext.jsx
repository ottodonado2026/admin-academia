import { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "../services/supabaseClient";

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

  const fetchUserRole = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("role, nombre")
        .eq("auth_uid", userId)
        .maybeSingle();

      if (error) throw error;

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
    let initialLoadDone = false;

    // Timeout de rescate: Si Supabase se queda congelado por un bug de Web Locks, lo saltamos a los 3 segundos.
    const rescueTimeout = setTimeout(() => {
      if (isMounted && !initialLoadDone) {
        console.warn("Rescue timeout triggered: Supabase está congelado. Forzando lectura manual de sesión.");
        try {
          let manualSession = null;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.endsWith("-auth-token")) {
              manualSession = JSON.parse(localStorage.getItem(key));
              break;
            }
          }
          if (manualSession && manualSession.user) {
            console.log("Sesión rescatada manualmente.");
            // Usar la sesión manual para destrabar
            loadSessionAndRole({ user: manualSession.user });
          } else {
            console.log("No se encontró sesión rescatable.");
            loadSessionAndRole(null);
          }
        } catch (e) {
          console.error("Error en rescate manual:", e);
          loadSessionAndRole(null);
        }
      }
    }, 3000);

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
          setLoading(false);
          initialLoadDone = true;
          clearTimeout(rescueTimeout);
        }
      }
    };

    // 1. Obtener sesión inicial de forma explícita
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error en getSession:", error);
      }
      if (!initialLoadDone) {
        loadSessionAndRole(session);
      }
    }).catch(err => {
      console.error("Excepción crítica en getSession:", err);
      // Si la promesa falla por un bug del caché, destrabamos pasando null
      if (!initialLoadDone) {
        loadSessionAndRole(null);
      }
    });

    // 2. Escuchar cambios de sesión (login, logout, refresh de token, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setRole(null);
        setUserData(null);
        setLoading(false);
        clearTimeout(rescueTimeout);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        // Si es INITIAL_SESSION pero ya cargó por getSession(), lo ignoramos
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

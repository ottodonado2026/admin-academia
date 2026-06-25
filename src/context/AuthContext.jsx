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
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  const isFetching = useRef(false);

  const repairSession = () => {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        // Borrar candados o basura de supabase, pero preservar el token principal de sesión
        if (key && (key.includes("supabase") || key.includes("sb-"))) {
          if (!key.endsWith("-auth-token")) {
            localStorage.removeItem(key);
          }
        }
      }
    } catch (e) {
      console.error("Error limpiando localStorage parcial:", e);
    }
    // Recargar la página actual para reintentar la entrada silenciosamente
    window.location.reload();
  };

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

    // Timeout amigable: Si la inicialización tarda más de 8 segundos, mostramos un botón para reparar la sesión.
    const safetyTimeout = setTimeout(() => {
      if (isMounted && !initialLoadDone) {
        console.warn("Safety timeout triggered: La carga está demorando. Activando opción manual de reparación.");
        setTimeoutWarning(true);
      }
    }, 8000);

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
          clearTimeout(safetyTimeout);
        }
      }
    };

    // 1. Obtener sesión inicial de forma explícita
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!initialLoadDone) {
        loadSessionAndRole(session);
      }
    });

    // 2. Escuchar cambios de sesión (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      // Para INITIAL_SESSION, si ya lo cargamos con getSession, lo ignoramos para evitar doble fetch
      if (event === "INITIAL_SESSION" && initialLoadDone) return;

      if (event === "SIGNED_OUT") {
        setUser(null);
        setRole(null);
        setUserData(null);
        setLoading(false);
        clearTimeout(safetyTimeout);
      } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        await loadSessionAndRole(session);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(safetyTimeout);
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
    <AuthContext.Provider value={{ user, role, userData, loading, timeoutWarning, repairSession, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

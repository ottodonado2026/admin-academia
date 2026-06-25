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
    // Obtener sesión inicial al cargar la app
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchUserRole(session.user.id);
        } else {
          setUser(null);
          setRole(null);
        }
      } catch (error) {
        console.error("Error inicializando auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Escuchar cambios de sesión (login, logout, refresh de token)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Ignorar eventos duplicados mientras ya estamos procesando uno
      if (isFetching.current) return;
      isFetching.current = true;

      try {
        if (event === "SIGNED_OUT") {
          setUser(null);
          setRole(null);
          setUserData(null);
        } else if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          if (session?.user) {
            setUser(session.user);
            await fetchUserRole(session.user.id);
          }
        }
        // Para TOKEN_REFRESHED en background, no mostramos loading
      } finally {
        isFetching.current = false;
      }
    });

    return () => {
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

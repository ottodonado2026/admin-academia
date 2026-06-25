import { createContext, useContext, useEffect, useState } from "react";
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

  useEffect(() => {
    let isMounted = true;

    const getSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (session?.user) {
          if (isMounted) setUser(session.user);
          await fetchUserRole(session.user.id, isMounted);
        } else {
          if (isMounted) {
            setUser(null);
            setRole(null);
          }
        }
      } catch (error) {
        console.error("Error obteniendo la sesión:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        if (isMounted) {
          setUser(session.user);
          setLoading(true);
        }
        await fetchUserRole(session.user.id, isMounted);
        if (isMounted) setLoading(false);
      } else {
        if (isMounted) {
          setUser(null);
          setRole(null);
          setUserData(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId, isMounted) => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("role, nombre")
        .eq("auth_uid", userId)
        .maybeSingle();

      if (error) throw error;
      
      if (isMounted) {
        setRole(data?.role?.toLowerCase() || null);
        setUserData(data || null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      if (isMounted) {
        setRole(null);
        setUserData(null);
      }
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return { error };
    }
    
    // Forzar actualización de estado por si onAuthStateChange no dispara (ej. si ya estaba logueado)
    setUser(data.user);
    await fetchUserRole(data.user.id, true);
    setLoading(false);
    
    return { user: data.user };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("auth"); // Manteniendo compatibilidad si se usaba
  };

  return (
    <AuthContext.Provider value={{ user, role, userData, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

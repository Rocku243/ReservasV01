import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);

      // Asegurar que el perfil exista cuando el usuario tiene sesión activa.
      // Se hace aquí (no en el signup) porque si hay confirmación de email
      // requerida, durante signUp aún no hay sesión y RLS bloquea el insert.
      if (event === "SIGNED_IN" && s?.user) {
        const u = s.user;
        const meta = (u.user_metadata ?? {}) as Record<string, string>;
        if (meta.nombre || meta.celular || meta.placa || meta.tipo_cargador) {
          // Defer para no bloquear el callback de auth
          setTimeout(async () => {
            const { data: existing } = await supabase
              .from("perfiles")
              .select("id")
              .eq("id", u.id)
              .maybeSingle();
            if (!existing) {
              await supabase.from("perfiles").upsert({
                id: u.id,
                nombre: meta.nombre ?? "",
                celular: meta.celular ?? "",
                placa: (meta.placa ?? "").toUpperCase(),
                tipo_cargador: meta.tipo_cargador ?? "Tipo 2",
              });
            }
          }, 0);
        }
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

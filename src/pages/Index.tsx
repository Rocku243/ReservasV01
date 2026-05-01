import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase, Conector } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, MapPin, Plug, Clock } from "lucide-react";
import { getSemanaReservable, formatFecha, ventanaAbierta } from "@/lib/reservas";

const TOTAL_TURNOS = 14; // 7 días × 2 bloques

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [conectores, setConectores] = useState<Conector[]>([]);
  const [ocupadosPorConector, setOcupadosPorConector] = useState<Record<number, number>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dias = useMemo(() => getSemanaReservable(), []);
  const ventana = ventanaAbierta();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    const fetchConectores = async () => {
      setCargando(true);
      setError(null);
      const { data, error: dbError } = await supabase
        .from("conectores")
        .select("*")
        .order("numero", { ascending: true });
      if (dbError) {
        console.error("Error cargando conectores:", dbError);
        setError(dbError.message);
      } else if (data) {
        setConectores(data as Conector[]);
        // Contar reservas activas de la semana por conector
        const inicio = formatFecha(dias[0]);
        const fin = formatFecha(dias[6]);
        const { data: reservas } = await supabase
          .from("reservas")
          .select("conector_id")
          .eq("estado", "activa")
          .gte("fecha", inicio)
          .lte("fecha", fin);
        const counts: Record<number, number> = {};
        (reservas || []).forEach((r: { conector_id: number }) => {
          counts[r.conector_id] = (counts[r.conector_id] || 0) + 1;
        });
        setOcupadosPorConector(counts);
      }
      setCargando(false);
    };
    if (user) fetchConectores();
  }, [user, dias]);

  if (loading || !user) return null;

  return (
    <Layout>
      <div className="space-y-8">
        <section className="bg-gradient-primary rounded-2xl p-8 text-primary-foreground shadow-elegant">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            Hola, {user.user_metadata?.nombre || user.email?.split("@")[0]} 👋
          </h1>
          <p className="opacity-90 max-w-xl">
            Reserva uno de los 8 cargadores disponibles en el Edificio Inteligente EPM.
            Las reservas abren cada viernes a las 2:00 p.m. para la semana siguiente.
          </p>
        </section>

        {!ventana && (
          <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-accent p-4">
            <Clock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">
              Las reservas para la próxima semana abren este viernes a las 2:00 p.m.
            </p>
          </div>
        )}

        <section>
          <h2 className="text-2xl font-bold mb-4">Cargadores disponibles</h2>
          {cargando ? (
            <p className="text-muted-foreground">Cargando...</p>
          ) : error ? (
            <Card className="p-6 border-destructive/50 bg-destructive/5">
              <p className="font-semibold text-destructive mb-2">No se pudieron cargar los cargadores</p>
              <p className="text-sm text-muted-foreground mb-2">{error}</p>
              <p className="text-sm">
                Ejecuta en el SQL Editor de Supabase: <code className="bg-muted px-1 rounded">GRANT SELECT ON public.conectores TO authenticated;</code> y crea una política RLS de SELECT para el rol <code>authenticated</code>.
              </p>
            </Card>
          ) : conectores.length === 0 ? (
            <p className="text-muted-foreground">No hay cargadores registrados.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {conectores.map((c) => {
                const activo = (c.estado ?? "activo").toLowerCase() === "activo";
                const ocupados = ocupadosPorConector[c.id] || 0;
                const disponibles = Math.max(0, TOTAL_TURNOS - ocupados);
                const sinCupos = disponibles <= 0;
                return (
                  <Card key={c.id} className="shadow-card hover:shadow-elegant transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="bg-accent p-2.5 rounded-lg">
                          <Zap className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant={activo ? "default" : "secondary"} className={activo ? "bg-primary" : ""}>
                          {activo ? "Activo" : c.estado}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">Cargador #{c.numero}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex items-center gap-1.5">
                          <Plug className="h-3.5 w-3.5" /> {c.tipo_conector ?? "—"}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" /> Edif. Inteligente
                        </div>
                      </div>
                      <p className={`text-sm font-semibold ${sinCupos ? "text-destructive" : "text-primary"}`}>
                        {sinCupos
                          ? "0 de 14 disponibles · Sin cupos"
                          : `${disponibles} de ${TOTAL_TURNOS} disponibles`}
                      </p>
                      <Button asChild className="w-full" disabled={!activo || sinCupos}>
                        <Link to={`/reservar/${c.id}`}>Reservar</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default Index;

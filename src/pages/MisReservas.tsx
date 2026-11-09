import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Moon, Sun, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase, Reserva, Conector } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HORARIO_BLOQUE, bloqueTerminado } from "@/lib/reservas";

type ReservaConConector = Reserva & { conectores?: Conector };

const MisReservas = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [reservas, setReservas] = useState<ReservaConConector[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  const cargar = async () => {
    if (!user?.email) return;
    setCargando(true);
    const { data, error } = await supabase
      .from("reservas")
      .select("*, conectores(*)")
      .eq("usuario_email", user.email)
      .order("fecha", { ascending: false })
      .limit(60);
    if (error) toast.error(error.message);
    else setReservas((data ?? []) as ReservaConConector[]);
    setCargando(false);
  };

  useEffect(() => {
    if (user) cargar();
  }, [user]);

  const cancelar = async (id: number) => {
    const { error } = await supabase.from("reservas").update({ estado: "cancelada" }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Reserva cancelada");
      cargar();
    }
  };

  if (loading || !user) return null;

  const pendientes = reservas
    .filter((r) => r.estado === "activa" && !bloqueTerminado(r.fecha, r.bloque))
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.bloque === "mañana" ? -1 : 1));
  const historial = reservas.filter((r) => !pendientes.includes(r));

  const fechaLarga = (f: string) => format(new Date(f + "T00:00"), "EEEE d 'de' MMMM yyyy", { locale: es });

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mis reservas</h1>
          <p className="text-muted-foreground">Tus reservas pendientes y tu historial reciente</p>
        </div>

        {cargando ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : pendientes.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">No tienes reservas pendientes.</p>
              <Button onClick={() => navigate("/")}>Reservar un cargador</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {pendientes.map((r) => (
              <Card key={r.id} className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="bg-accent p-2 rounded-lg">
                        <Zap className="h-4 w-4 text-primary" />
                      </div>
                      Cargador #{r.conectores?.numero ?? r.conector_id}
                    </CardTitle>
                    <Badge className="bg-primary">Pendiente</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2 first-letter:uppercase">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {fechaLarga(r.fecha)}
                    </div>
                    <div className="flex items-center gap-2 capitalize">
                      {r.bloque === "mañana" ? (
                        <Sun className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Moon className="h-4 w-4 text-muted-foreground" />
                      )}
                      {r.bloque} ({HORARIO_BLOQUE[r.bloque]})
                    </div>
                  </div>
                  <Button variant="destructive" size="sm" onClick={() => cancelar(r.id)}>
                    Cancelar reserva
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!cargando && historial.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">Historial</h2>
            <div className="rounded-xl border bg-card divide-y">
              {historial.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <div className="first-letter:uppercase">{fechaLarga(r.fecha)}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      Cargador #{r.conectores?.numero ?? r.conector_id} · {r.bloque}
                    </div>
                  </div>
                  <Badge variant="secondary">{r.estado === "cancelada" ? "Cancelada" : "Finalizada"}</Badge>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
};

export default MisReservas;

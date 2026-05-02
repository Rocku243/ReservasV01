import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase, Reserva, Conector } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Sun, Moon, Zap } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { getSemanaReservable, formatFecha } from "@/lib/reservas";

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
    const dias = getSemanaReservable();
    const inicio = formatFecha(dias[0]);
    const fin = formatFecha(dias[6]);
    const { data } = await supabase
      .from("reservas")
      .select("*, conectores(*)")
      .eq("usuario_email", user.email)
      .eq("estado", "activa")
      .gte("fecha", inicio)
      .lte("fecha", fin)
      .order("fecha", { ascending: true });
    if (data) setReservas(data as ReservaConConector[]);
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

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Mis reservas</h1>
          <p className="text-muted-foreground">Reservas activas en cargadores EPM</p>
        </div>

        {cargando ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : reservas.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-4">Aún no tienes reservas activas.</p>
              <Button onClick={() => navigate("/")}>Reservar un cargador</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reservas.map((r) => (
              <Card key={r.id} className="shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="bg-accent p-2 rounded-lg">
                        <Zap className="h-4 w-4 text-primary" />
                      </div>
                      Cargador #{r.conectores?.numero ?? r.conector_id}
                    </CardTitle>
                    <Badge className="bg-primary capitalize">{r.estado}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {format(new Date(r.fecha + "T00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
                    </div>
                    <div className="flex items-center gap-2 capitalize">
                      {r.bloque === "mañana" ? (
                        <Sun className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Moon className="h-4 w-4 text-muted-foreground" />
                      )}
                      {r.bloque} ({r.bloque === "mañana" ? "6 a.m. — 12 p.m." : "12 p.m. — 6 p.m."})
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
      </div>
    </Layout>
  );
};

export default MisReservas;

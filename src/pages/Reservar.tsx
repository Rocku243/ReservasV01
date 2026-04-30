import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase, Conector, Reserva } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Sun, Moon, Check } from "lucide-react";
import { getSemanaReservable, formatFecha, NOMBRES_DIAS, ventanaAbierta } from "@/lib/reservas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Bloque = "mañana" | "tarde";

const Reservar = () => {
  const { id } = useParams();
  const conectorId = Number(id);
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [conector, setConector] = useState<Conector | null>(null);
  const [reservasExistentes, setReservasExistentes] = useState<Reserva[]>([]);
  const [nombresPorEmail, setNombresPorEmail] = useState<Record<string, string>>({});
  const [reservaUsuarioSemana, setReservaUsuarioSemana] = useState<Reserva | null>(null);
  const [seleccion, setSeleccion] = useState<{ fecha: string; bloque: Bloque } | null>(null);
  const [nombre, setNombre] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dias = useMemo(() => getSemanaReservable(), []);
  const ventana = ventanaAbierta();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user?.user_metadata?.nombre) setNombre(user.user_metadata.nombre);
  }, [user]);

  useEffect(() => {
    const load = async () => {
      const { data: c } = await supabase.from("conectores").select("*").eq("id", conectorId).maybeSingle();
      if (c) setConector(c as Conector);

      const inicio = formatFecha(dias[0]);
      const fin = formatFecha(dias[6]);
      const { data: r } = await supabase
        .from("reservas")
        .select("*")
        .eq("conector_id", conectorId)
        .eq("estado", "activa")
        .gte("fecha", inicio)
        .lte("fecha", fin);
      const reservas = (r as Reserva[]) || [];
      setReservasExistentes(reservas);

      // Buscar nombres en perfiles
      const emails = Array.from(new Set(reservas.map((x) => x.usuario_email)));
      if (emails.length > 0) {
        const { data: perfiles } = await supabase
          .from("perfiles")
          .select("nombre, id");
        // Cruce por email vía auth no es directo; usamos usuario_nombre de la reserva como fallback
        const map: Record<string, string> = {};
        reservas.forEach((x) => {
          map[x.usuario_email] = x.usuario_nombre || x.usuario_email;
        });
        setNombresPorEmail(map);
      }

      // Verificar si el usuario ya tiene una reserva activa esta semana (en cualquier conector)
      if (user?.email) {
        const { data: misReservas } = await supabase
          .from("reservas")
          .select("*")
          .eq("usuario_email", user.email)
          .eq("estado", "activa")
          .gte("fecha", inicio)
          .lte("fecha", fin);
        const lista = (misReservas as Reserva[]) || [];
        setReservaUsuarioSemana(lista[0] || null);
      }
    };
    if (user && conectorId) load();
  }, [user, conectorId, dias]);

  const estaReservado = (fecha: string, bloque: Bloque) =>
    reservasExistentes.find((r) => r.fecha === fecha && r.bloque === bloque);

  const confirmar = async () => {
    if (!seleccion || !user) return;
    if (!nombre.trim()) {
      toast.error("Por favor ingresa tu nombre");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("reservas").insert({
      conector_id: conectorId,
      usuario_email: user.email,
      usuario_nombre: nombre.trim(),
      fecha: seleccion.fecha,
      bloque: seleccion.bloque,
      estado: "activa",
    });
    setSubmitting(false);
    if (error) {
      toast.error("No se pudo crear la reserva: " + error.message);
    } else {
      toast.success("¡Reserva confirmada!");
      navigate("/mis-reservas");
    }
  };

  if (loading || !user) return null;

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Button>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-2xl">
              Reservar Cargador #{conector?.numero ?? "..."}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {conector?.tipo || "Tipo 2"} · Edificio Inteligente EPM
            </p>
          </CardHeader>
          <CardContent>
            {!ventana && (
              <div className="bg-accent text-accent-foreground rounded-lg p-3 mb-4 text-sm">
                ⏰ La ventana para la próxima semana abre el viernes a las 2:00 p.m.
                Por ahora puedes ver la semana en curso.
              </div>
            )}
            <p className="text-sm font-medium mb-3">
              Semana: {format(dias[0], "d MMM", { locale: es })} — {format(dias[6], "d MMM yyyy", { locale: es })}
            </p>

            <div className="space-y-3">
              {dias.map((d) => {
                const fechaStr = formatFecha(d);
                const dn = NOMBRES_DIAS[d.getDay()];
                return (
                  <div key={fechaStr} className="border rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="font-semibold">{dn}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(d, "d 'de' MMMM", { locale: es })}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {(["mañana", "tarde"] as Bloque[]).map((b) => {
                        const ocupado = estaReservado(fechaStr, b);
                        const seleccionado =
                          seleccion?.fecha === fechaStr && seleccion?.bloque === b;
                        return (
                          <button
                            key={b}
                            disabled={ocupado}
                            onClick={() => setSeleccion({ fecha: fechaStr, bloque: b })}
                            className={`relative rounded-lg border-2 p-3 text-left transition-all ${
                              ocupado
                                ? "bg-muted border-border opacity-60 cursor-not-allowed"
                                : seleccionado
                                ? "border-primary bg-accent shadow-card"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {b === "mañana" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                              <span className="font-medium capitalize">{b}</span>
                              {seleccionado && <Check className="h-4 w-4 text-primary ml-auto" />}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {b === "mañana" ? "6:00 a.m. — 12:00 p.m." : "12:00 p.m. — 6:00 p.m."}
                            </div>
                            {ocupado && (
                              <Badge variant="secondary" className="mt-2 text-xs">No disponible</Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {seleccion && (
          <Card className="shadow-elegant border-primary">
            <CardHeader>
              <CardTitle>Confirmar reserva</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <p>
                  <strong>Cargador:</strong> #{conector?.numero}
                </p>
                <p>
                  <strong>Fecha:</strong>{" "}
                  {format(new Date(seleccion.fecha + "T00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
                </p>
                <p>
                  <strong>Bloque:</strong> <span className="capitalize">{seleccion.bloque}</span>
                </p>
              </div>
              <div>
                <Label htmlFor="nombre">Tu nombre</Label>
                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
              </div>
              <Button onClick={confirmar} disabled={submitting} className="w-full">
                {submitting ? "Confirmando..." : "Confirmar reserva"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default Reservar;

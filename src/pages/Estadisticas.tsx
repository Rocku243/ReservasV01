import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { ahoraColombia } from "@/lib/reservas";
import { useAuth } from "@/context/AuthContext";

type Estadisticas = {
  conectores: number;
  cupos: number;
  activas: number;
  canceladas: number;
  canceladas_con_fecha: number;
  usuarios_distintos: number;
  por_dia_semana: { dow: number; total: number }[];
  por_bloque: { bloque: string; total: number }[];
  por_cargador: { numero: string; total: number }[];
  por_semana: { semana: string; activas: number; canceladas: number }[];
};

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const RANGOS = [
  { id: "4s", label: "Últimas 4 semanas", dias: 28 },
  { id: "12s", label: "Últimas 12 semanas", dias: 84 },
  { id: "todo", label: "Todo el histórico", dias: 400 },
] as const;

const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)} %` : "—");

export default function EstadisticasPage() {
  const { user, loading: authLoading } = useAuth();
  const [esAdmin, setEsAdmin] = useState<boolean | null>(null);
  const [rango, setRango] = useState<(typeof RANGOS)[number]["id"]>("12s");
  const [datos, setDatos] = useState<Estadisticas | null>(null);
  const [error, setError] = useState<string | null>(null);
  const email = user?.email;

  useEffect(() => {
    if (!email) return;
    supabase.rpc("es_admin").then(({ data }) => setEsAdmin(data === true));
  }, [email]);

  useEffect(() => {
    if (!esAdmin) return;
    const hoy = ahoraColombia();
    const dias = RANGOS.find((r) => r.id === rango)!.dias;
    const hasta = format(hoy, "yyyy-MM-dd");
    const desde = format(addDays(hoy, -(dias - 1)), "yyyy-MM-dd");
    setError(null);
    supabase.rpc("estadisticas", { p_desde: desde, p_hasta: hasta }).then(({ data, error: err }) => {
      if (err) setError(err.message);
      else setDatos(data as Estadisticas);
    });
  }, [esAdmin, rango]);

  if (!authLoading && !user) return <Navigate to="/auth" replace />;
  if (esAdmin === false) return <Navigate to="/" replace />;
  if (!datos && !error) return <Layout><p className="text-muted-foreground">Cargando estadísticas…</p></Layout>;

  const dias = DIAS.map((d, i) => ({ dia: d, reservas: datos?.por_dia_semana.find((x) => x.dow === i)?.total ?? 0 }));
  const semanas = (datos?.por_semana ?? []).map((s) => ({
    semana: format(new Date(s.semana + "T00:00"), "d MMM", { locale: es }),
    Reservas: s.activas,
    Canceladas: s.canceladas,
  }));
  const bloques = ["mañana", "tarde"].map((b) => ({
    bloque: b === "mañana" ? "Mañana" : "Tarde",
    reservas: datos?.por_bloque.find((x) => x.bloque === b)?.total ?? 0,
  }));
  const cargadores = (datos?.por_cargador ?? []).map((c) => ({ cargador: `#${c.numero}`, reservas: c.total }));

  const kpi = (titulo: string, valor: string | number, nota?: string) => (
    <Card>
      <CardHeader className="pb-1">
        <CardDescription>{titulo}</CardDescription>
        <CardTitle className="text-3xl">{valor}</CardTitle>
      </CardHeader>
      {nota && <CardContent className="text-xs text-muted-foreground">{nota}</CardContent>}
    </Card>
  );

  const grafico = (titulo: string, children: React.ReactElement, nota?: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{titulo}</CardTitle>
        {nota && <CardDescription>{nota}</CardDescription>}
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </CardContent>
    </Card>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Estadísticas de uso</h1>
          <p className="text-sm text-muted-foreground">Solo visible para administradores. Datos agregados, sin información personal.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {RANGOS.map((r) => (
            <Button key={r.id} size="sm" variant={rango === r.id ? "default" : "outline"} onClick={() => setRango(r.id)}>
              {r.label}
            </Button>
          ))}
        </div>
        {error && <p className="text-destructive">{error}</p>}
        {datos && (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpi("Reservas realizadas", datos.activas)}
              {kpi("Ocupación", pct(datos.activas, datos.cupos), `${datos.activas} de ${datos.cupos} cupos posibles`)}
              {kpi("Usuarios distintos", datos.usuarios_distintos)}
              {kpi(
                "Canceladas",
                datos.canceladas,
                `${pct(datos.canceladas, datos.activas + datos.canceladas)} del total. Solo ${datos.canceladas_con_fecha} tienen fecha de cancelación registrada.`,
              )}
            </div>
            {grafico(
              "Reservas por semana",
              <BarChart data={semanas}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semana" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Reservas" fill="hsl(var(--primary))" />
                <Bar dataKey="Canceladas" fill="hsl(var(--destructive))" />
              </BarChart>,
              "Semana que inicia el sábado indicado.",
            )}
            <div className="grid gap-4 md:grid-cols-2">
              {grafico(
                "Por día de la semana",
                <BarChart data={dias}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dia" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="reservas" name="Reservas" fill="hsl(var(--primary))" />
                </BarChart>,
              )}
              {grafico(
                "Mañana vs tarde",
                <BarChart data={bloques}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bloque" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="reservas" name="Reservas" fill="hsl(var(--primary))" />
                </BarChart>,
              )}
            </div>
            {grafico(
              "Uso por cargador",
              <BarChart data={cargadores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cargador" fontSize={12} />
                <YAxis allowDecimals={false} fontSize={12} />
                <Tooltip />
                <Bar dataKey="reservas" name="Reservas" fill="hsl(var(--primary))" />
              </BarChart>,
            )}
            <p className="text-xs text-muted-foreground">
              Las cancelaciones anteriores al 9 de noviembre de 2026 incluyen cambios de reserva hechos con la regla anterior, así que no equivalen a cupos que quedaron sin usar.
            </p>
          </>
        )}
      </div>
    </Layout>
  );
}

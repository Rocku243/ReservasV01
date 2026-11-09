import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Check, Lock, Moon, Plus, Sun } from "lucide-react";
import { toast } from "sonner";
import { supabase, Conector, ReservaSemana } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BLOQUES,
  Bloque,
  DIAS_CORTOS,
  HORARIO_BLOQUE,
  ahoraColombia,
  bloqueTerminado,
  formatFecha,
  proximaSemanaAbierta,
  semanaActual,
  semanaSiguiente,
} from "@/lib/reservas";

type Semana = "actual" | "proxima";
type Seleccion = { conector: Conector; fecha: string; bloque: Bloque };
type EstadoCelda =
  | { tipo: "libre" }
  | { tipo: "ocupado"; nombre: string; placa: string | null }
  | { tipo: "mia" }
  | { tipo: "terminado"; nombre: string | null; placa: string | null; mia: boolean };

const REFRESCO_MS = 60_000;

const fueraDeServicio = (c: Conector) => /mantenimiento|inactivo|fuera|no disponible/i.test(c.estado ?? "");

const mesCorto = (d: Date) => format(d, "MMM", { locale: es });
const rango = (d: Date[]) =>
  d[0].getMonth() === d[6].getMonth()
    ? `${d[0].getDate()}–${d[6].getDate()} ${mesCorto(d[6])}`
    : `${d[0].getDate()} ${mesCorto(d[0])} – ${d[6].getDate()} ${mesCorto(d[6])}`;

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [ahora, setAhora] = useState(() => new Date());
  const [semana, setSemana] = useState<Semana>("actual");
  const [conectores, setConectores] = useState<Conector[]>([]);
  const [reservas, setReservas] = useState<ReservaSemana[]>([]);
  const [diaSel, setDiaSel] = useState("");
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [nombre, setNombre] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const confirmarRef = useRef<HTMLDivElement>(null);

  const email = user?.email;
  const nombreUsuario = user?.user_metadata?.nombre as string | undefined;
  const proximaAbierta = proximaSemanaAbierta(ahora);
  const dias = useMemo(
    () => (semana === "actual" ? semanaActual(ahora) : semanaSiguiente(ahora)),
    [semana, ahora],
  );
  const desde = formatFecha(dias[0]);
  const hasta = formatFecha(dias[6]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    const t = window.setInterval(() => setAhora(new Date()), REFRESCO_MS);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (semana === "proxima" && !proximaAbierta) setSemana("actual");
  }, [semana, proximaAbierta]);

  useEffect(() => {
    if (nombreUsuario) setNombre(nombreUsuario);
  }, [nombreUsuario]);

  useEffect(() => {
    if (!email) return;
    (async () => {
      const { data, error: dbError } = await supabase
        .from("conectores")
        .select("*")
        .order("numero", { ascending: true });
      if (dbError) setError(dbError.message);
      else setConectores((data ?? []) as Conector[]);
    })();
  }, [email]);

  const cargarReservas = useCallback(async () => {
    const { data, error: rpcError } = await supabase.rpc("reservas_semana", {
      p_desde: desde,
      p_hasta: hasta,
    });
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setError(null);
    setReservas((data ?? []) as ReservaSemana[]);
  }, [desde, hasta]);

  useEffect(() => {
    if (!email) return;
    setCargando(true);
    cargarReservas().finally(() => setCargando(false));
    const t = window.setInterval(cargarReservas, REFRESCO_MS);
    return () => window.clearInterval(t);
  }, [email, cargarReservas]);

  useEffect(() => {
    const fechas = dias.map(formatFecha);
    if (fechas.includes(diaSel)) return;
    const hoy = formatFecha(ahoraColombia(ahora));
    setDiaSel(fechas.includes(hoy) ? hoy : fechas[0]);
    setSeleccion(null);
  }, [dias, diaSel, ahora]);

  useEffect(() => {
    if (seleccion) confirmarRef.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
  }, [seleccion]);

  const mapa = useMemo(() => {
    const m = new Map<string, ReservaSemana>();
    reservas.forEach((r) => m.set(`${r.conector_id}|${r.fecha}|${r.bloque}`, r));
    return m;
  }, [reservas]);

  const miPendiente = useMemo(
    () => reservas.find((r) => r.es_mia && !bloqueTerminado(r.fecha, r.bloque, ahora)) ?? null,
    [reservas, ahora],
  );

  const puedeReservar = !miPendiente && (semana === "actual" || proximaAbierta);

  const estadoCelda = (c: Conector, fecha: string, b: Bloque): EstadoCelda => {
    const r = mapa.get(`${c.id}|${fecha}|${b}`);
    if (bloqueTerminado(fecha, b, ahora)) {
      return { tipo: "terminado", nombre: r ? r.usuario_nombre : null, placa: r?.placa ?? null, mia: !!r?.es_mia };
    }
    if (r?.es_mia) return { tipo: "mia" };
    if (r) return { tipo: "ocupado", nombre: r.usuario_nombre, placa: r.placa };
    return { tipo: "libre" };
  };

  const libresDelDia = (fecha: string): number | null => {
    if (BLOQUES.every((b) => bloqueTerminado(fecha, b, ahora))) return null;
    let n = 0;
    conectores
      .filter((c) => !fueraDeServicio(c))
      .forEach((c) =>
        BLOQUES.forEach((b) => {
          if (estadoCelda(c, fecha, b).tipo === "libre") n++;
        }),
      );
    return n;
  };

  const cambiarSemana = (s: Semana) => {
    setSemana(s);
    setSeleccion(null);
  };

  const confirmar = async () => {
    if (!seleccion || !user?.email) return;
    setEnviando(true);
    const { error: insError } = await supabase.from("reservas").insert({
      conector_id: seleccion.conector.id,
      usuario_email: user.email,
      usuario_nombre: nombre.trim() || user.email, // el servidor lo reemplaza por el nombre del perfil
      fecha: seleccion.fecha,
      bloque: seleccion.bloque,
      estado: "activa",
    });
    setEnviando(false);
    if (insError) {
      toast.error(
        insError.code === "23505" ? "Alguien acaba de reservar ese cupo. Elige otro." : insError.message,
      );
      setSeleccion(null);
      await cargarReservas();
      return;
    }
    toast.success("¡Reserva confirmada!");
    setSeleccion(null);
    await cargarReservas();
  };

  const cancelarMiReserva = async () => {
    if (!miPendiente) return;
    const { error: updError } = await supabase
      .from("reservas")
      .update({ estado: "cancelada" })
      .eq("id", miPendiente.id);
    if (updError) {
      toast.error(updError.message);
      return;
    }
    toast.success("Reserva cancelada");
    setSeleccion(null);
    await cargarReservas();
  };

  const celda = (c: Conector, b: Bloque) => {
    const base =
      "min-h-[44px] rounded-lg border px-2.5 py-2 text-sm flex items-center justify-between gap-2 text-left";
    if (fueraDeServicio(c)) {
      return <div className={`${base} bg-muted text-muted-foreground`}>Fuera de servicio</div>;
    }
    const e = estadoCelda(c, diaSel, b);
    const elegida =
      seleccion?.conector.id === c.id && seleccion.fecha === diaSel && seleccion.bloque === b;
    switch (e.tipo) {
      case "libre":
        return (
          <button
            type="button"
            disabled={!puedeReservar}
            aria-label={`Reservar cargador ${c.numero}, ${b}`}
            onClick={() => setSeleccion({ conector: c, fecha: diaSel, bloque: b })}
            className={`${base} border-primary/30 bg-accent text-accent-foreground ${
              elegida ? "ring-2 ring-primary" : ""
            } ${puedeReservar ? "hover:border-primary" : "opacity-50 cursor-not-allowed"}`}
          >
            <span>Libre</span>
            <Plus className="h-4 w-4" aria-hidden="true" />
          </button>
        );
      case "ocupado":
        return (
          <div className={`${base} border-destructive/40 bg-destructive/10 text-destructive`}>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate">{e.nombre}</span>
              {e.placa && <span className="font-mono text-xs font-semibold">{e.placa}</span>}
            </span>
          </div>
        );
      case "mia":
        return (
          <div className={`${base} border-primary bg-primary text-primary-foreground`}>
            <span>Tú</span>
            <Check className="h-4 w-4" aria-hidden="true" />
          </div>
        );
      default:
        return (
          <div className={`${base} bg-muted text-muted-foreground`}>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="truncate">{e.mia ? "Tú" : (e.nombre ?? "Sin uso")}</span>
              {!e.mia && e.placa && <span className="font-mono text-xs">{e.placa}</span>}
            </span>
          </div>
        );
    }
  };

  if (loading || !user) return null;

  const operativos = conectores.filter((c) => !fueraDeServicio(c)).length;
  const filas = "grid grid-cols-[72px_1fr_1fr] sm:grid-cols-[110px_1fr_1fr] gap-2";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Cargadores</h1>
          <p className="text-muted-foreground">
            Edificio Inteligente EPM{operativos ? ` · ${operativos} cargadores` : ""}. La semana siguiente abre
            cada viernes a las 2:00 p. m.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant={semana === "actual" ? "default" : "outline"}
            onClick={() => cambiarSemana("actual")}
          >
            Semana actual · {rango(semanaActual(ahora))}
          </Button>
          <Button
            variant={semana === "proxima" ? "default" : "outline"}
            disabled={!proximaAbierta}
            onClick={() => cambiarSemana("proxima")}
            className="gap-2"
          >
            {!proximaAbierta && <Lock className="h-4 w-4" aria-hidden="true" />}
            Próxima semana · {proximaAbierta ? rango(semanaSiguiente(ahora)) : "abre vie 2:00 p. m."}
          </Button>
        </div>

        {miPendiente && (
          <div className="rounded-xl border border-primary/30 bg-accent p-4 text-sm flex flex-wrap items-center justify-between gap-3">
            <span>
              Ya tienes una reserva esta semana: cargador #
              {conectores.find((c) => c.id === miPendiente.conector_id)?.numero ?? miPendiente.conector_id},{" "}
              {format(new Date(miPendiente.fecha + "T00:00"), "EEEE d 'de' MMMM", { locale: es })},{" "}
              {miPendiente.bloque}. Cancélala si quieres reservar otro cupo.
            </span>
            <Button variant="destructive" size="sm" onClick={cancelarMiReserva}>
              Cancelar mi reserva
            </Button>
          </div>
        )}

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {dias.map((d) => {
            const f = formatFecha(d);
            const libres = libresDelDia(f);
            const activo = f === diaSel;
            return (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setDiaSel(f);
                  setSeleccion(null);
                }}
                className={`rounded-lg border p-2 text-center transition-colors ${
                  activo ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <div className="text-[11px] sm:text-xs text-muted-foreground">{DIAS_CORTOS[d.getDay()]}</div>
                <div className="text-base sm:text-lg font-semibold">{d.getDate()}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground">
                  {libres === null ? "pasado" : `${libres} libres`}
                </div>
              </button>
            );
          })}
        </div>

        {error ? (
          <Card className="p-6 border-destructive/50 bg-destructive/5">
            <p className="font-semibold text-destructive mb-1">No se pudo cargar la disponibilidad</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </Card>
        ) : cargando && conectores.length === 0 ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : (
          <Card className="shadow-card">
            <CardContent className="p-3 sm:p-4 space-y-2">
              <h2 className="font-semibold first-letter:uppercase">
                {diaSel && format(new Date(diaSel + "T00:00"), "EEEE d 'de' MMMM", { locale: es })}
              </h2>
              <div className={`${filas} text-xs text-muted-foreground px-1`}>
                <div>Cargador</div>
                {BLOQUES.map((b) => (
                  <div key={b} className="flex items-center gap-1 capitalize">
                    {b === "mañana" ? (
                      <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {b}
                    <span className="hidden sm:inline normal-case">· {HORARIO_BLOQUE[b]}</span>
                  </div>
                ))}
              </div>
              {conectores.map((c) => (
                <div key={c.id} className={`${filas} items-stretch`}>
                  <div className="self-center">
                    <div className="font-semibold">#{c.numero}</div>
                    <div className="text-xs text-muted-foreground">{c.tipo_conector ?? "—"}</div>
                  </div>
                  {BLOQUES.map((b) => (
                    <div key={b} className="flex flex-col">
                      {celda(c, b)}
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-xs text-muted-foreground">
                <span>Verde claro: libre</span>
                <span>Rojo: reservado</span>
                <span>Verde sólido: tuyo</span>
                <span>Gris: ya terminó</span>
              </div>
            </CardContent>
          </Card>
        )}

        {seleccion && (
          <div ref={confirmarRef}>
            <Card className="shadow-elegant border-primary">
              <CardHeader>
                <CardTitle>Confirmar reserva</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Cargador:</strong> #{seleccion.conector.numero}
                  </p>
                  <p>
                    <strong>Fecha:</strong>{" "}
                    {format(new Date(seleccion.fecha + "T00:00"), "EEEE d 'de' MMMM yyyy", { locale: es })}
                  </p>
                  <p>
                    <strong>Bloque:</strong> <span className="capitalize">{seleccion.bloque}</span> (
                    {HORARIO_BLOQUE[seleccion.bloque]})
                  </p>
                </div>
                <div>
                  <Label htmlFor="nombre">Tu nombre</Label>
                  <Input id="nombre" value={nombre} readOnly disabled />
                </div>
                <div className="flex gap-2">
                  <Button onClick={confirmar} disabled={enviando} className="flex-1">
                    {enviando ? "Confirmando..." : "Confirmar reserva"}
                  </Button>
                  <Button variant="outline" onClick={() => setSeleccion(null)}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Index;

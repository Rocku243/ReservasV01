import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const conectores = [
  { id: 1, numero: "310", tipo_conector: "Tipo 1", estado: "disponible" },
  { id: 2, numero: "312", tipo_conector: "Tipo 2", estado: "disponible" },
  { id: 3, numero: "314", tipo_conector: "Tipo 2", estado: "disponible" },
];

let reservasSemana: unknown[] = [];
let resultadoPlaca: unknown[] = [];
const rpc = vi.fn(async (nombre: string, _args?: unknown) => ({
  data: nombre === "reservas_semana" ? reservasSemana : resultadoPlaca,
  error: null,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ order: async () => ({ data: conectores, error: null }) }),
    }),
    rpc: (...args: [string, unknown]) => rpc(...args),
  },
}));

vi.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "yo@epm.com.co", user_metadata: { nombre: "Jeffer" } },
    session: null,
    loading: false,
    signOut: async () => {},
  }),
}));

import Index from "@/pages/Index";
import BuscarPlaca from "@/pages/Usuarios";

const ui = (el: React.ReactElement) => render(<MemoryRouter>{el}</MemoryRouter>);

describe("pantalla de disponibilidad", () => {
  beforeEach(() => {
    // Lunes 9 nov 2026, 8:30 a. m. en Colombia.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T08:30:00-05:00"));
    reservasSemana = [];
    rpc.mockClear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("muestra los cargadores, los 7 días y deja reservar un cupo libre", async () => {
    ui(<Index />);
    await screen.findByText("#310");
    expect(screen.getByText("#314")).toBeTruthy();
    expect(screen.getByText(/Semana actual · 7–13 nov/)).toBeTruthy();
    expect(screen.getByText(/abre vie 2:00 p\. m\./)).toBeTruthy();
    expect(rpc).toHaveBeenCalledWith("reservas_semana", { p_desde: "2026-11-07", p_hasta: "2026-11-13" });
    // sábado y domingo ya pasaron; el lunes en adelante muestra cupos libres
    expect(screen.getAllByText("pasado")).toHaveLength(2);
    fireEvent.click(screen.getByLabelText("Reservar cargador 310, mañana"));
    expect(await screen.findByRole("button", { name: "Confirmar reserva" })).toBeTruthy();
    expect(screen.getByText(/Cargador:/).parentElement?.textContent).toContain("#310");
  });

  it("muestra quién reservó y el bloque en curso sigue libre si nadie lo tomó", async () => {
    reservasSemana = [
      { id: 10, conector_id: 1, fecha: "2026-11-09", bloque: "tarde", usuario_nombre: "Ana M.", es_mia: false },
    ];
    ui(<Index />);
    await screen.findByText("Ana M.");
    expect(screen.getByLabelText("Reservar cargador 310, mañana")).toBeTruthy();
    expect(screen.queryByLabelText("Reservar cargador 310, tarde")).toBeNull();
  });

  it("si ya tengo una reserva pendiente avisa y no deja elegir otra", async () => {
    reservasSemana = [
      { id: 11, conector_id: 2, fecha: "2026-11-12", bloque: "tarde", usuario_nombre: "Jeffer", es_mia: true },
    ];
    ui(<Index />);
    await screen.findByText(/Ya tienes una reserva esta semana/);
    const libre = screen.getByLabelText("Reservar cargador 310, mañana") as HTMLButtonElement;
    expect(libre.disabled).toBe(true);
    expect(screen.getByText("Cancelar mi reserva")).toBeTruthy();
  });

  it("una reserva mía que ya terminó NO bloquea una nueva", async () => {
    reservasSemana = [
      { id: 12, conector_id: 2, fecha: "2026-11-08", bloque: "mañana", usuario_nombre: "Jeffer", es_mia: true },
    ];
    ui(<Index />);
    await screen.findByText("#310");
    expect(screen.queryByText(/Ya tienes una reserva esta semana/)).toBeNull();
    const libre = screen.getByLabelText("Reservar cargador 310, mañana") as HTMLButtonElement;
    expect(libre.disabled).toBe(false);
  });

  it("el viernes después de las 2:00 p. m. se habilita la semana siguiente", async () => {
    vi.setSystemTime(new Date("2026-11-13T14:05:00-05:00"));
    ui(<Index />);
    await screen.findByText("#310");
    const proxima = screen.getByText(/Próxima semana · 14–20 nov/).closest("button") as HTMLButtonElement;
    expect(proxima.disabled).toBe(false);
    fireEvent.click(proxima);
    await waitFor(() =>
      expect(rpc).toHaveBeenCalledWith("reservas_semana", { p_desde: "2026-11-14", p_hasta: "2026-11-20" }),
    );
  });
});

describe("buscador de placa", () => {
  afterEach(cleanup);

  const buscar = (valor: string) => {
    ui(<BuscarPlaca />);
    fireEvent.change(screen.getByLabelText("Placa"), { target: { value: valor } });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
  };

  it("pide la placa completa antes de consultar", async () => {
    rpc.mockClear();
    buscar("AB");
    await screen.findByText(/\(6 caracteres\)/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("avisa cuando la placa no está registrada", async () => {
    resultadoPlaca = [];
    buscar("zzz-999");
    await screen.findByText("La placa ZZZ999 no está registrada.");
    expect(rpc).toHaveBeenCalledWith("buscar_placa", { p_placa: "ZZZ999" });
  });

  it("muestra solo nombre, placa y celular cuando existe", async () => {
    resultadoPlaca = [{ nombre: "Persona de Prueba", placa: "ABC123", celular: "3001234567" }];
    buscar("abc 123");
    await screen.findByText("Persona de Prueba");
    expect(screen.getByText("3001234567")).toBeTruthy();
    expect(screen.getByText("ABC123")).toBeTruthy();
  });
});
